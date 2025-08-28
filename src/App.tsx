import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { AdminProvider } from './contexts/AdminContext';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ReportForm from './components/ReportForm';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import { useAdmin } from './contexts/AdminContext';
import { useViewportHeight } from './hooks/useViewportHeight';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'report' | 'admin'>('chat');
  const { isAdminAuthenticated, loginAdmin } = useAdmin();
  const viewportHeight = useViewportHeight();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleReportClick = () => {
    setCurrentView('report');
    setSidebarOpen(false); // Close sidebar when opening report form
  };

  const handleBackToChat = () => {
    setCurrentView('chat');
  };

  const handleAdminAccess = () => {
    setCurrentView('admin');
    setSidebarOpen(false);
  };

  const handleAdminLogin = (passcode: string) => {
    return loginAdmin(passcode);
  };

  return (
    <div
      className="text-gray-900 dark:text-white overflow-hidden"
      style={{ height: `${viewportHeight}px` }}
    >
      <div className="flex h-full p-2 sm:p-4 gap-2 sm:gap-4">
        {/* Sidebar - only show in chat view */}
        {currentView === 'chat' && (
          <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} onReportClick={handleReportClick} />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 glass-panel">
            {currentView === 'chat' ? (
              <ChatArea onToggleSidebar={toggleSidebar} onAdminAccess={handleAdminAccess} />
            ) : currentView === 'report' ? (
              <ReportForm onBack={handleBackToChat} />
            ) : currentView === 'admin' ? (
              isAdminAuthenticated ? (
                <AdminDashboard onBack={handleBackToChat} />
              ) : (
                <AdminLogin onLogin={handleAdminLogin} onBack={handleBackToChat} />
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminProvider>
          <ChatProvider>
            <AppContent />
          </ChatProvider>
        </AdminProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
