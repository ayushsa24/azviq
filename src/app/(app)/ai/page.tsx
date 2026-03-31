"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/contexts/SidebarContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Send,
  Loader2,
  Plus,
  MessageCircle,
  Bot,
  User,
  Menu,
  X,
  Image as ImageIcon,
  MoreHorizontal,
  Share,
  Edit2,
  Pin,
  Archive,
  Trash2,
  ChevronDown,
  ChevronRight,
  Ghost,
  Paperclip,
  Mic,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Square,
  ArrowDown,
  PanelLeft,
  History,
  ChevronsLeft,
  Search,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useStudyTracker } from "@/hooks/useStudyTracker";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Skeleton } from "@/components/ui/Skeleton";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.') as any;
    error.info = await res.json().catch(() => ({}));
    error.status = res.status;
    throw error;
  }
  return res.json();
};

type Message = {
  id?: string;
  role: "user" | "model";
  content: string;
  created_at?: string;
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
  const { theme } = useTheme();
  const { open: isMainSidebarOpen, toggle: toggleMainSidebar } = useSidebar();

  useStudyTracker({ activityType: 'ai_teacher', isEnabled: true });

  const { data: session, status } = useSession();
  const { data: sessionData, mutate: mutateSessions, error: sessionError, isLoading: isHistoryLoading } = useSWR(
    status === "authenticated" ? `/api/chat/history` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000, // 10 seconds deduping
    }
  );

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
  const [isRenamingId, setIsRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [isDictating, setIsDictating] = useState(false);
  const [editingMessageIdx, setEditingMessageIdx] = useState<number | null>(
    null,
  );
  const [editInput, setEditInput] = useState("");
  const [copiedMessageIdx, setCopiedMessageIdx] = useState<number | null>(null);
  const [copiedCodeBlock, setCopiedCodeBlock] = useState<string | null>(null);
  const [activeMobileMessageIdx, setActiveMobileMessageIdx] = useState<
    number | null
  >(null);
  const [ratings, setRatings] = useState<Record<number, "good" | "bad">>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isActuallySending, setIsActuallySending] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [generatingChatIds, setGeneratingChatIds] = useState<Set<string>>(new Set());
  const [sharingChatId, setSharingChatId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharedLinkCopied, setSharedLinkCopied] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const activeStreamingTextRef = useRef<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isSendingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isMobileApp, setIsMobileApp] = useState(false);
  const currentChatIdRef = useRef(activeChatId);

  // Synchronize ref with current state for async callbacks
  useEffect(() => {
    currentChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Initialize Mobile App Check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkIsPWA =
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in window.navigator &&
          (window.navigator as any).standalone);
      setIsMobileApp(!!checkIsPWA);
    }
  }, []);

  // Keyboard open/close detection
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        setIsKeyboardOpen(true);
      }
    };
    const handleFocusOut = () => setIsKeyboardOpen(false);

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  // Auto-focus input when chat changes or on load
  useEffect(() => {
    if (inputRef.current && window.innerWidth >= 768) {
      inputRef.current.focus();
    }
  }, [activeChatId]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInput(
            (prev) =>
              prev +
              (prev.endsWith(" ") || prev.length === 0 ? "" : " ") +
              finalTranscript,
          );
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
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

  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Derive sessions directly from cached SWR data
  const sessions: ChatSession[] = sessionData?.chats || [];

  // Update historyLoaded when SWR has finished its initial data gathering block
  useEffect(() => {
    if (sessionData && !historyLoaded) {
      setHistoryLoaded(true);
    }
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [sessionData, historyLoaded, router, status]);

  const pendingQueryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!historyLoaded) return;
    const query = new URLSearchParams(window.location.search).get("q");
    if (query) {
      pendingQueryRef.current = query;
    }
    const hasImport = !!localStorage.getItem("import_shared_chat");
    if (!activeChatId && !hasImport) {
      startNewChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoaded]);

  // Handle pending query once activeChatId is available
  useEffect(() => {
    if (!activeChatId || !pendingQueryRef.current || isLoading) return;
    if (isSendingRef.current) return;

    const query = pendingQueryRef.current;
    pendingQueryRef.current = null; // Clear so it doesn't fire again

    // If the current chat already has messages, create a fresh one
    if (messages.length > 0) {
      startNewChat();
      pendingQueryRef.current = query; // Re-set so it fires after new chat is created
      return;
    }

    setInput(query);
    setTimeout(() => {
      handleSend(query);
      router.replace("/ai", { scroll: false });
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, messages.length]);

  const prevChatIdRef = useRef(activeChatId);

  // Scroll to bottom whenever messages change or chat is switched
  useEffect(() => {
    if (chatContainerRef.current) {
      const isSwitchingChat = prevChatIdRef.current !== activeChatId;
      if (isSwitchingChat) {
        prevChatIdRef.current = activeChatId;
      }

      // Delay slightly to allow DOM to render new messages before calculating scrollHeight
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: isSwitchingChat ? "auto" : (isSendingRef.current ? "smooth" : "auto"),
          });
        }
      }, 50);
    }
  }, [messages, isLoading, activeChatId]);

  const startNewChat = async () => {
    // Prevent creating multiple empty chats if one already exists
    const existingEmptyChat = sessions.find(
      (s) => !s.is_archived && (!s.messages || s.messages.length === 0),
    );
    if (existingEmptyChat) {
      switchChat(existingEmptyChat.id);
      return;
    }

    if (status !== "authenticated") return;

    // Optimistically create locally
    const optimisticId = `temp-${Date.now()}`;
    const newChatSession: ChatSession = {
      id: optimisticId,
      title: "New Chat",
      messages: [],
      created_at: new Date().toISOString()
    };
    
    mutateSessions(
      (current: { chats: ChatSession[] } | undefined) => ({
        ...current,
        chats: [newChatSession, ...(current?.chats || [])]
      }) as { chats: ChatSession[] },
      { revalidate: false }
    );

    setActiveChatId(optimisticId);
    setMessages([]);
    if (window.innerWidth < 768) setIsSidebarOpen(false);

    try {
      const res = await fetch("/api/chat/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      const data = await res.json();

      if (data.chat) {
        // Swap out optimistic chat for real one
        mutateSessions();
        setActiveChatId(data.chat.id);
      }
    } catch (err) {
      console.error("Failed to create chat");
      mutateSessions(); // Revert
    }
  };

  const toggleTemporaryChat = () => {
    if (activeChatId === "temp-chat") {
      startNewChat();
    } else {
      setActiveChatId("temp-chat");
      setMessages([]);
    }
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const switchChat = (chatId: string) => {
    setActiveChatId(chatId);
    const session = sessions.find((s) => s.id === chatId);
    if (session) {
      const baseMessages = session.messages || [];
      const partialText = activeStreamingTextRef.current[chatId];
      
      if (partialText) {
        setMessages([...baseMessages, { role: "model", content: partialText }]);
      } else {
        setMessages(baseMessages);
      }
    }
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageIdx(idx);
    setTimeout(() => setCopiedMessageIdx(null), 2000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeBlock(code);
    setTimeout(() => setCopiedCodeBlock(null), 2000);
  };

  const handleSend = async (
    overrideText?: string,
    cutHistoryAtIndex?: number,
  ) => {
    if (isSendingRef.current) return;
    setApiError(null);

    const chatIdOfRequest = activeChatId;
    const textToSend = overrideText || input;
    if (!textToSend.trim() || !chatIdOfRequest) return;

    if (status !== "authenticated") return;

    isSendingRef.current = true;
    const newMsg: Message = { role: "user", content: textToSend };

    // If an edit occurred, slice the history up to the edited message
    const previousMessages =
      cutHistoryAtIndex !== undefined
        ? messages.slice(0, cutHistoryAtIndex)
        : messages;

    // Optimistic UI Update for internal messages
    setMessages([...previousMessages, newMsg]);
    setInput("");
    setEditingMessageIdx(null);
    setIsLoading(true);
    setIsActuallySending(true);
    
    setGeneratingChatIds(prev => new Set(prev).add(chatIdOfRequest));

    // Immediately move this chat to the top within SWR and ensure it's marked as non-empty
    mutateSessions((currentData: { chats: ChatSession[] } | undefined) => {
      if (!currentData || !currentData.chats) return currentData;
      const current = currentData.chats.find((s: ChatSession) => s.id === chatIdOfRequest);
      if (!current) return currentData;
      
      const updatedCurrent = {
        ...current,
        messages: [...(current.messages || []), newMsg],
      };
      const others = currentData.chats.filter((s: ChatSession) => s.id !== chatIdOfRequest);
      
      return { ...currentData, chats: [updatedCurrent, ...others] };
    }, { revalidate: false });

    let aiResponseText = "";
    let topicTitle: string | null = null;

    try {
      const payload = {
        chatId: activeChatId,
        messages: [...previousMessages, newMsg], // send full history context
      };

      abortControllerRef.current = new AbortController();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const rawError = errorData.error;
        let finalError = "API stream error";
        
        if (typeof rawError === "object" && rawError !== null) {
          finalError = rawError.message || JSON.stringify(rawError);
        } else if (typeof rawError === "string") {
          finalError = rawError;
        }
        
        throw new Error(finalError);
      }
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      // Lock in a blank message that will get updated character-by-character
      setMessages((prev) => [...prev, { role: "model", content: "" }]);
      // Since typing started, immediately turn off the big thinking spinner
      setIsLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              const chunkText = parsed.message.content;
              aiResponseText += chunkText;
              activeStreamingTextRef.current[chatIdOfRequest] = aiResponseText;

              // Only update local messages state if we are still viewing this chat
              if (currentChatIdRef.current === chatIdOfRequest) {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "model",
                    content: aiResponseText,
                  };
                  return updated;
                });
              }
            }
            if (parsed.__generatedTitle) {
              topicTitle = parsed.__generatedTitle;
            }
          } catch (e) { }
        }
      }

      // Update sidebar session explicitly at the end and move it to the top in SWR
      mutateSessions((currentData: { chats: ChatSession[] } | undefined) => {
        if (!currentData || !currentData.chats) return currentData;
        const updatedChat = currentData.chats.find((s: ChatSession) => s.id === activeChatId);
        if (!updatedChat) return currentData;

        const updated: ChatSession = {
          ...updatedChat,
          title: topicTitle ? topicTitle : updatedChat.title,
          messages: [
            ...previousMessages,
            newMsg,
            { role: "model" as const, content: aiResponseText },
          ],
        };

        const others = currentData.chats.filter((s: ChatSession) => s.id !== activeChatId);
        return { ...currentData, chats: [updated, ...others] };
      }, false);
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("User aborted the generation");
        
        // Optimistically update the SWR cache with the partial response so it survives chat switching
        if (aiResponseText.trim().length > 0) {
          mutateSessions((currentData: { chats: ChatSession[] } | undefined) => {
            if (!currentData || !currentData.chats) return currentData;
            const updatedChat = currentData.chats.find((s: ChatSession) => s.id === activeChatId);
            if (!updatedChat) return currentData;

            const updated: ChatSession = {
              ...updatedChat,
              messages: [
                ...previousMessages,
                newMsg,
                { role: "model" as const, content: aiResponseText },
              ],
            };

            const others = currentData.chats.filter((s: ChatSession) => s.id !== activeChatId);
            return { ...currentData, chats: [updated, ...others] };
          }, false);

          // Save the partial message to the database
          if (activeChatId !== "temp-chat") {
            fetch("/api/chat/message", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chatId: activeChatId,
                role: "model",
                content: aiResponseText,
              }),
            }).catch((e) => console.error("Failed to save partial message", e));
          }
        }
      } else {
        console.error("Error sending message", error);
        setApiError(error.message || "Something went wrong. Please try again.");
      }
    } finally {
      // Remove from generating set and clear streaming ref
      setGeneratingChatIds(prev => {
        const next = new Set(prev);
        next.delete(chatIdOfRequest);
        return next;
      });
      delete activeStreamingTextRef.current[chatIdOfRequest];

      if (currentChatIdRef.current === chatIdOfRequest) {
        setIsLoading(false);
        setIsActuallySending(false);
      }
      isSendingRef.current = false;
    }
  };

  const handleRename = async (chatId: string) => {
    if (!renameTitle.trim()) {
      setIsRenamingId(null);
      return;
    }
    
    // Optimistic Update
    mutateSessions((currentData: { chats: ChatSession[] } | undefined) => {
      if (!currentData || !currentData.chats) return currentData;
      return {
        ...currentData,
        chats: currentData.chats.map((s: ChatSession) => 
          s.id === chatId ? { ...s, title: renameTitle } : s
        )
      };
    }, { revalidate: false });
    
    try {
      setIsRenamingId(null);
      setActiveMenuId(null);
      await fetch(`/api/chat/history/${chatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameTitle }),
      });
    } catch (e) {
      console.error(e);
      mutateSessions(); // Revert
    }
  };

  const handleTogglePin = async (chatId: string, currentPinStatus: boolean) => {
    const newStatus = !currentPinStatus;
    
    // Optimistic Update
    mutateSessions((currentData: { chats: ChatSession[] } | undefined) => {
      if (!currentData || !currentData.chats) return currentData;
      const updated = currentData.chats.map((s: ChatSession) =>
        s.id === chatId ? { ...s, is_pinned: newStatus } : s
      );
      const sorted = updated.sort((a: ChatSession, b: ChatSession) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      return { ...currentData, chats: sorted };
    }, { revalidate: false });
    
    try {
      setActiveMenuId(null);
      await fetch(`/api/chat/history/${chatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: newStatus }),
      });
    } catch (e) {
      console.error(e);
      mutateSessions(); // Revert
    }
  };

  const handleToggleArchive = async (
    chatId: string,
    currentArchiveStatus: boolean,
  ) => {
    const newStatus = !currentArchiveStatus;
    
    // Optimistic Update
    mutateSessions((currentData: { chats: ChatSession[] } | undefined) => {
      if (!currentData || !currentData.chats) return currentData;
      return {
        ...currentData,
        chats: currentData.chats.map((s: ChatSession) =>
          s.id === chatId ? { ...s, is_archived: newStatus } : s
        )
      };
    }, { revalidate: false });
    
    try {
      setActiveMenuId(null);

      if (activeChatId === chatId && newStatus) {
        const nextChat = sessions.find(
          (s) => s.id !== chatId && !s.is_archived,
        );
        if (nextChat) switchChat(nextChat.id);
        else startNewChat();
      }

      await fetch(`/api/chat/history/${chatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: newStatus }),
      });
    } catch (e) {
      console.error(e);
      mutateSessions(); // Revert
    }
  };

  const handleDelete = async (chatId: string) => {
    // Optimistic Update
    mutateSessions((currentData: { chats: ChatSession[] } | undefined) => {
      if (!currentData || !currentData.chats) return currentData;
      return {
        ...currentData,
        chats: currentData.chats.filter((s: ChatSession) => s.id !== chatId)
      };
    }, { revalidate: false });
    
    try {
      setActiveMenuId(null);

      if (activeChatId === chatId) {
        const nextChat = sessions.find(
          (s) => s.id !== chatId && !s.is_archived,
        );
        if (nextChat) switchChat(nextChat.id);
        else startNewChat();
      }

      await fetch(`/api/chat/history/${chatId}`, {
        method: "DELETE",
      });
      mutateSessions();
    } catch (e) {
      console.error(e);
      mutateSessions(); // Revert
    }
  };

  const handleShareChat = async (session: ChatSession) => {
    if (!session.messages || session.messages.length === 0) return;
    setSharingChatId(session.id);
    setActiveMenuId(null);
    try {
      const res = await fetch("/api/share/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: session.id,
          title: session.title,
          messages: session.messages,
        }),
      });
      const data = await res.json();
      if (data.id) {
        const link = `${window.location.origin}/share/chat/${data.id}`;
        setShareUrl(link);
      }
    } catch (e) {
      console.error("Failed to share chat", e);
    } finally {
      setSharingChatId(null);
    }
  };

  // Import a shared chat
  useEffect(() => {
    if (!historyLoaded || status !== "authenticated") return;

    const raw = localStorage.getItem("import_shared_chat");
    if (!raw) return;
    localStorage.removeItem("import_shared_chat");

    const params = new URLSearchParams(window.location.search);
    if (params.has("from_share")) {
      router.replace("/ai", { scroll: false });
    }

    let importData: { title: string; messages: Message[] } | null = null;
    try { importData = JSON.parse(raw); } catch { return; }
    if (!importData || !importData.messages?.length) return;

    const doImport = async () => {
      try {
        setIsImporting(true);
        // Create a new chat with the original title
        const res = await fetch("/api/chat/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: importData!.title || "Shared Chat" }),
        });
        const data = await res.json();
        if (!data.chat?.id) return;
        const newChatId = data.chat.id;

        // Bulk-insert all messages from the shared chat
        for (const msg of importData!.messages) {
          await fetch("/api/chat/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatId: newChatId, role: msg.role, content: msg.content }),
          });
        }

        await mutateSessions();
        setActiveChatId(newChatId);
        setMessages(importData!.messages);
      } catch (e) {
        console.error("Failed to import shared chat", e);
      } finally {
        setIsImporting(false);
      }
    };

    doImport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoaded, status]);

  // Organize chats based on search query
  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeChats = filteredSessions.filter((s) => !s.is_archived);
  const pinnedChats = activeChats.filter((s) => s.is_pinned);
  const unpinnedChats = activeChats
    .filter((s) => !s.is_pinned)
    .filter((s) => {
      const isEmpty = !s.messages || s.messages.length === 0;
      return !isEmpty; // Always hide empty chats until a message is sent
    });
  const archivedChats = sessions.filter((s) => s.is_archived);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressActive = useRef(false);

  const renderSessionItem = (session: ChatSession) => {
    const handleTouchStart = () => {
      if (!isMobileApp) return;
      isLongPressActive.current = false;
      longPressTimerRef.current = setTimeout(() => {
        isLongPressActive.current = true;
        setActiveMenuId(session.id);
      }, 500);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };

    const handleSessionClick = () => {
      if (isLongPressActive.current) {
        isLongPressActive.current = false;
        return;
      }
      switchChat(session.id);
    };

    const formatDate = (iso: string) => {
      if (!iso) return "";
      const date = new Date(iso);
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffInDays < 3) return formatDistanceToNow(date, { addSuffix: true });
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    return (
      <div
        key={session.id}
        onContextMenu={(e) => {
          e.preventDefault();
          setActiveMenuId(activeMenuId === session.id ? null : session.id);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={() => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }}
        className={`group relative w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 ${activeChatId === session.id
          ? theme === "dark"
            ? "bg-[#545454] text-white"
            : "bg-[#F0EDE8] text-[#252525]"
          : theme === "dark"
            ? "text-gray-300 hover:bg-[#2A2A2A]"
            : "text-gray-600 hover:bg-[#F0EDE8]/50"
          }`}
      >
        <button
          onClick={handleSessionClick}
          className="flex items-start gap-2.5 flex-1 min-w-0 pr-2"
        >
          <MessageCircle className="w-4 h-4 shrink-0 opacity-70 mt-0.5" />
          <div className="flex flex-col items-start min-w-0 flex-1">
            {isRenamingId === session.id ? (
              <input
                type="text"
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                onBlur={() => handleRename(session.id)}
                onKeyDown={(e) => e.key === "Enter" && handleRename(session.id)}
                className={`w-full text-sm font-semibold bg-transparent border-b outline-none px-0 ${theme === "dark" ? "border-gray-500 text-white" : "border-[#E8E5E0] text-gray-900"}`}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex items-center gap-2 min-w-0 w-full">
                <span className="truncate text-[13px] font-semibold text-left leading-tight">
                  {session.title}
                </span>
                {generatingChatIds.has(session.id) && (
                  <div className="flex gap-0.5 shrink-0">
                    <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></span>
                  </div>
                )}
              </div>
            )}
          </div>
          {session.is_pinned && (
            <Pin className="w-3 h-3 ml-1 shrink-0 opacity-50 mt-1" />
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveMenuId(activeMenuId === session.id ? null : session.id);
          }}
          className={`block p-1 rounded-md transition-opacity shrink-0 ${activeMenuId === session.id ? "opacity-100" : "opacity-100 md:opacity-0 group-hover:opacity-100 md:group-hover:opacity-100"} ${theme === "dark" ? "hover:bg-[#7D7D7D]" : "hover:bg-[#F0EDE8]"
            }`}
        >
          <MoreHorizontal className="w-3.5 h-3.5 opacity-70" />
        </button>

        {/* DROPDOWN MENU */}
        {activeMenuId === session.id && (
          <div
            ref={menuRef}
            className={`absolute right-2 top-11 w-44 rounded-xl shadow-lg border z-50 overflow-hidden ${theme === "dark"
              ? "bg-[#252525] border-[#545454]"
              : "bg-white/95 backdrop-blur-md border-[#E8E5E0]"
              }`}
          >
            <div className={`px-3 py-2 border-b flex items-center gap-2.5 opacity-50 text-[10px] font-bold uppercase tracking-wider ${theme === "dark" ? "border-[#545454]" : "border-[#E8E5E0]"}`}>
              <Clock size={12} />
              {formatDate(session.created_at)}
            </div>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await handleShareChat(session);
              }}
              disabled={sharingChatId === session.id}
              className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors text-[13px] ${theme === "dark" ? "hover:bg-[#545454]" : "hover:bg-[#F5F3EF]"}`}
            >
              {sharingChatId === session.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin opacity-70" />
                : sharedLinkCopied === session.id
                  ? <Check className="w-3.5 h-3.5 text-green-500" />
                  : <Share className="w-3.5 h-3.5 opacity-70" />
              }
              {sharedLinkCopied === session.id ? "Link copied!" : "Share"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRenamingId(session.id);
                setRenameTitle(session.title);
                setActiveMenuId(null);
              }}
              className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors text-[13px] ${theme === "dark" ? "hover:bg-[#545454]" : "hover:bg-[#F5F3EF]"
                }`}
            >
              <Edit2 className="w-3.5 h-3.5 opacity-70" /> Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePin(session.id, !!session.is_pinned);
              }}
              className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors text-[13px] ${theme === "dark" ? "hover:bg-[#545454]" : "hover:bg-[#F5F3EF]"
                }`}
            >
              <Pin className="w-3.5 h-3.5 opacity-70" />{" "}
              {session.is_pinned ? "Unpin chat" : "Pin chat"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleArchive(session.id, !!session.is_archived);
              }}
              className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors text-[13px] ${theme === "dark" ? "hover:bg-[#545454]" : "hover:bg-[#F5F3EF]"
                }`}
            >
              <Archive className="w-3.5 h-3.5 opacity-70" /> Archive
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(session.id);
              }}
              className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors text-[13px] ${theme === "dark"
                ? "text-red-400 hover:bg-[#545454]"
                : "text-red-600 hover:bg-[#F5F3EF]"
                }`}
            >
              <Trash2 className="w-3.5 h-3.5 opacity-70" /> Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="flex h-full overflow-hidden transition-colors duration-300 ease-in-out bg-transparent dark:bg-[#1A1A1A] text-[#252525] dark:text-white"
    >
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[55] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 🚀 SIDEBAR (History) */}
      <div
        className={`fixed inset-y-0 left-0 z-[60] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] md:p-0 md:top-0 md:bottom-auto md:relative md:z-50 w-[280px] md:h-full flex flex-col shrink-0 border-r-2 shadow-xl md:shadow-none transition-all duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} ${isHistoryOpen ? "md:w-72 md:translate-x-0 md:opacity-100" : "md:w-0 md:opacity-0 md:-translate-x-full md:border-r-0 md:overflow-hidden"} ${theme === "dark"
          ? "bg-[#1A1A1A] border-[#545454]"
          : "bg-[#F5F3EF] border-[#E8E5E0]"
          }`}
      >
        {/* ── Desktop History Sidebar Header ── */}
        <div className={`hidden md:flex items-center justify-between px-4 h-14 shrink-0 border-b ${theme === "dark" ? "border-[#2E2E2E]" : "border-[#E8E5E0]"}`}>
          <div className="flex items-center gap-3">
            {!isMainSidebarOpen && (
              <button
                onClick={toggleMainSidebar}
                className={`hidden md:flex items-center justify-center w-8 h-8 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 ${theme === "dark"
                  ? "bg-[#252525] border-[#545454] text-[#BABABA] hover:bg-white hover:text-[#252525] hover:border-white"
                  : "bg-white border-[#E8E5E0] text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525] hover:border-[#D1D1D1]"
                  }`}
                title="Toggle main menu"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            )}
            <span className="font-semibold text-sm">Chat history</span>
          </div>
          <button
            onClick={() => setIsHistoryOpen(false)}
            className={`hidden md:flex items-center justify-center w-8 h-8 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 ${theme === "dark"
              ? "bg-[#252525] border-[#545454] text-[#BABABA] hover:bg-white hover:text-[#252525] hover:border-white"
              : "bg-white border-[#E8E5E0] text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525] hover:border-[#D1D1D1]"
              }`}
            title="Close chat history"
          >
            <ChevronsLeft className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 pb-1.5 flex items-center gap-2">
          <button
            onClick={startNewChat}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors duration-200 text-sm ${theme === "dark"
              ? "bg-[#545454] hover:bg-[#7D7D7D] text-white"
              : "bg-[#252525] hover:bg-[#545454] text-white hover:text-white"
              }`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="truncate">New Chat</span>
          </button>
          <button
            onClick={toggleTemporaryChat}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors duration-200 border border-dashed text-sm ${activeChatId === "temp-chat"
              ? theme === "dark"
                ? "border-red-500/50 bg-red-900/20 hover:bg-red-900/40 text-red-400"
                : "border-red-300 bg-red-50 hover:bg-red-100 text-red-600"
              : theme === "dark"
                ? "border-gray-500 hover:bg-[#2A2A2A] text-gray-300"
                : "border-[#E8E5E0] hover:bg-[#F0EDE8] text-[#545454]"
              }`}
            title="Toggle Temporary Chat"
          >
            <Ghost className="w-4 h-4 shrink-0" />
            <span className="truncate">{activeChatId === "temp-chat" ? "Exit Temp" : "Temp Chat"}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className={`p-3 pt-1.5 border-b shrink-0 ${theme === "dark" ? "border-[#2E2E2E]" : "border-[#E8E5E0]"}`}>
          <div className={`relative flex items-center w-full rounded-lg border transition-all duration-200 ${theme === "dark"
            ? "bg-[#1A1A1A] border-[#545454] focus-within:border-[#7D7D7D] focus-within:ring-1 focus-within:ring-[#7D7D7D]"
            : "bg-white border-[#E8E5E0] focus-within:border-[#7D7D7D] focus-within:ring-1 focus-within:ring-[#7D7D7D]"
            }`}>
            <Search className={`absolute left-2.5 w-4 h-4 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full py-1.5 pl-9 pr-8 bg-transparent border-none outline-none text-sm ${theme === "dark" ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400"
                }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={`absolute right-2 p-0.5 rounded-full transition-colors ${theme === "dark" ? "hover:bg-[#545454] text-gray-400 hover:text-white" : "hover:bg-[#F0EDE8] text-gray-500 hover:text-[#252525]"
                  }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-hide">
          {isHistoryLoading && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2 w-full opacity-60">
              <Skeleton className="w-4 h-4 shrink-0 rounded-full opacity-30" />
              <Skeleton className="h-4 flex-1 rounded-md opacity-20" />
            </div>
          ))}
          {sessionError && (
            <div className={`p-3 text-center text-xs rounded-lg mb-3 ${theme === "dark" ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"}`}>
              {sessionError.status === 429 
                ? "Slow down! You're refreshing too fast. History will reappear in a moment." 
                : "Failed to load chat history."}
            </div>
          )}
          {activeChats.length === 0 && !sessionError && !isHistoryLoading && (
            <p
              className={`text-center mt-6 text-sm ${theme === "dark" ? "text-[#BABABA]" : "text-gray-400"}`}
            >
              No previous chats found.
            </p>
          )}

          {pinnedChats.map((session) => renderSessionItem(session))}
          {unpinnedChats.map((session) => renderSessionItem(session))}
        </div>

        {/* Archived Folder (Moved to bottom area) */}
        <div className={`p-3 pb-16 md:pb-3 border-t shrink-0 ${theme === "dark" ? "border-[#2E2E2E]" : "border-[#E8E5E0]"}`}>
          <button
            onClick={() => setIsArchivedExpanded(!isArchivedExpanded)}
            className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-colors ${theme === "dark" ? "text-gray-300 hover:bg-[#2A2A2A]" : "text-gray-600 hover:bg-[#F0EDE8]"}`}
          >
            <div className="flex items-center gap-3">
              <Archive className="w-4 h-4 opacity-70" />
              <span className="text-sm font-medium">Archived Chats</span>
            </div>
            {isArchivedExpanded ? (
              <ChevronDown className="w-4 h-4 opacity-70" />
            ) : (
              <ChevronRight className="w-4 h-4 opacity-70" />
            )}
          </button>

          {isArchivedExpanded && (
            <div className="mt-1 pl-2 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
              {archivedChats.length === 0 ? (
                <p className={`text-xs py-2 px-3 opacity-60`}>
                  No archived chats
                </p>
              ) : (
                archivedChats.map((session) => (
                  <div
                    key={session.id}
                    className={`group relative w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-all duration-200 ${activeChatId === session.id
                      ? theme === "dark"
                        ? "bg-[#545454] text-white"
                        : "bg-[#F0EDE8] text-[#252525]"
                      : theme === "dark"
                        ? "text-gray-400 hover:bg-[#2A2A2A]"
                        : "text-gray-500 hover:bg-[#F0EDE8]/50"
                      }`}
                  >
                    <button
                      onClick={() => switchChat(session.id)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 pr-2"
                    >
                      <span className="truncate text-sm opacity-80">
                        {session.title}
                      </span>
                    </button>
                    <button
                      title="Unarchive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleArchive(session.id, true);
                      }}
                      className={`p-1.5 rounded-md transition-opacity shrink-0 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 ${theme === "dark" ? "hover:bg-[#7D7D7D]" : "hover:bg-[#F0EDE8]"}`}
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

      {/* 🚀 MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Desktop History Toggle */}
        {!isHistoryOpen && (
          <div className="hidden md:flex absolute top-4 left-4 z-20 items-center gap-1">
            {!isMainSidebarOpen && (
              <button
                onClick={toggleMainSidebar}
                className={`hidden md:flex items-center justify-center w-8 h-8 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 ${theme === "dark"
                  ? "bg-[#252525] border-[#545454] text-[#BABABA] hover:bg-white hover:text-[#252525] hover:border-white"
                  : "bg-white border-[#E8E5E0] text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525] hover:border-[#D1D1D1]"
                  }`}
                title="Open main menu"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border duration-200 font-medium text-sm ${theme === "dark" ? "border-transparent text-gray-300 hover:text-white hover:bg-[#252525]" : "bg-white border-[#E8E5E0] text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525] hover:border-[#D1D1D1]"}`}
              title="Open history"
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </button>
          </div>
        )}
        {/* Mobile Header Toggle */}
        <div
          className={`md:hidden shrink-0 sticky top-0 z-10 p-1 pt-[calc(env(safe-area-inset-top,0px)+8px)] px-3 flex items-center justify-between border-b transition-colors duration-300 ease-in-out ${theme === "dark"
            ? "bg-[#1A1A1A] border-[#545454]"
            : "bg-[#F5F3EF] border-[#E8E5E0]"
            }`}
        >
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className={`p-2 rounded-lg pr-4 ${theme === "dark" ? "text-white" : "text-gray-800"}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-sm truncate max-w-[150px]">
              {activeChatId === "temp-chat"
                ? "Temporary Chat"
                : sessions.find((s) => s.id === activeChatId)?.title ||
                "Chat History"}
            </span>
          </div>
          <button
            onClick={toggleTemporaryChat}
            className={`p-2 rounded-lg transition-colors ${activeChatId === "temp-chat"
              ? theme === "dark"
                ? "bg-red-900/40 text-red-400 hover:bg-red-900/60"
                : "bg-red-100 text-red-600 hover:bg-red-200"
              : theme === "dark"
                ? "text-gray-300 hover:bg-[#252525]"
                : "text-[#545454] hover:bg-[#F0EDE8]"
              }`}
            title="Toggle Temporary Chat"
          >
            <Ghost className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Bubbles Container */}
        <div
          ref={chatContainerRef}
          onScroll={() => {
            if (chatContainerRef.current) {
              const { scrollTop, scrollHeight, clientHeight } =
                chatContainerRef.current;
              setShowScrollDown(scrollHeight - scrollTop - clientHeight > 150);
            }
          }}
          className="flex-1 overflow-y-auto p-0 md:p-6 space-y-4 md:space-y-6"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
              {isImporting ? (
                <div className="flex flex-col items-center animate-pulse">
                  <div className={`w-16 h-16 mb-4 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#2A2A2A]" : "bg-[#F0EDE8]"}`}>
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">
                    Importing your chat...
                  </h2>
                  <p className="max-w-md text-sm">
                    Please wait while your messages are securely restored.
                  </p>
                </div>
              ) : activeChatId === "temp-chat" ? (
                <>
                  <Ghost className="w-16 h-16 mb-4 text-red-500 opacity-80" />
                  <h2 className="text-2xl font-bold mb-2">
                    You are in Temporary Chat
                  </h2>
                  <p className="max-w-md text-sm">
                    Messages here will not be saved to your history. How can I
                    help?
                  </p>
                </>
              ) : (
                <>
                  <Bot className="w-16 h-16 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">
                    How can I help you study?
                  </h2>
                  <p className="max-w-md text-sm">
                    Send a message or upload an image to start learning.
                  </p>
                </>
              )}
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`group flex gap-3 md:gap-4 max-w-4xl mx-auto w-full px-3 md:px-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActiveMobileMessageIdx(
                    activeMobileMessageIdx === idx ? null : idx,
                  );
                }}
              >
                {/* Avatar Model */}
                {msg.role === "model" && (
                  <div
                    className={`hidden md:flex w-8 h-8 mt-2 rounded-full shrink-0 items-center justify-center ${theme === "dark" ? "bg-[#252525]" : "bg-[#252525]"}`}
                  >
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}

                {/* Bubble Container */}
                <div
                  className={`relative flex flex-col gap-1 ${msg.role === "user" ? "items-end max-w-[85%] md:max-w-[75%]" : "items-start w-full md:w-[calc(100%-48px)] max-w-full"}`}
                >
                  {/* Timestamp - User Only, Mobile Only, On Long Press */}
                  {msg.role === "user" && activeMobileMessageIdx === idx && (
                    <span
                      className={`md:hidden text-[10px] px-1 mb-0.5 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {msg.created_at
                        ? new Date(msg.created_at).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                        : "Just now"}
                    </span>
                  )}

                  {/* Bubble */}
                  <div
                    className={`relative px-4 py-3 text-[14px] md:text-[15px] rounded-2xl ${msg.role === "user"
                      ? theme === "dark"
                        ? "bg-[#545454] text-white rounded-br-none"
                        : "bg-[#F0EDE8] text-gray-900 rounded-br-none"
                      : theme === "dark"
                        ? "w-fit max-w-full bg-[#252525] text-white border border-[#545454] rounded-bl-none ai-response-content"
                        : "w-fit max-w-full bg-white text-[#252525] shadow-sm border border-[#E8E5E0] rounded-bl-none ai-response-content"
                      }`}
                  >
                    {editingMessageIdx === idx ? (
                      <div className="flex flex-col gap-2 min-w-[200px] sm:min-w-[300px]">
                        <textarea
                          autoFocus
                          value={editInput}
                          onChange={(e) => setEditInput(e.target.value)}
                          className={`w-full bg-transparent border-0 focus:ring-0 resize-none outline-none custom-scrollbar p-0 m-0 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                          rows={Math.max(2, editInput.split("\n").length)}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => setEditingMessageIdx(null)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${theme === "dark" ? "bg-[#252525] hover:bg-[#333] text-gray-300" : "bg-[#F0EDE8] hover:bg-[#D1D1D1] text-gray-700"}`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSend(editInput, idx)}
                            disabled={
                              !editInput.trim() || editInput === msg.content
                            }
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${theme === "dark" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-indigo-500 hover:bg-indigo-600 text-white"}`}
                          >
                            Save & Resubmit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.role === "model" ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ node, ...props }) => (
                                <h1
                                  className="text-xl font-bold mt-4 mb-2"
                                  {...props}
                                />
                              ),
                              h2: ({ node, ...props }) => (
                                <h2
                                  className="text-lg font-bold mt-3 mb-2"
                                  {...props}
                                />
                              ),
                              h3: ({ node, ...props }) => (
                                <h3
                                  className="text-md font-bold mt-2 mb-1"
                                  {...props}
                                />
                              ),
                              p: ({ node, ...props }) => (
                                <p
                                  className="mb-2 leading-relaxed"
                                  {...props}
                                />
                              ),
                              ul: ({ node, ...props }) => (
                                <ul
                                  className="list-disc pl-5 mb-2 space-y-0.5"
                                  {...props}
                                />
                              ),
                              ol: ({ node, ...props }) => (
                                <ol
                                  className="list-decimal pl-5 mb-2 space-y-0.5"
                                  {...props}
                                />
                              ),
                              li: ({ node, ...props }) => (
                                <li className="pl-1" {...props} />
                              ),
                              a: ({ node, ...props }) => (
                                <a
                                  className="text-[#545454] dark:text-white hover:underline font-semibold"
                                  {...props}
                                />
                              ),
                              strong: ({ node, ...props }) => (
                                <strong
                                  className="font-bold text-inherit"
                                  {...props}
                                />
                              ),
                              table: ({ node, ...props }) => (
                                <div className="w-full overflow-x-auto mb-4 mt-2 border rounded-lg border-[#E8E5E0] dark:border-[#545454]">
                                  <table
                                    className="w-full text-sm text-left border-collapse"
                                    {...props}
                                  />
                                </div>
                              ),
                              thead: ({ node, ...props }) => (
                                <thead
                                  className={`text-xs uppercase font-medium ${theme === "dark" ? "bg-[#2A2A2A] text-gray-300 border-b border-[#545454]" : "bg-[#F5F3EF] text-gray-700 border-b border-[#E8E5E0]"}`}
                                  {...props}
                                />
                              ),
                              tbody: ({ node, ...props }) => (
                                <tbody
                                  className="divide-y divide-gray-200 dark:divide-[#545454]"
                                  {...props}
                                />
                              ),
                              tr: ({ node, ...props }) => (
                                <tr
                                  className={`transition-colors shadow-sm ${theme === "dark" ? "hover:bg-[#252525]/50" : "hover:bg-gray-50"}`}
                                  {...props}
                                />
                              ),
                              th: ({ node, ...props }) => (
                                <th
                                  className="px-4 py-3 border-r last:border-r-0 border-gray-200 dark:border-[#545454]"
                                  {...props}
                                />
                              ),
                              td: ({ node, ...props }) => (
                                <td
                                  className="px-4 py-3 border-r last:border-r-0 border-gray-200 dark:border-[#545454]"
                                  {...props}
                                />
                              ),
                              pre: ({ node, children, ...props }) => (
                                <div className="not-prose">{children}</div>
                              ),
                              code({
                                node,
                                className,
                                children,
                                ...props
                              }: any) {
                                const match = /language-(\w+)/.exec(
                                  className || "",
                                );
                                const isInline =
                                  !match && !className?.includes("language");
                                const codeString = String(children).replace(
                                  /\n$/,
                                  "",
                                );

                                if (isInline) {
                                  return (
                                    <code
                                      className={`px-1 py-0.5 rounded text-xs ${theme === "dark" ? "bg-[#1e1e1e] text-pink-400" : "bg-[#F5F3EF] text-pink-600"}`}
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  );
                                }

                                return (
                                  <div className="relative group/code mb-4 mt-3">
                                    <div
                                      className={`flex items-center justify-between px-4 py-2 text-xs font-sans rounded-t-xl ${theme === "dark" ? "bg-[#2A2A2A] text-gray-400 border border-b-0 border-[#545454]" : "bg-gray-800 text-gray-400 border border-b-0 border-gray-800"}`}
                                    >
                                      <span>{match?.[1] || "code"}</span>
                                      <button
                                        onClick={() =>
                                          handleCopyCode(codeString)
                                        }
                                        className="flex items-center gap-1.5 hover:text-white transition-colors"
                                      >
                                        {copiedCodeBlock === codeString ? (
                                          <Check className="w-3.5 h-3.5 text-green-500" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5" />
                                        )}
                                        {copiedCodeBlock === codeString ? (
                                          <span className="text-green-500">
                                            Copied
                                          </span>
                                        ) : (
                                          <span>Copy code</span>
                                        )}
                                      </button>
                                    </div>
                                    <div
                                      className={`overflow-x-auto text-sm rounded-b-xl ${theme === "dark" ? "bg-[#161514] border border-[#545454]" : "bg-[#1e1e1e] border border-gray-800"}`}
                                    >
                                      <SyntaxHighlighter
                                        style={vscDarkPlus}
                                        language={match?.[1] || "text"}
                                        PreTag="div"
                                        customStyle={{
                                          margin: 0,
                                          padding: "1rem",
                                          background: "transparent",
                                          fontSize: "0.875rem",
                                        }}
                                        {...props}
                                      >
                                        {codeString}
                                      </SyntaxHighlighter>
                                    </div>
                                  </div>
                                );
                              },
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Action Buttons Beneath Bubble */}
                  {editingMessageIdx !== idx && !isLoading && (
                    <div
                      className={`transition-opacity flex items-center gap-1 mt-0.5 ${msg.role === "user" ? "justify-end mr-1" : "justify-start ml-1"} ${(msg.role === "model" && !isMobileApp) || activeMobileMessageIdx === idx ? "opacity-100" : "opacity-0"} ${msg.role === "model" ? "md:opacity-100" : "md:opacity-0 group-hover:opacity-100"}`}
                    >
                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopy(msg.content, idx)}
                        className={`flex items-center gap-1 text-[11px] px-1 py-0.5 rounded-md transition-colors ${theme === "dark" ? "text-gray-400 hover:text-white hover:bg-[#545454]" : "text-gray-500 hover:text-gray-900 hover:bg-[#F0EDE8]"}`}
                        title="Copy message"
                      >
                        {copiedMessageIdx === idx ? (
                          <Check className="w-3 h-3 text-green-500 shrink-0" />
                        ) : (
                          <Copy className="w-3 h-3 shrink-0" />
                        )}
                        {copiedMessageIdx === idx ? (
                          <span className="text-green-500">Copied</span>
                        ) : (
                          "Copy"
                        )}
                      </button>

                      {/* AI Ratings (Good / Bad Response) */}
                      {msg.role === "model" && (
                        <>
                          <div
                            className={`w-px h-3 mx-1 ${theme === "dark" ? "bg-[#545454]" : "bg-[#E8E5E0]"}`}
                          ></div>
                          <button
                            onClick={() =>
                              setRatings((prev) => ({ ...prev, [idx]: "good" }))
                            }
                            className={`flex items-center gap-1 text-[11px] px-1 py-0.5 rounded-md transition-colors ${ratings[idx] === "good" ? "text-green-500 bg-green-500/10" : theme === "dark" ? "text-gray-400 hover:text-white hover:bg-[#545454]" : "text-gray-500 hover:text-gray-900 hover:bg-[#F0EDE8]"}`}
                            title="Good response"
                          >
                            <ThumbsUp
                              className={`w-3 h-3 shrink-0 ${ratings[idx] === "good" ? "fill-current" : ""}`}
                            />
                            <span className="sr-only">Good</span>
                          </button>
                          <button
                            onClick={() =>
                              setRatings((prev) => ({ ...prev, [idx]: "bad" }))
                            }
                            className={`flex items-center gap-1 text-[11px] px-1 py-0.5 rounded-md transition-colors ${ratings[idx] === "bad" ? "text-red-500 bg-red-500/10" : theme === "dark" ? "text-gray-400 hover:text-white hover:bg-[#545454]" : "text-gray-500 hover:text-gray-900 hover:bg-[#F0EDE8]"}`}
                            title="Bad response"
                          >
                            <ThumbsDown
                              className={`w-3 h-3 shrink-0 ${ratings[idx] === "bad" ? "fill-current" : ""}`}
                            />
                            <span className="sr-only">Bad</span>
                          </button>
                        </>
                      )}

                      {/* Edit Button (Users Only) */}
                      {msg.role === "user" && (
                        <button
                          onClick={() => {
                            setEditingMessageIdx(idx);
                            setEditInput(msg.content);
                          }}
                          className={`flex items-center gap-1 text-[11px] px-1 py-0.5 rounded-md transition-colors ${theme === "dark" ? "text-gray-400 hover:text-white hover:bg-[#545454]" : "text-gray-500 hover:text-gray-900 hover:bg-[#F0EDE8]"}`}
                          title="Edit message"
                        >
                          <Edit2 className="w-3 h-3 shrink-0" /> Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Avatar User */}
                {msg.role === "user" && (
                  <div
                    className={`hidden md:flex w-8 h-8 rounded-full shrink-0 items-center justify-center ${theme === "dark" ? "bg-[#7D7D7D]" : "bg-[#252525]"}`}
                  >
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))
          )}

          <div ref={messagesEndRef} className="h-1 md:h-4" />
        </div>

        {/* Input Dock */}
        <div className={`relative px-3 md:px-5 md:pb-2 pt-0 mt-2 ${isKeyboardOpen ? 'pb-0' : 'pb-0'}`}>
          {apiError && (
            <div className={`max-w-3xl mx-auto mb-3 p-3 rounded-xl flex items-center justify-between border animate-in fade-in slide-in-from-bottom-2 ${theme === "dark" ? "bg-red-500/10 border-red-500/50 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
              <div className="flex items-center gap-2 text-sm">
                <Bot className="w-4 h-4 shrink-0" />
                <span>{apiError}</span>
              </div>
              <button 
                onClick={() => setApiError(null)}
                className="p-1 hover:bg-black/5 rounded-full transition-colors"
                title="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {/* Scroll To Bottom Button */}
          {showScrollDown && (
            <div className="absolute bottom-full left-0 right-0 flex justify-center pb-3 z-20">
              <button
                onClick={() => {
                  if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTo({
                      top: chatContainerRef.current.scrollHeight,
                      behavior: "smooth",
                    });
                  }
                }}
                className={`p-1.5 rounded-full shadow-md border transition-all duration-300 transform scale-100 hover:scale-105 active:scale-95 ${theme === "dark" ? "bg-[#545454] border-[#7D7D7D] text-white hover:bg-[#7D7D7D]" : "bg-white border-[#E8E5E0] text-gray-700 hover:bg-[#F0EDE8]"}`}
                title="Scroll to bottom"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            {/* Separate Attachment Button */}
            <button
              className={`h-[52px] w-[52px] rounded-xl flex items-center justify-center shrink-0 transition-colors border ${theme === "dark" ? "bg-[#252525] border-[#545454] text-gray-300 hover:bg-[#545454] hover:text-white" : "bg-white border-[#E8E5E0] text-gray-600 hover:bg-[#F0EDE8] hover:text-gray-900"}`}
            >
              <Paperclip className="w-5 h-5 shrink-0" />
            </button>

            {/* Input Wrapper */}
            <div
              className={`flex-1 relative rounded-xl flex items-end p-1.5 border transition-colors duration-300 ease-in-out ${theme === "dark"
                ? "bg-[#252525] border-[#545454] focus-within:border-[#7D7D7D]"
                : "bg-white border-[#E8E5E0] focus-within:border-[#7D7D7D] focus-within:shadow-sm"
                }`}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!isLoading) {
                      e.currentTarget.blur();
                      handleSend();
                    }
                  }
                }}
                placeholder="Ask Avyx AI anything..."
                className="flex-1 max-h-48 min-h-[40px] bg-transparent border-0 focus:ring-0 resize-none px-3 py-2 text-[14px] outline-none custom-scrollbar"
                rows={1}
              />

              <button
                onClick={toggleDictation}
                title="Dictate"
                className={`p-2.5 rounded-lg mb-0.5 transition-colors ${isDictating ? "text-red-500 animate-pulse" : theme === "dark" ? "text-gray-400 hover:text-white hover:bg-[#545454]" : "text-gray-500 hover:text-gray-800 hover:bg-[#F0EDE8]"}`}
              >
                <Mic className="w-5 h-5" />
              </button>

              {isActuallySending ? (
                <button
                  onClick={() => {
                    if (abortControllerRef.current) {
                      abortControllerRef.current.abort();
                      setIsLoading(false);
                      setIsActuallySending(false);
                      isSendingRef.current = false;
                    }
                  }}
                  className={`p-2.5 rounded-lg mb-0.5 ml-1 transition-all duration-200 active:scale-95 ${theme === "dark" ? "bg-[#545454] text-white hover:bg-[#7D7D7D]" : "bg-[#F0EDE8] text-gray-700 hover:bg-[#D1D1D1]"}`}
                  title="Stop generating"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  className={`p-2.5 rounded-lg mb-0.5 ml-1 transition-all duration-200 disabled:opacity-40 disabled:scale-100 active:scale-95 ${theme === "dark"
                    ? "bg-white text-[#252525] hover:bg-white/90"
                    : "bg-[#252525] text-white hover:bg-[#545454]"
                    }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <p className="text-center text-xs opacity-50 mt-1.5 hidden md:block">
            Avyx AI can make mistakes. Consider verifying critical
            information.
          </p>
        </div>
      </div>
      {/* ── Share Modal ── */}
      {shareUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => { setShareUrl(null); setSharedLinkCopied(null); }}
          />
          <div className={`relative w-full max-w-sm rounded-2xl shadow-2xl p-6 border transform transition-all animate-in zoom-in-95 fade-in duration-200 ${theme === 'dark' ? 'bg-[#1A1A1A] border-[#333]' : 'bg-white border-[#EEE]'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider opacity-60">Share Link</h3>
              <button 
                onClick={() => { setShareUrl(null); setSharedLinkCopied(null); }}
                className={`p-1.5 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-[#333] text-gray-400' : 'hover:bg-[#F5F3EF] text-gray-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[10px] opacity-60 mb-3">Anyone with this link can view the conversation snapshot.</p>

            <div className={`p-1.5 rounded-xl border flex items-center gap-2 mb-4 group ${theme === 'dark' ? 'bg-[#252525] border-[#444]' : 'bg-[#FAFAFA] border-[#DDD]'}`}>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs truncate px-2 opacity-80 select-all">{shareUrl}</p>
              </div>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(shareUrl);
                  setSharedLinkCopied("modal");
                  setTimeout(() => setSharedLinkCopied(null), 2000);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all shrink-0 ${
                  sharedLinkCopied === "modal"
                    ? "bg-green-500 text-white"
                    : theme === 'dark' ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#252525] text-white hover:bg-[#444]'
                }`}
              >
                {sharedLinkCopied === "modal" ? <Check size={12} /> : <Copy size={12} />}
                {sharedLinkCopied === "modal" ? "Copied" : "Copy"}
              </button>
            </div>

            <p className="text-[10px] text-center opacity-40 italic">Note: Only people you share the link with can see the chat.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AiPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex flex-col items-center justify-center bg-transparent dark:bg-[#1A1A1A]">
          <div className="spinner-elegant text-gray-400"></div>
        </div>
      }
    >
      <AiChatCore />
    </Suspense>
  );
}
