import google.generativeai as genai
from decouple import config
import asyncio
from typing import List, Dict
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        self.api_key = config("GEMINI_API_KEY")
        if not self.api_key or self.api_key == "your_gemini_api_key_here":
            raise ValueError("GEMINI_API_KEY not found or not set properly in environment variables")

        genai.configure(api_key=self.api_key)

        # Configure the model
        self.generation_config = {
            "temperature": 0.7,
            "top_p": 0.8,
            "top_k": 40,
            "max_output_tokens": 2048,
        }

        self.safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]

        # Initialize the model
        self.model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config=self.generation_config,
            safety_settings=self.safety_settings
        )

        logger.info("Gemini AI service initialized successfully")

    async def generate_response(self, message: str, conversation_history: List[Dict[str, str]] = None) -> str:
        """
        Generate AI response using Gemini API with Sakhi's professional women's support system

        Args:
            message (str): User's message
            conversation_history (List[Dict]): Previous conversation context

        Returns:
            str: AI response
        """
        try:
            # Define the Sakhi system prompt for women's professional support
            system_prompt = """You are Sakhi, a professional AI assistant specifically designed to support and empower women. 💗 You are warm, understanding, and knowledgeable about women's unique challenges and experiences.

**Your Core Purpose:**
- Provide professional advice and guidance for women in various aspects of life
- Offer emotional support with empathy and understanding
- Share practical coping strategies and mental health resources
- Support career development, work-life balance, and professional growth
- Address women's health, relationships, and personal development concerns
- Promote self-care, confidence-building, and empowerment

**Your Communication Style:**
- Be compassionate, non-judgmental, and supportive
- Use inclusive, empowering language that validates experiences
- Provide practical, actionable advice alongside emotional support
- Reference credible resources, organizations, and professional services when appropriate
- Respect privacy and encourage seeking professional help for serious issues
- Celebrate women's achievements and encourage self-advocacy

**Key Areas of Focus:**
- Career advancement and workplace navigation
- Mental health and emotional wellbeing
- Relationships and communication skills
- Health and wellness (physical and mental)
- Financial independence and planning
- Personal development and confidence building
- Work-life balance and stress management
- Safety and self-protection strategies

**Important Guidelines:**
- Always encourage professional help for serious mental health, medical, or legal issues
- Provide crisis resources when needed (therapy, hotlines, support groups)
- Respect cultural and individual differences
- Maintain confidentiality and create a safe space for sharing
- Empower women to trust their instincts and make their own decisions

Remember: You are here to support, guide, and empower women to live their best lives. Be the caring, knowledgeable friend and advisor that every woman deserves. ✨"""

            # Build context from conversation history
            context = ""
            if conversation_history:
                for msg in conversation_history[-10:]:  # Last 10 messages for context
                    role = "User" if msg.get("is_user_message") else "Assistant"
                    context += f"{role}: {msg.get('content', '')}\n"

            # Prepare the prompt
            if context:
                full_prompt = f"{system_prompt}\n\nConversation history:\n{context}\nUser: {message}\nAssistant:"
            else:
                full_prompt = f"{system_prompt}\n\nUser: {message}\nAssistant:"

            # Generate response
            response = await asyncio.to_thread(
                self.model.generate_content,
                full_prompt
            )

            if response.text:
                return response.text.strip()
            else:
                logger.warning("Empty response from Gemini API")
                return "I apologize, but I couldn't generate a response at the moment. Please try again."

        except Exception as e:
            logger.error(f"Error generating response with Gemini: {str(e)}")
            return "I'm sorry, but I encountered an error while processing your request. Please try again later."

    async def generate_chat_title(self, first_message: str) -> str:
        """
        Generate a title for the chat based on the first message

        Args:
            first_message (str): The first message in the conversation

        Returns:
            str: Generated title for the chat
        """
        try:
            prompt = f"""Generate a short, descriptive title (3-6 words) for a conversation that starts with this message: "{first_message}"

            The title should capture the main topic or theme. Return only the title, no additional text."""

            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )

            if response.text:
                title = response.text.strip().replace('"', '').replace("'", "")
                return title[:50]  # Limit title length
            else:
                return "New Conversation"

        except Exception as e:
            logger.error(f"Error generating chat title: {str(e)}")
            return "New Conversation"

# Global instance
gemini_service = GeminiService()
