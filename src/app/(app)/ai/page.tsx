"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, Plus, MessageCircle, Bot, User, Menu, X, Image as ImageIcon, MoreHorizontal, Share, Edit2, Pin, Archive, Trash2, ChevronDown, ChevronRight, Ghost, Paperclip, Mic } from "lucide-react";

type Message = {
  id?: string;
  role: "user" | "model";
  content: string;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  is_pinned?: boolean;
  is_archived?: boolean;
};

function AiChatCore() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
  const [isRenamingId, setIsRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [isDictating, setIsDictating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInput(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsDictating(false);
      };

      recognitionRef.current.onend = () => {
        setIsDictating(false);
      };
    }
  }, []);

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isDictating) {
      recognitionRef.current.stop();
      setIsDictating(false);
    } else {
      recognitionRef.current.start();
      setIsDictating(true);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Fetch History on Mount
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/login');
      return;
    }

    fetch(`/api/chat/history?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.chats) {
          setSessions(data.chats);

          const activeSession = data.chats[0];
          if (activeSession) {
            setActiveChatId(activeSession.id);
            setMessages(activeSession.messages || []);
          } else {
            startNewChat();
          }
        }
      })
      .catch(err => console.error("Failed to load history", err));
  }, [router]);

  // Handle URL Query String on completely fresh mounts
  useEffect(() => {
    const query = searchParams.get('q');
    if (query && activeChatId && messages.length === 0 && !isLoading) {
      setInput(query);
      // We use a small timeout to let React set the input state before firing sendMessage automatically
      setTimeout(() => {
        handleSend(query);
        // Remove 'q' parameter from URL to prevent infinite loops
        router.replace('/ai', { scroll: false });
      }, 100);
    }
  }, [searchParams, activeChatId]);


  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const startNewChat = async () => {
    // Prevent creating multiple empty chats if one already exists
    const existingEmptyChat = sessions.find(s => !s.is_archived && (!s.messages || s.messages.length === 0));
    if (existingEmptyChat) {
      switchChat(existingEmptyChat.id);
      return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
      const res = await fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title: 'New Chat' })
      });
      const data = await res.json();

      if (data.chat) {
        setSessions([data.chat, ...sessions]);
        setActiveChatId(data.chat.id);
        setMessages([]);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
      }
    } catch (err) {
      console.error("Failed to create chat");
    }
  };

  const toggleTemporaryChat = () => {
    if (activeChatId === 'temp-chat') {
      const topChat = sessions.find(s => !s.is_archived);
      if (topChat) {
        switchChat(topChat.id);
      } else {
        startNewChat();
      }
    } else {
      setActiveChatId('temp-chat');
      setMessages([]);
    }
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const switchChat = (chatId: string) => {
    setActiveChatId(chatId);
    const session = sessions.find(s => s.id === chatId);
    if (session) {
      setMessages(session.messages || []);
    }
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || !activeChatId) return;

    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const newMsg: Message = { role: "user", content: textToSend };

    // Optimistic UI Update
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const payload = {
        chatId: activeChatId,
        userId: userId,
        messages: [...messages, newMsg] // send full history context
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.content) {
        setMessages(prev => [...prev, { role: "model", content: data.content }]);

        // Update session in sidebar array implicitly (to avoid full re-fetches)
        setSessions(prev => prev.map(s => {
          if (s.id === activeChatId) {
            return {
              ...s,
              title: data.topicTitle ? data.topicTitle : s.title,
              messages: [...(s.messages || []), newMsg, { role: "model", content: data.content as string }]
            };
          }
          return s;
        }));
      }
    } catch (error) {
      console.error("Error sending message", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRename = async (chatId: string) => {
    if (!renameTitle.trim()) {
      setIsRenamingId(null);
      return;
    }
    try {
      setSessions(prev => prev.map(s => s.id === chatId ? { ...s, title: renameTitle } : s));
      setIsRenamingId(null);
      setActiveMenuId(null);
      await fetch(`/api/chat/history/${chatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameTitle })
      });
    } catch (e) { console.error(e); }
  };

  const handleTogglePin = async (chatId: string, currentPinStatus: boolean) => {
    try {
      const newStatus = !currentPinStatus;
      setSessions(prev => {
        const updated = prev.map(s => s.id === chatId ? { ...s, is_pinned: newStatus } : s);
        return updated.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      });
      setActiveMenuId(null);
      await fetch(`/api/chat/history/${chatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: newStatus })
      });
    } catch (e) { console.error(e); }
  };

  const handleToggleArchive = async (chatId: string, currentArchiveStatus: boolean) => {
    try {
      const newStatus = !currentArchiveStatus;
      setSessions(prev => prev.map(s => s.id === chatId ? { ...s, is_archived: newStatus } : s));
      setActiveMenuId(null);

      if (activeChatId === chatId && newStatus) {
        const nextChat = sessions.find(s => s.id !== chatId && !s.is_archived);
        if (nextChat) switchChat(nextChat.id);
        else startNewChat();
      }

      await fetch(`/api/chat/history/${chatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: newStatus })
      });
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (chatId: string) => {
    try {
      setSessions(prev => prev.filter(s => s.id !== chatId));
      setActiveMenuId(null);

      if (activeChatId === chatId) {
        const nextChat = sessions.find(s => s.id !== chatId && !s.is_archived);
        if (nextChat) switchChat(nextChat.id);
        else startNewChat();
      }

      await fetch(`/api/chat/history/${chatId}`, {
        method: 'DELETE'
      });
    } catch (e) { console.error(e); }
  };

  const activeChats = sessions.filter(s => !s.is_archived);
  const archivedChats = sessions.filter(s => s.is_archived);

  return (
    <div className={`flex h-full overflow-hidden transition-colors duration-300 ease-in-out ${theme === 'dark' ? 'bg-[#161514] text-white' : 'bg-[#F5F3EF] text-gray-900'
      }`}>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 🚀 SIDEBAR (History) */}
      <div className={`fixed top-16 md:top-0 md:relative z-40 w-72 h-[calc(100vh-8rem)] md:h-full flex flex-col shrink-0 border-r-2 shadow-xl md:shadow-none transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${theme === 'dark' ? 'bg-[#252525] border-[#545454]' : 'bg-white border-[#E8E5E0]'
        }`}>


        {/* New Chat Button */}
        <div className="p-3 border-b border-opacity-30 border-gray-400 space-y-2">
          <button
            onClick={startNewChat}
            className={`w-full py-2.5 px-3 rounded-xl font-medium flex items-center gap-3 transition-colors duration-200 text-sm ${theme === 'dark'
              ? 'bg-[#545454] hover:bg-[#7D7D7D] text-white'
              : 'bg-[#252525] hover:bg-[#545454] text-[#CFCFCF] hover:text-white'
              }`}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
          <button
            onClick={toggleTemporaryChat}
            className={`w-full py-2.5 px-3 rounded-xl font-medium flex items-center gap-3 transition-colors duration-200 border border-dashed text-sm ${activeChatId === 'temp-chat'
              ? (theme === 'dark' ? 'border-red-500/50 bg-red-900/20 hover:bg-red-900/40 text-red-400' : 'border-red-300 bg-red-50 hover:bg-red-100 text-red-600')
              : (theme === 'dark' ? 'border-gray-500 hover:bg-[#2A2A2A] text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-[#545454]')
              }`}
            title="Toggle Temporary Chat"
          >
            <Ghost className="w-4 h-4" />
            {activeChatId === 'temp-chat' ? 'Exit Temp Chat' : 'Temporary Chat'}
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-hide">
          {activeChats.length === 0 && (
            <p className={`text-center mt-6 text-sm ${theme === 'dark' ? 'text-[#7D7D7D]' : 'text-gray-400'}`}>
              No previous chats found.
            </p>
          )}

          {activeChats.map((session) => (
            <div
              key={session.id}
              className={`group relative w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 ${activeChatId === session.id
                ? (theme === 'dark' ? 'bg-[#545454] text-white' : 'bg-gray-200 text-[#252525]')
                : (theme === 'dark' ? 'text-gray-300 hover:bg-[#2A2A2A]' : 'text-gray-600 hover:bg-gray-100')
                }`}
            >
              <button
                onClick={() => switchChat(session.id)}
                className="flex items-center gap-3 flex-1 min-w-0 pr-2"
              >
                <MessageCircle className="w-4 h-4 shrink-0 opacity-70" />
                {isRenamingId === session.id ? (
                  <input
                    type="text"
                    value={renameTitle}
                    onChange={(e) => setRenameTitle(e.target.value)}
                    onBlur={() => handleRename(session.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(session.id)}
                    className={`flex-1 min-w-0 text-sm font-medium bg-transparent border-b outline-none px-1 ${theme === 'dark' ? 'border-gray-500 text-white' : 'border-gray-400 text-gray-900'}`}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate text-sm font-medium flex-1 text-left">{session.title}</span>
                )}
                {session.is_pinned && <Pin className="w-3 h-3 ml-1 shrink-0 opacity-50" />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(activeMenuId === session.id ? null : session.id);
                }}
                className={`p-1.5 rounded-md transition-opacity shrink-0 ${activeMenuId === session.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"} ${theme === 'dark' ? 'hover:bg-[#7D7D7D]' : 'hover:bg-gray-200'
                  }`}
              >
                <MoreHorizontal className="w-4 h-4 opacity-70" />
              </button>

              {/* DROPDOWN MENU */}
              {activeMenuId === session.id && (
                <div
                  ref={menuRef}
                  className={`absolute right-2 top-12 w-48 rounded-xl shadow-lg border z-50 overflow-hidden ${theme === 'dark' ? 'bg-[#252525] border-[#545454]' : 'bg-white border-[#E8E5E0]'
                    }`}
                >
                  <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors text-sm ${theme === 'dark' ? 'hover:bg-[#545454]' : 'hover:bg-[#F5F3EF]'
                    }`}>
                    <Share className="w-4 h-4 opacity-70" /> Share
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setIsRenamingId(session.id); setRenameTitle(session.title); setActiveMenuId(null); }} className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors text-sm ${theme === 'dark' ? 'hover:bg-[#545454]' : 'hover:bg-[#F5F3EF]'
                    }`}>
                    <Edit2 className="w-4 h-4 opacity-70" /> Rename
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleTogglePin(session.id, !!session.is_pinned); }} className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors text-sm ${theme === 'dark' ? 'hover:bg-[#545454]' : 'hover:bg-[#F5F3EF]'
                    }`}>
                    <Pin className="w-4 h-4 opacity-70" /> {session.is_pinned ? "Unpin chat" : "Pin chat"}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleToggleArchive(session.id, !!session.is_archived); }} className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors text-sm ${theme === 'dark' ? 'hover:bg-[#545454]' : 'hover:bg-[#F5F3EF]'
                    }`}>
                    <Archive className="w-4 h-4 opacity-70" /> Archive
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }} className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors text-sm ${theme === 'dark' ? 'text-red-400 hover:bg-[#545454]' : 'text-red-600 hover:bg-[#F5F3EF]'
                    }`}>
                    <Trash2 className="w-4 h-4 opacity-70" /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Archived Folder */}
          <div className="pt-2 mt-2 border-t border-opacity-30 border-gray-400">
            <button
              onClick={() => setIsArchivedExpanded(!isArchivedExpanded)}
              className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-colors ${theme === 'dark' ? 'text-gray-300 hover:bg-[#2A2A2A]' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                <Archive className="w-4 h-4 opacity-70" />
                <span className="text-sm font-medium">Archived Chats</span>
              </div>
              {isArchivedExpanded ? <ChevronDown className="w-4 h-4 opacity-70" /> : <ChevronRight className="w-4 h-4 opacity-70" />}
            </button>

            {isArchivedExpanded && (
              <div className="mt-1 pl-2 space-y-1">
                {archivedChats.length === 0 ? (
                  <p className={`text-xs py-2 px-3 opacity-60`}>No archived chats</p>
                ) : (
                  archivedChats.map((session) => (
                    <div
                      key={session.id}
                      className={`group relative w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 ${activeChatId === session.id
                        ? (theme === 'dark' ? 'bg-[#545454] text-white' : 'bg-gray-200 text-[#252525]')
                        : (theme === 'dark' ? 'text-gray-400 hover:bg-[#2A2A2A]' : 'text-gray-500 hover:bg-gray-100')
                        }`}
                    >
                      <button
                        onClick={() => switchChat(session.id)}
                        className="flex items-center gap-3 flex-1 min-w-0 pr-2"
                      >
                        <span className="truncate text-sm opacity-80">{session.title}</span>
                      </button>
                      <button
                        title="Unarchive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleArchive(session.id, true);
                        }}
                        className={`p-1.5 rounded-md transition-opacity shrink-0 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 ${theme === 'dark' ? 'hover:bg-[#7D7D7D]' : 'hover:bg-gray-200'}`}
                      >
                        <Pin className="w-3.5 h-3.5 opacity-70 rotate-180" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🚀 MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full min-w-0">

        {/* Mobile Header Toggle */}
        <div className={`md:hidden shrink-0 sticky top-0 z-10 p-3 flex items-center justify-between border-b transition-colors duration-300 ease-in-out ${theme === 'dark' ? 'bg-[#161514] border-[#545454]' : 'bg-[#F5F3EF] border-[#E8E5E0]'
          }`}>
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(true)} className={`p-2 rounded-lg pr-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-sm truncate max-w-[150px]">
              {activeChatId === 'temp-chat' ? 'Temporary Chat' : (sessions.find(s => s.id === activeChatId)?.title || "Chat History")}
            </span>
          </div>
          <button
            onClick={toggleTemporaryChat}
            className={`p-2 rounded-lg transition-colors ${activeChatId === 'temp-chat'
              ? (theme === 'dark' ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60' : 'bg-red-100 text-red-600 hover:bg-red-200')
              : (theme === 'dark' ? 'text-gray-300 hover:bg-[#252525]' : 'text-[#545454] hover:bg-gray-200')
              }`}
            title="Toggle Temporary Chat"
          >
            <Ghost className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Bubbles Container */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
              {activeChatId === 'temp-chat' ? (
                <>
                  <Ghost className="w-16 h-16 mb-4 text-red-500 opacity-80" />
                  <h2 className="text-2xl font-bold mb-2">You are in Temporary Chat</h2>
                  <p className="max-w-md text-sm">Messages here will not be saved to your history. How can I help?</p>
                </>
              ) : (
                <>
                  <Bot className="w-16 h-16 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">How can I help you study?</h2>
                  <p className="max-w-md text-sm">Send a message or upload an image to start learning.</p>
                </>
              )}
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                {/* Avatar Model */}
                {msg.role === 'model' && (
                  <div className={`hidden md:flex w-8 h-8 rounded-full shrink-0 items-center justify-center ${theme === 'dark' ? 'bg-[#252525]' : 'bg-[#252525]'}`}>
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}

                {/* Bubble */}
                <div className={`relative px-4 py-3 text-[14px] md:text-[15px] rounded-2xl max-w-[85%] ${msg.role === 'user'
                  ? (theme === 'dark' ? 'bg-[#545454] text-white rounded-br-none' : 'bg-gray-200 text-gray-900 rounded-br-none')
                  : (theme === 'dark' ? 'bg-[#252525] text-[#EDEAE6] border border-[#545454] rounded-bl-none' : 'bg-white text-[#252525] shadow-sm border border-gray-200 rounded-bl-none')
                  }`}>
                  {msg.role === 'model' ? (
                    <ReactMarkdown
                      components={{
                        h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-md font-bold mt-2 mb-1" {...props} />,
                        p: ({ node, ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 space-y-0.5" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5" {...props} />,
                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                        code: ({ node, ...props }) => <code className={`px-1 py-0.5 rounded text-xs ${theme === 'dark' ? 'bg-[#1e1e1e] text-pink-400' : 'bg-gray-100 text-pink-600'}`} {...props} />,
                        pre: ({ node, ...props }) => <pre className={`p-3 rounded-xl overflow-x-auto mb-3 text-xs ${theme === 'dark' ? 'bg-[#1e1e1e] text-[#CFCFCF]' : 'bg-gray-800 text-[#CFCFCF]'}`} {...props} />,
                        a: ({ node, ...props }) => <a className="text-[#545454] hover:underline font-semibold" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-bold text-inherit" {...props} />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>

                {/* Avatar User */}
                {msg.role === 'user' && (
                  <div className={`hidden md:flex w-8 h-8 rounded-full shrink-0 items-center justify-center ${theme === 'dark' ? 'bg-[#7D7D7D]' : 'bg-gray-800'}`}>
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex gap-3 max-w-3xl mx-auto justify-start">
              <div className={`hidden md:flex w-8 h-8 rounded-full shrink-0 items-center justify-center ${theme === 'dark' ? 'bg-[#252525]' : 'bg-[#252525]'}`}>
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className={`px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-2 ${theme === 'dark' ? 'bg-[#252525] border border-[#545454]' : 'bg-white shadow-sm border border-gray-200'
                }`}>
                <Loader2 className="w-4 h-4 animate-spin opacity-70" />
                <span className="opacity-70 text-sm">Ascend AI is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Dock */}
        <div className="px-3 pb-3 md:px-5 md:pb-5 pt-0">
          <div className="max-w-3xl mx-auto flex items-end gap-2">

            {/* Separate Attachment Button */}
            <button className={`h-[52px] w-[52px] rounded-xl flex items-center justify-center shrink-0 transition-colors border ${theme === 'dark' ? 'bg-[#252525] border-[#545454] text-gray-300 hover:bg-[#545454] hover:text-white' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
              <Paperclip className="w-5 h-5 shrink-0" />
            </button>

            {/* Input Wrapper */}
            <div className={`flex-1 relative rounded-xl flex items-end p-1.5 border transition-colors duration-300 ease-in-out ${theme === 'dark' ? 'bg-[#252525] border-[#545454] focus-within:border-[#7D7D7D]' : 'bg-white border-gray-300 focus-within:border-[#7D7D7D] focus-within:shadow-sm'
              }`}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Ascend AI anything..."
                className="flex-1 max-h-48 min-h-[40px] bg-transparent border-0 focus:ring-0 resize-none px-3 py-2 text-[14px] outline-none custom-scrollbar"
                rows={1}
              />

              <button
                onClick={toggleDictation}
                title="Dictate"
                className={`p-2.5 rounded-lg mb-0.5 transition-colors ${isDictating ? 'text-red-500 animate-pulse' : (theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-[#545454]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100')}`}
              >
                <Mic className="w-5 h-5" />
              </button>

              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className={`p-2.5 rounded-lg mb-0.5 ml-1 transition-all duration-200 disabled:opacity-40 disabled:scale-100 active:scale-95 ${theme === 'dark'
                  ? 'bg-[#7D7D7D] text-white hover:bg-[#545454]'
                  : 'bg-[#252525] text-white hover:bg-[#545454]'
                  }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-center text-xs opacity-50 mt-3 hidden md:block">
            Ascend AI can make mistakes. Consider verifying critical information.
          </p>
        </div>

      </div>

    </div>
  );
}

export default function AiPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <AiChatCore />
    </Suspense>
  )
}
