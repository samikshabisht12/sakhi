import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';
import type { ChatContextType, ChatHistory, Message } from '../types';
import type { ChatSession, Message as ApiMessage } from '../services/api';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  // Convert API chat session to local chat history format
  const convertApiChatToLocal = (session: ChatSession, messages: ApiMessage[] = []): ChatHistory => {
    return {
      id: session.id.toString(),
      title: session.title,
      messages: messages.map(msg => ({
        id: msg.id.toString(),
        content: msg.content,
        role: (msg.is_user_message ? 'user' : 'assistant') as 'user' | 'assistant',
        timestamp: new Date(msg.timestamp),
      })),
      createdAt: new Date(session.created_at),
      updatedAt: new Date(session.updated_at),
    };
  };

  // Load chat sessions from API
  const loadChatSessions = useCallback(async () => {
    if (!isAuthenticated) {
      setChatHistories([]);
      setCurrentChat(null);
      return;
    }

    try {
      setIsLoading(true);
      const sessions = await apiService.getChatSessions();
      const histories = sessions.map(session => convertApiChatToLocal(session));
      setChatHistories(histories);

      // Set current chat to the most recent one if exists
      if (histories.length > 0 && !currentChat) {
        const mostRecent = histories[0];
        const messages = await apiService.getChatMessages(parseInt(mostRecent.id));
        const fullChat = convertApiChatToLocal(sessions[0], messages);
        setCurrentChat(fullChat);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentChat]);

  // Load chats when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      loadChatSessions();
    } else {
      // Only clear authenticated chats when user logs out, keep local chats
      setChatHistories(prev => prev.filter(chat => chat.id.startsWith('local-')));
      // Don't clear current chat if it's a local chat
      setCurrentChat(prev => prev && prev.id.startsWith('local-') ? prev : null);
    }
  }, [isAuthenticated, loadChatSessions]);

  const createNewChat = useCallback(async () => {
    if (!isAuthenticated) {
      // Create a local-only chat for non-authenticated users
      const newChat: ChatHistory = {
        id: `local-${Date.now()}`,
        title: 'New Conversation',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setChatHistories(prev => [newChat, ...prev]);
      setCurrentChat(newChat);
      return;
    }

    try {
      const session = await apiService.createChatSession('New Conversation');
      const newChat = convertApiChatToLocal(session);

      setChatHistories(prev => [newChat, ...prev]);
      setCurrentChat(newChat);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  }, [isAuthenticated]);

  const selectChat = useCallback(async (chatId: string) => {
    // Handle local chats (for non-authenticated users)
    if (chatId.startsWith('local-')) {
      const localChat = chatHistories.find(h => h.id === chatId);
      if (localChat) {
        setCurrentChat(localChat);
      }
      return;
    }

    // Handle authenticated user chats
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      const sessionId = parseInt(chatId);
      const messages = await apiService.getChatMessages(sessionId);
      const session = chatHistories.find(h => h.id === chatId);

      if (session) {
        const fullChat = {
          ...session,
          messages: messages.map(msg => ({
            id: msg.id.toString(),
            content: msg.content,
            role: (msg.is_user_message ? 'user' : 'assistant') as 'user' | 'assistant',
            timestamp: new Date(msg.timestamp),
          })),
        };
        setCurrentChat(fullChat);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, chatHistories]);

  const sendMessage = useCallback(async (content: string) => {
    let targetChat = currentChat;

    // If no current chat exists, create a new one
    if (!targetChat) {
      if (isAuthenticated) {
        try {
          const session = await apiService.createChatSession('New Conversation');
          targetChat = convertApiChatToLocal(session);
          setChatHistories(prev => [targetChat!, ...prev]);
          setCurrentChat(targetChat);
        } catch (error) {
          console.error('Error creating new chat for message:', error);
          return;
        }
      } else {
        // Create a local-only chat for non-authenticated users
        targetChat = {
          id: `local-${Date.now()}`,
          title: 'New Conversation',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setChatHistories(prev => [targetChat!, ...prev]);
        setCurrentChat(targetChat);
      }
    }

    const userMessage: Message = {
      id: uuidv4(),
      content,
      role: 'user',
      timestamp: new Date(),
    };

    // Optimistically update UI with user message
    const updatedChat = {
      ...targetChat,
      messages: [...targetChat.messages, userMessage],
      title: targetChat.messages.length === 0 ? content.slice(0, 30) + '...' : targetChat.title,
      updatedAt: new Date(),
    };

    setCurrentChat(updatedChat);
    setChatHistories(prev => prev.map(h => h.id === targetChat!.id ? updatedChat : h));

    try {
      if (isAuthenticated && !targetChat.id.startsWith('local-')) {
        // Send message to API and get AI response
        await apiService.sendMessage(parseInt(targetChat.id), content);

        // Get updated messages from API to ensure consistency
        const updatedMessages = await apiService.getChatMessages(parseInt(targetChat.id));
        const finalChat = {
          ...updatedChat,
          messages: updatedMessages.map(msg => ({
            id: msg.id.toString(),
            content: msg.content,
            role: (msg.is_user_message ? 'user' : 'assistant') as 'user' | 'assistant',
            timestamp: new Date(msg.timestamp),
          })),
          updatedAt: new Date(),
        };

        setCurrentChat(finalChat);
        setChatHistories(prev => prev.map(h => h.id === targetChat!.id ? finalChat : h));

        // Auto-generate title if this is the first message
        if (targetChat.messages.length === 0) {
          try {
            const titleResponse = await apiService.updateSessionTitle(parseInt(targetChat.id));
            const chatWithTitle = {
              ...finalChat,
              title: titleResponse.title,
            };
            setCurrentChat(chatWithTitle);
            setChatHistories(prev => prev.map(h => h.id === targetChat!.id ? chatWithTitle : h));
          } catch (titleError) {
            console.error('Error updating chat title:', titleError);
          }
        }
      } else {
        // For non-authenticated users, use mock AI response
        const mockResponses = [
          `Hello! I'm Sakhi, your AI assistant! 🤖✨

**What I can help you with:**
- Answer questions on various topics 🧠
- Help with coding and programming 💻
- Provide explanations and tutorials 📖
- Assist with creative writing and ideas 💡

To unlock full features and save your conversations, consider signing in! Your chats will be preserved across sessions. 🔐`,
          `Hi there! Welcome to Sakhi! 🌟 I'm here to help you with whatever you need.

**I can assist with:**
- General knowledge questions 📚
- Programming and technical help 🔧
- Creative writing and brainstorming 🎨
- Learning new concepts 🎓

For the best experience, consider creating an account to save your conversation history! ✨`,
          `Hey! Great to meet you! I'm Sakhi, your friendly AI companion. 🤗

**Here's what I can do:**
- Answer complex questions with detailed explanations 🧐
- Help with problem-solving and analysis 🔍
- Provide writing assistance and feedback ✍️
- Code review and programming help 👨‍💻

Create an account to save your chat history and unlock premium features! 🚀`
        ];

        const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];

        // Simulate thinking time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        const aiMessage: Message = {
          id: uuidv4(),
          content: randomResponse,
          role: 'assistant',
          timestamp: new Date(),
        };

        const finalChat = {
          ...updatedChat,
          messages: [...updatedChat.messages, aiMessage],
          updatedAt: new Date(),
        };

        setCurrentChat(finalChat);
        setChatHistories(prev => prev.map(h => h.id === targetChat!.id ? finalChat : h));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Revert optimistic update on error
      setCurrentChat(targetChat);
      setChatHistories(prev => prev.map(h => h.id === targetChat!.id ? targetChat! : h));
    }
  }, [currentChat, isAuthenticated]);

  const deleteChat = useCallback(async (chatId: string) => {
    // Handle local chats (for non-authenticated users)
    if (chatId.startsWith('local-')) {
      const updatedHistories = chatHistories.filter(h => h.id !== chatId);
      setChatHistories(updatedHistories);

      if (currentChat?.id === chatId) {
        setCurrentChat(updatedHistories.length > 0 ? updatedHistories[0] : null);
      }
      return;
    }

    // Handle authenticated user chats
    if (!isAuthenticated) return;

    try {
      await apiService.deleteChatSession(parseInt(chatId));

      const updatedHistories = chatHistories.filter(h => h.id !== chatId);
      setChatHistories(updatedHistories);

      if (currentChat?.id === chatId) {
        setCurrentChat(updatedHistories.length > 0 ? updatedHistories[0] : null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  }, [chatHistories, currentChat, isAuthenticated]);

  return (
    <ChatContext.Provider value={{
      currentChat,
      chatHistories,
      createNewChat,
      selectChat,
      sendMessage,
      deleteChat,
      isLoading,
    }}>
      {children}
    </ChatContext.Provider>
  );
};
