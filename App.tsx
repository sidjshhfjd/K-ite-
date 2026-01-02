import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useChat } from './hooks/useChat';
import { ChatBubble } from './components/ChatBubble';
import { ChatInput } from './components/ChatInput';
import { LoginScreen } from './components/LoginScreen';
import { ChevronDown, Zap, Sparkles, Check, LogOut, MessageSquare, Trash2, X, SquarePen, Search, ArrowLeft, Menu } from 'lucide-react';
import { ModelId } from './types';

const App: React.FC = () => {
  // User State
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('kite_user_email'));
  
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    stopGeneration,
    currentModel, 
    setCurrentModel,
    sessions,
    currentSessionId,
    startNewChat,
    loadSession,
    deleteSession,
    clearAllSessions
  } = useChat(userEmail);

  // UI States
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false); // Track search mode
  
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const historySidebarRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter sessions based on search query
  const filteredSessions = sessions.filter(session => 
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to format date like "Hôm nay" or "31 thg 12, 2025"
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (msgDate.getTime() === today.getTime()) {
        return 'Hôm nay';
    }
    
    // Format: 31 thg 12, 2025
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Scroll to BOTTOM when new messages appear (Standard Chat Behavior)
  useEffect(() => {
    if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ 
            top: mainScrollRef.current.scrollHeight, 
            behavior: 'smooth' 
        });
    }
  }, [messages, isLoading]);

  // Handle click outside to close dropdowns and sidebar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (isHistoryOpen && historySidebarRef.current && !historySidebarRef.current.contains(event.target as Node)) {
        // Only close if click is NOT on the menu toggle button
        const target = event.target as HTMLElement;
        if (!target.closest('#history-toggle-btn')) {
            setIsHistoryOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isHistoryOpen]);

  const handleLogin = (email: string) => {
    localStorage.setItem('kite_user_email', email);
    setUserEmail(email);
  };

  const handleLogout = () => {
    localStorage.removeItem('kite_user_email');
    setUserEmail(null);
    setIsProfileDropdownOpen(false);
  };

  const handleImageClick = (url: string) => {
    // Dismiss keyboard to show full image
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
    setViewingImage(url);
  };

  const exitSearchMode = () => {
      setIsSearching(false);
      setSearchQuery('');
  };

  if (!userEmail) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-900">
      
      {/* Lightbox for Viewing Image (Full Screen) - Moved to Portal */}
      {viewingImage && createPortal(
        <div 
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm"
            onClick={() => setViewingImage(null)}
        >
            <button 
                onClick={() => setViewingImage(null)}
                className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all"
            >
                <X size={24} />
            </button>
            <img 
                src={viewingImage} 
                alt="Full view" 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()} 
            />
        </div>,
        document.body
      )}

      {/* Sidebar Overlay (Mobile/History) */}
      <div 
        ref={historySidebarRef}
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out border-r border-slate-100 ${
          isHistoryOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
            {/* Search Bar Header */}
            <div className="p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div className="relative flex items-center gap-2">
                    {isSearching ? (
                        <button 
                            onClick={exitSearchMode}
                            className="p-1 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    ) : (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-slate-400" />
                        </div>
                    )}
                    
                    <input
                        ref={searchInputRef}
                        type="text"
                        className={`block w-full py-2.5 border-none rounded-xl bg-slate-100 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-0 transition-all outline-none ${isSearching ? 'pl-3' : 'pl-9 pr-3'}`}
                        placeholder="Tìm kiếm cuộc trò chuyện"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearching(true)}
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {/* Regular Mode: Show New Chat Button */}
                {!isSearching && (
                    <button 
                        onClick={() => {
                            startNewChat();
                            setIsHistoryOpen(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 text-slate-700 font-medium transition-colors mb-4 group"
                    >
                        <SquarePen size={18} className="text-slate-500 group-hover:text-slate-800 transition-colors" />
                        Cuộc trò chuyện mới
                    </button>
                )}

                {/* Search Mode: Show Section Header */}
                {isSearching && (
                    <div className="px-2 py-2 text-sm font-semibold text-slate-900 mb-1">
                        {searchQuery ? 'Kết quả' : 'Gần đây'}
                    </div>
                )}

                {sessions.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">
                        Chưa có cuộc trò chuyện nào
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">
                        Không tìm thấy kết quả
                    </div>
                ) : (
                    filteredSessions.map(session => (
                        <div 
                            key={session.id}
                            className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                                currentSessionId === session.id && !isSearching
                                ? 'bg-slate-100 text-slate-900 font-medium' 
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                            onClick={() => {
                                loadSession(session.id);
                                setIsHistoryOpen(false);
                                // Optional: Reset search on selection?
                                // exitSearchMode();
                            }}
                        >
                            <span className="truncate flex-1 text-sm pr-2">{session.title}</span>
                            
                            {/* Date or Delete Button */}
                            {isSearching ? (
                                <span className="text-xs text-slate-500 flex-shrink-0">
                                    {formatDate(session.updatedAt)}
                                </span>
                            ) : (
                                <>
                                    {currentSessionId !== session.id && (
                                        <MessageSquare size={16} className="text-slate-400 opacity-0 group-hover:opacity-0 hidden" />
                                    )}
                                    <button 
                                        onClick={(e) => deleteSession(session.id, e)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all absolute right-2 bg-white/80 backdrop-blur-sm"
                                        title="Xóa"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Footer actions only in Normal Mode */}
            {!isSearching && sessions.length > 0 && (
                <div className="p-4 border-t border-slate-100">
                    <button 
                        onClick={clearAllSessions}
                        className="w-full flex items-center justify-center gap-2 p-2.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 size={14} />
                        Xóa tất cả lịch sử
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full w-full relative">
        
        {/* Header */}
        <header className="flex-none h-16 px-4 md:px-6 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200/50 z-20 sticky top-0">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
                id="history-toggle-btn"
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
                <Menu size={24} />
            </button>
            <span className="font-extrabold text-2xl tracking-tighter text-slate-900">k-ite</span>
          </div>

          <div className="flex items-center gap-3">
             {/* Model Selector */}
            <div className="relative" ref={modelDropdownRef}>
              <button 
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg text-base font-bold transition-colors text-slate-900"
              >
                <span className="hidden md:inline">{currentModel === 'gemini-3-flash-preview' ? 'k-ite 1' : 'k-ite 1.5'}</span>
                <span className="md:hidden">{currentModel === 'gemini-3-flash-preview' ? '1.0' : '1.5'}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isModelDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setCurrentModel('gemini-3-flash-preview');
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                        currentModel === 'gemini-3-flash-preview' ? 'bg-amber-50 text-amber-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${currentModel === 'gemini-3-flash-preview' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Zap size={18} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">k-ite 1</div>
                        <div className="text-xs opacity-70">Nhanh & Hiệu quả</div>
                      </div>
                      {currentModel === 'gemini-3-flash-preview' && <Check size={16} className="ml-auto text-amber-600" />}
                    </button>

                    <button
                      onClick={() => {
                        setCurrentModel('gemini-3-pro-preview');
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                        currentModel === 'gemini-3-pro-preview' ? 'bg-purple-50 text-purple-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                       <div className={`p-2 rounded-lg ${currentModel === 'gemini-3-pro-preview' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">k-ite 1.5</div>
                        <div className="text-xs opacity-70">Thông minh & Sáng tạo</div>
                      </div>
                      {currentModel === 'gemini-3-pro-preview' && <Check size={16} className="ml-auto text-purple-600" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative" ref={profileDropdownRef}>
                <button 
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-medium hover:ring-4 ring-slate-100 transition-all"
                >
                    {userEmail?.charAt(0).toUpperCase()}
                </button>

                {isProfileDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                         <div className="px-3 py-2 border-b border-slate-50 mb-1">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Tài khoản</p>
                            <p className="text-sm font-medium text-slate-900 truncate">{userEmail}</p>
                         </div>
                         <button 
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 p-2.5 rounded-xl text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
                        >
                            <LogOut size={16} />
                            Đăng xuất
                         </button>
                    </div>
                )}
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <main 
            ref={mainScrollRef}
            className="flex-1 overflow-y-auto w-full px-4 md:px-0 pt-4 pb-2 scroll-smooth"
        >
          <div className="max-w-3xl mx-auto w-full">
            {messages.length === 0 ? (
                // Welcome Screen
               <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 animate-in fade-in zoom-in duration-500">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Xin chào, tôi có thể giúp gì?</h2>
                    <p className="text-slate-500 max-w-md">
                        k-ite là trợ lý AI thông minh được thiết kế để hỗ trợ bạn trong công việc, học tập và sáng tạo.
                    </p>
               </div>
            ) : (
                // Messages List
                <div className="flex flex-col gap-2 pb-4">
                     {messages.map((message) => (
                        <ChatBubble 
                            key={message.id} 
                            message={message} 
                            onImageClick={handleImageClick}
                        />
                    ))}
                </div>
            )}
            
          </div>
        </main>

        {/* Input Area - Adjusted for neat bottom placement */}
        <div className="flex-none w-full bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent pt-4 pb-2 z-30">
             <ChatInput onSend={sendMessage} onStop={stopGeneration} isLoading={isLoading} />
        </div>

      </div>
    </div>
  );
};

export default App;