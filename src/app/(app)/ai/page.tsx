"use client";

import { useState, useEffect, useLayoutEffect, useRef, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/contexts/SidebarContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useToast } from "@/contexts/ToastContext";
import {
  Send,
  Loader2,
  Plus,
  MessageCircle,
  Bot,
  User,
  Users,
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
  History as HistoryIcon,
  ChevronsLeft,
  Search,
  Clock,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useAppDialog } from "@/components/ui/AppDialog";
import { ImportersModal } from "@/components/modals/ImportersModal";
import { formatDistanceToNow } from "date-fns";
import { useStudyTracker } from "@/hooks/useStudyTracker";
import { useSession } from "next-auth/react";
import useSWR, { useSWRConfig } from "swr";
import { Skeleton } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/utils/image";
import { motion, AnimatePresence } from "framer-motion";

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

export interface Message {
  id?: string;
  role: "user" | "model" | "assistant";
  content: string;
  image?: string; // Base64 image data for Vision
  created_at?: string;
  isThinking?: boolean;
  type?: "text" | "vision";
  isError?: boolean;
}

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  is_pinned?: boolean;
  is_archived?: boolean;
  share_links?: { id: string }[];
};

function AiChatCore() {
  const router = useRouter();
  const dialog = useAppDialog();
  const params = useParams();
  const searchParams = useSearchParams();
  // Works for both /ai/[id] and /ai/archive/[id] — both have params.id
  const urlChatId = params?.id as string | undefined;
  // Initialize directly from URL so first render has the right chat
  const { theme } = useTheme();
  const { open: isMainSidebarOpen, toggle: toggleMainSidebar } = useSidebar();
  const { mutate: globalMutate } = useSWRConfig();
  const { show } = useToast();

  useStudyTracker({ activityType: 'ai_teacher', isEnabled: true });

  const [activeChatId, setActiveChatId] = useState<string | null>(urlChatId || null);

  // Sync activeChatId with URL params when they change
  useEffect(() => {
    if (isInternalNavRef.current) {
      isInternalNavRef.current = false;
      return;
    }
    setActiveChatId(urlChatId || null);
  }, [urlChatId]);

  // Read the dashboard query SYNCHRONOUSLY on first render so we can
  // pre-populate the UI without waiting for effects — no flicker.
  const getInitialDashboardQuery = () => {
    if (typeof window === 'undefined') return null;
    const q = sessionStorage.getItem('ai_dashboard_query');
    if (!q) return null;
    // Only consume it if we are on the /ai route (no existing chat ID)
    if (!urlChatId) return q;
    return null;
  };
  const initialDashboardQuery = getInitialDashboardQuery();

  const [messages, setMessages] = useState<Message[]>(() => {
    // If a dashboard query exists, immediately show the user bubble + thinking
    // indicator so the screen is never empty on first paint.
    if (initialDashboardQuery) {
      return [
        { role: 'user', content: initialDashboardQuery },
        { role: 'model', content: '', isThinking: true },
      ];
    }
    return [];
  });
  const [input, setInput] = useState(() => initialDashboardQuery ? '' : '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isHistoryInitialized, setIsHistoryInitialized] = useState(false);

  // Sync sidebar state with global AppShell to hide drag handle
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ai-sidebar-state', { detail: { isOpen: isSidebarOpen } }));
  }, [isSidebarOpen]);

  const { data: session, status } = useSession();
  const { data: sessionData, mutate: mutateSessions, error: sessionError, isLoading: isHistoryLoading } = useSWR(
    status === "authenticated" ? `/api/chat/history?all=true` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000, // 10 seconds deduping
    }
  );

  const { data: messagesData, mutate: mutateMessages, isLoading: isMessagesLoading } = useSWR(
    status === "authenticated" && activeChatId && !activeChatId.startsWith("temp-") && activeChatId !== "temp-chat"
      ? `/api/chat/${activeChatId}/messages`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const { data: subscription, mutate: mutateSubscription } = useSWR(
    status === "authenticated" ? "/api/user/subscription" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const usage = subscription?.usage;




  // Initial load for history sidebar
  useEffect(() => {
    const saved = localStorage.getItem("ai_history_open");
    if (saved !== null) {
      setIsHistoryOpen(saved === "true");
    }
    setIsHistoryInitialized(true);
  }, []);

  // Save on change for history sidebar
  useEffect(() => {
    if (isHistoryInitialized) {
      localStorage.setItem("ai_history_open", isHistoryOpen.toString());
    }
  }, [isHistoryOpen, isHistoryInitialized]);

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

  // Reset ratings when switching chats to prevent state leakage between sessions
  useEffect(() => {
    setRatings({});
  }, [activeChatId]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isActuallySending, setIsActuallySending] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [generatingChatIds, setGeneratingChatIds] = useState<Set<string>>(new Set());
  const [sharingChatId, setSharingChatId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharedLinkCopied, setSharedLinkCopied] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [chatDrafts, setChatDrafts] = useState<Record<string, { text: string; image: string | null }>>({});
  const [importerModalData, setImporterModalData] = useState<{ id: string } | null>(null);

  const isChatExhausted = !!usage && usage.chat?.limit !== Infinity && (usage.chat?.remaining || 0) <= 0;
  const isVisionExhausted = !!usage && usage.vision?.limit !== Infinity && (usage.vision?.remaining || 0) <= 0;
  const isQuotaReached = !!(isChatExhausted || (selectedImage && isVisionExhausted));

  // Dynamic Thinking Messages
  const thinkingMessages = [
    "Thinking...",
    "Analyzing your context...",
    "Extracting key information...",
    "Synthesizing an answer...",
    "Applying advanced reasoning...",
    "Reviewing relevant topics...",
    "Generating a detailed response...",
    "Formulating helpful points..."
  ];
  const visionMessages = [
    "Scanning image details...",
    "Analyzing visual layout...",
    "Extracting diagrams & text...",
    "Processing handwriting data...",
    "Interpreting context from visuals...",
    "Structuring image data...",
    "Analyzing visual instructions..."
  ];
  const [thinkingIdx, setThinkingIdx] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setThinkingIdx(0);
      interval = setInterval(() => {
        setThinkingIdx((prev) => (prev + 1) % thinkingMessages.length);
      }, 3500); // Slowed down to 3.5s for better readability and a more 'premium' deliberate feel
    }
    return () => clearInterval(interval);
  }, [isLoading, thinkingMessages.length]);

  const activeStreamingTextRef = useRef<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isSendingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobileApp, setIsMobileApp] = useState(false);

  // Laptop-only: Always keep input active when not loading
  useEffect(() => {
    if (!isLoading && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      inputRef.current?.focus();
    }
  }, [isLoading]);
  const currentChatIdRef = useRef<string | null>(activeChatId);
  const isInternalNavRef = useRef(false);
  const [editImage, setEditImage] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Handle loading and processing of messages for the active chat
  useEffect(() => {
    // CRITICAL: If we are currently sending or streaming, do NOT let SWR overwrite local state.
    // This prevents the flickering and message disappearance during initial generation.
    if (isSendingRef.current || isLoading || isActuallySending) return;

    if (activeChatId && messagesData?.messages) {
      const processedMessages = messagesData.messages.map((msg: Message) => {
        // Robust check for JSON content (all edited messages with images/structured text)
        if (msg.role === "user" && msg.content?.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(msg.content);
            return {
              ...msg,
              content: parsed.text || parsed.content || msg.content,
              image: parsed.image || msg.image
            };
          } catch (e) {
            return msg;
          }
        }
        // Detect saved error messages
        const hasErrorMarker = msg.role === "model" && msg.content?.includes('[ERROR]:');
        if (hasErrorMarker) {
          return {
            ...msg,
            content: msg.content.replace('[ERROR]:', '').trim(),
            isError: true
          };
        }
        return msg;
      });
      setMessages(processedMessages);
    } else if (!activeChatId || activeChatId === "temp-chat") {
      // Don't clear messages if it's a new/temp chat OR if a redirect is pending
      if (!activeChatId && !pendingQueryRef.current) setMessages([]);
    }
  }, [activeChatId, messagesData, isLoading, isActuallySending]);



  // No URL sync needed — activeChatId is initialized from urlChatId above
  // switchChat uses window.history.pushState to update URL without remounting

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

  // Laptop-only: Always keep input active
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      inputRef.current?.focus();
    }
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

  // Auto-resize input textarea as user types (ChatGPT style)
  useEffect(() => {
    if (inputRef.current) {
      // Reset height to auto to get the correct scrollHeight
      inputRef.current.style.height = 'auto';
      // Set height based on scrollHeight, but cap at the max-height defined in CSS (120px)
      const newHeight = Math.min(inputRef.current.scrollHeight, 120);
      inputRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      dialog.showAlert("Speech recognition is not supported in this browser.", "warning");
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

  // Auto-expand Archived section if current chat is archived
  useEffect(() => {
    if (activeChatId && sessions.length > 0) {
      const isActiveArchived = sessions.some(s => s.id === activeChatId && s.is_archived);
      if (isActiveArchived) {
        setIsArchivedExpanded(true);
      }
    }
  }, [activeChatId, sessions]);

  // 1. Track the pending query. On mount, consume from sessionStorage first
  //    (placed before the ?q= URL param so it's already cleared by effect time).
  const pendingQueryRef = useRef<string | null>(
    // Consume the sessionStorage query synchronously on the very first JS execution
    // so that the URL-based effects below don't double-fire.
    (() => {
      if (typeof window === 'undefined') return null;
      const q = sessionStorage.getItem('ai_dashboard_query');
      if (q && !urlChatId) {
        sessionStorage.removeItem('ai_dashboard_query');
        return q;
      }
      return null;
    })()
  );

  // 2. Also capture ?q= from URL params (fallback for SSR / direct link)
  useEffect(() => {
    const query = searchParams.get("q");
    if (query && !pendingQueryRef.current) {
      pendingQueryRef.current = query;
      // Clear any existing state only if we're not already handling the query
      if (activeChatId) {
        setActiveChatId(null);
        setInput("");
        setSelectedImage(null);
      }
    }
  }, [searchParams]);

  // 3. Fire the send as soon as possible — do NOT wait for subscription to be
  //    defined. Quota is checked inside handleSend itself (isQuotaReached guard).
  //    We only need isSendingRef to be false to avoid duplicate sends.
  useEffect(() => {
    if (!pendingQueryRef.current || isSendingRef.current) return;
    // If we pre-populated messages on first render, we're ready immediately.
    // Otherwise wait until we're in a clean new-chat state.
    const hasOptimisticMessages =
      messages.length === 2 &&
      messages[0]?.role === 'user' &&
      messages[1]?.isThinking === true;
    const isCleanState = activeChatId === null;
    if (!isCleanState && !hasOptimisticMessages) return;

    const query = pendingQueryRef.current;
    pendingQueryRef.current = null;

    // Clear the ?q= from the URL so reloads don't re-fire
    if (typeof window !== 'undefined' && window.location.search.includes('q=')) {
      window.history.replaceState(null, '', '/ai');
    }

    // If we already pre-populated with optimistic messages, send immediately.
    // Otherwise set input and send after a micro-delay.
    if (hasOptimisticMessages) {
      handleSend(query);
    } else {
      setInput(query);
      const timer = setTimeout(() => handleSend(query), 50);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, messages.length]);

  // 3. Ensure history loads and we have a clean state for the new chat
  useEffect(() => {
    if (!historyLoaded) return;

    // Auto-create new chat if no ID is present and no query is pending
    const hasImport = !!localStorage.getItem("import_shared_chat");
    if (!activeChatId && !hasImport && !pendingQueryRef.current) {
      startNewChat();
    }
  }, [historyLoaded, activeChatId]);

  const prevChatIdRef = useRef(activeChatId);

  // Scroll to bottom whenever messages change or chat is switched
  // Using useLayoutEffect to perform instant jumps BEFORE the browser paints the new messages
  useLayoutEffect(() => {
    if (!chatContainerRef.current) return;

    const isSwitchingChat = prevChatIdRef.current !== activeChatId;

    if (isSwitchingChat) {
      prevChatIdRef.current = activeChatId;
      setAtBottom(true);
      // Instant jump on switch
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      return;
    }

    if (atBottom || isActuallySending) {
      // During active generation or if we were already at the bottom, follow the text
      // We do this instantly in useLayoutEffect to prevent any 'jumpy' frames
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, activeChatId, atBottom, isActuallySending, isLoading]);


  const startNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setInput("");
    setSelectedImage(null);
    router.push("/ai", { scroll: false });
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const toggleTemporaryChat = () => {
    if (activeChatId === "temp-chat") {
      startNewChat();
    } else {
      setActiveChatId("temp-chat");
      setMessages([]);
      window.history.pushState(null, '', `/ai/temp-chat`);
    }
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const switchChat = (chatId: string, isArchived = false, shouldClose: boolean | any = true) => {
    // 1. Save the draft of the current chat before switching
    if (activeChatId) {
      setChatDrafts(prev => ({
        ...prev,
        [activeChatId]: { text: input, image: selectedImage }
      }));
    }

    // 2. Switch the active chat
    if (chatId !== activeChatId) {
      isInternalNavRef.current = true;
      setActiveChatId(chatId);
      setMessages([]); // Clear current messages while new ones load
    }

    // 3. Load the draft for the new chat
    const draft = chatDrafts[chatId];
    setInput(draft?.text || "");
    setSelectedImage(draft?.image || null);

    const path = isArchived ? `/ai/archive/${chatId}` : `/ai/${chatId}`;
    window.history.pushState(null, '', path);
    const actuallyClose = typeof shouldClose === 'boolean' ? shouldClose : true;
    if (window.innerWidth < 768 && actuallyClose) setIsSidebarOpen(false);
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

  const openPricing = () => {
    window.dispatchEvent(new CustomEvent("open-pricing"));
  };

  const handleSend = async (
    overrideText?: string,
    cutHistoryAtIndex?: number,
  ) => {
    if (isSendingRef.current) return;
    setApiError(null);

    let chatIdOfRequest = activeChatId;
    const textToSend = overrideText || input;
    const currentImage = overrideText !== undefined ? editImage : selectedImage;

    // Allow sending if there is either text OR an image
    if ((!textToSend.trim() && !currentImage)) return;

    if (status !== "authenticated") return;

    isSendingRef.current = true;
    const newMsg: Message = {
      id: cutHistoryAtIndex !== undefined ? messages[cutHistoryAtIndex].id : undefined,
      role: "user",
      content: textToSend,
      image: currentImage || undefined // Pass the image data for the UI
    };

    // If an edit occurred, slice the history up to the edited message
    let previousMessages =
      cutHistoryAtIndex !== undefined
        ? messages.slice(0, cutHistoryAtIndex)
        : messages;

    const hasOptimisticPrepopulation =
      previousMessages.length === 2 &&
      previousMessages[0].role === "user" &&
      previousMessages[0].content === textToSend &&
      previousMessages[1].isThinking === true &&
      !activeChatId;

    if (hasOptimisticPrepopulation) {
      previousMessages = [];
    }

    // --- Resilient Quota Guard ---
    if (isQuotaReached) {
      const errorMsg = "Daily AI quota reached. Please upgrade or try again tomorrow.";
      setApiError(errorMsg);
      setMessages([...previousMessages, newMsg, { role: "model", content: errorMsg, isError: true }]);
      setInput("");
      setSelectedImage(null);
      setEditImage(null);
      setEditingMessageIdx(null);
      isSendingRef.current = false;
      return;
    }

    // Optimistic UI Update for internal messages
    const thinkingMsg: Message = { role: "model", content: "", isThinking: true, type: currentImage ? "vision" : "text" };
    if (!hasOptimisticPrepopulation) {
      setMessages([...previousMessages, newMsg, thinkingMsg]);
    }
    setInput("");
    setSelectedImage(null); // Clear image after sending
    setEditImage(null); // Clear edit image
    setEditingMessageIdx(null);
    setIsLoading(true);
    setIsActuallySending(true);
    if (chatIdOfRequest) {
      const id = chatIdOfRequest;
      setGeneratingChatIds(prev => new Set(prev).add(id));
    }

    // Laptop-only: Always keep input active after sending
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      inputRef.current?.focus();
    } else if (typeof window !== 'undefined' && window.innerWidth < 768) {
      // Explicitly blur the input on mobile to hide the keyboard after sending
      inputRef.current?.blur();
      // Also blur any active document elements
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }

    // A small intentional delay (1500ms) to ensure the thinking phase has a meaningful 'presence' in the UI
    // and looks more deliberate, as requested.
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Move this chat to the top within SWR sessions list
    mutateSessions((currentData: { chats: ChatSession[] } | undefined) => {
      if (!currentData || !currentData.chats) return currentData;
      const current = currentData.chats.find((s: ChatSession) => s.id === chatIdOfRequest);
      if (!current) return currentData;

      const updatedCurrent = {
        ...current,
      };
      const others = currentData.chats.filter((s: ChatSession) => s.id !== chatIdOfRequest);

      return { ...currentData, chats: [updatedCurrent, ...others] };
    }, { revalidate: false });

    // Also update the message cache optimistically if we have a real chat ID
    if (chatIdOfRequest && !chatIdOfRequest.startsWith('temp-') && chatIdOfRequest !== 'temp-chat') {
      mutateMessages((current: { messages: Message[] } | undefined) => {
        const updatedMessages = cutHistoryAtIndex !== undefined
          ? [...previousMessages, newMsg, thinkingMsg]
          : [...(current?.messages || []), newMsg, thinkingMsg];
        return { ...current, messages: updatedMessages };
      }, { revalidate: false });
    }

    let aiResponseText = "";
    let topicTitle: string | null = null;

    try {
      // 1. Create chat session if it doesn't exist yet (draft mode)
      // Only create if we DON'T have a chat ID. If it's "temp-chat", we keep it ephemeral.
      if (!chatIdOfRequest) {
        const res = await fetch("/api/chat/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: textToSend.slice(0, 40) }),
        });
        const data = await res.json();
        if (data.chat) {
          chatIdOfRequest = data.chat.id;

          // Pre-populate the message cache for the new ID immediately
          // so SWR doesn't start with an empty or loading state when we switch IDs
          const optimisticMessages = [...previousMessages, newMsg, thinkingMsg];
          globalMutate(`/api/chat/${chatIdOfRequest}/messages`,
            { messages: optimisticMessages },
            { revalidate: false }
          );

          isInternalNavRef.current = true;
          setActiveChatId(chatIdOfRequest);
          window.history.replaceState(null, '', `/ai/${chatIdOfRequest}`);

          // Optimistically update the sessions (sidebar) list
          mutateSessions((currentData: { chats: ChatSession[] } | undefined) => {
            const existingChats = currentData?.chats || [];
            // Add the new chat from backend to the top of the list
            return {
              ...(currentData || {}),
              chats: [data.chat, ...existingChats]
            };
          }, { revalidate: false });

          // Add to generating set with the new ID
          setGeneratingChatIds(prev => {
            const next = new Set(prev);
            if (chatIdOfRequest) next.add(chatIdOfRequest);
            return next;
          });
        } else {
          throw new Error("Failed to create chat session");
        }
      }

      // If this was an edit, delete all messages AT or AFTER the current edit index in the database
      if (cutHistoryAtIndex !== undefined && chatIdOfRequest !== "temp-chat") {
        const lastOriginalMsg = messages[cutHistoryAtIndex];
        if (lastOriginalMsg?.created_at || lastOriginalMsg?.id) {
          const params = new URLSearchParams({ chatId: chatIdOfRequest as string });
          if (lastOriginalMsg.created_at) params.set("after", lastOriginalMsg.created_at);
          if (lastOriginalMsg.id) params.set("messageId", lastOriginalMsg.id);

          // Use 'await' to ensure removal before saving new message versions
          await fetch(`/api/chat/message?${params.toString()}`, {
            method: "DELETE",
          }).catch(err => console.error("Failed to clear history:", err));
        }
      }

      // Endpoint logic: If it was an edit with NO NEW IMAGE but the PREVIOUS msg had one, it still needs vision
      const isVision = !!currentImage;
      const endpoint = isVision ? "/api/chat/vision" : "/api/chat";

      // Filter out error messages from history so they don't 'poison' the context
      const filteredHistory = previousMessages.filter(m =>
        !m.isError &&
        !(m.role === "model" && m.content?.includes('[ERROR]:'))
      );

      const payload = {
        chatId: chatIdOfRequest,
        messages: [...filteredHistory, newMsg], // send clean history context
        image: currentImage || null,
      };

      abortControllerRef.current = new AbortController();

      const res = await fetch(endpoint, {
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

      // Replace thinking message with empty model message for streaming
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "model" && last.isThinking) {
          return [...prev.slice(0, -1), { role: "model", content: "" }];
        }
        return [...prev, { role: "model", content: "" }];
      });

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
              if (chatIdOfRequest) activeStreamingTextRef.current[chatIdOfRequest] = aiResponseText;

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

      // Refresh subscription usage data after a successful message
      mutateSubscription();

      // Update sidebar session explicitly at the end and move it to the top in SWR
      // Also clear any drafts for this chat since message is now sent
      setChatDrafts(prev => {
        const updated = { ...prev };
        if (chatIdOfRequest) delete updated[chatIdOfRequest];
        return updated;
      });

      mutateSessions((currentData: { chats: ChatSession[] } | undefined) => {
        if (!currentData || !currentData.chats) return currentData;
        const updatedChat = currentData.chats.find((s: ChatSession) => s.id === chatIdOfRequest);
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

        const others = currentData.chats.filter((s: ChatSession) => s.id !== chatIdOfRequest);
        return { ...currentData, chats: [updated, ...others] };
      }, false);

      // --- NEW: Update messages cache with final content ---
      if (chatIdOfRequest && !chatIdOfRequest.startsWith('temp-') && chatIdOfRequest !== 'temp-chat') {
        mutateMessages((current: any) => {
          if (!current || !current.messages) return current;
          const updatedMsgs = [...current.messages];
          if (updatedMsgs.length > 0) {
            // Find the last message and replace it if it was a thinking msg
            const lastIdx = updatedMsgs.length - 1;
            updatedMsgs[lastIdx] = {
              ...updatedMsgs[lastIdx],
              content: aiResponseText,
              isThinking: false,
              role: "model"
            };
          }
          return { ...current, messages: updatedMsgs };
        }, { revalidate: false });
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("User aborted the generation");

        // --- KEY: Ensure the partial message is saved to DB so it doesn't continue on refresh ---
        if (aiResponseText.trim().length > 0 && chatIdOfRequest !== "temp-chat") {
          try {
            await supabase.from("messages").insert({
              chat_id: chatIdOfRequest,
              user_id: session.user!.email, // this works for identifying the project user usually
              role: "model",
              content: aiResponseText,
              email: session.user!.email,
            });
          } catch (e) {
            console.error("Failed to save partial message on abort:", e);
          }
        }

        // Optimistically update the SWR cache with the partial response so it survives chat switching
        if (aiResponseText.trim().length > 0) {
          mutateSessions((currentData: { chats: ChatSession[] } | undefined) => {
            if (!currentData || !currentData.chats) return currentData;
            const updatedChat = currentData.chats.find((s: ChatSession) => s.id === chatIdOfRequest);
            if (!updatedChat) return currentData;

            const updated: ChatSession = {
              ...updatedChat,
              messages: [
                ...previousMessages,
                newMsg,
                { role: "model" as const, content: aiResponseText },
              ],
            };

            const others = currentData.chats.filter((s: ChatSession) => s.id !== chatIdOfRequest);
            return { ...currentData, chats: [updated, ...others] };
          }, false);

          // Save the partial message to the database
          if (chatIdOfRequest !== "temp-chat") {
            fetch("/api/chat/message", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chatId: chatIdOfRequest,
                role: "model",
                content: aiResponseText,
              }),
            }).catch((e) => console.error("Failed to save partial message", e));
          }
        }
      } else {
        const currentErrorCount = messages.filter(m => m.isError).length + 1;
        let errorMsg = error.message;

        // --- NEW: Distinguish Quota vs Technical ---
        if (errorMsg === "Daily AI quota reached. Please upgrade or try again tomorrow.") {
          // Keep the message as is
        } else {
          // Replace technical/unknown errors with the standardized "Try again later" message
          errorMsg = "An AI technical problem occurred. Please try again later.";
        }

        // If this is the 3rd+ technical error, give help advice
        if (currentErrorCount >= 3 && !errorMsg.includes("quota")) {
          errorMsg = "This chat is having repeated connection issues. If retrying doesn't work, we recommend starting a fresh chat to clear any broken history.";
        }

        // Mark the last message as an error if it was a thinking message
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "model" && (last.isThinking || last.content === "")) {
            return [
              ...prev.slice(0, -1),
              { role: "model", content: errorMsg, isError: true }
            ];
          }
          return prev;
        });

        // Only save the ERROR model message to DB — NOT the user message again
        // (The backend already saved the user message before streaming started)
        if (chatIdOfRequest !== "temp-chat" && chatIdOfRequest) {
          fetch("/api/chat/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId: chatIdOfRequest,
              role: "model",
              content: `[ERROR]: ${errorMsg}`,
            }),
          }).catch((e) => console.error("Failed to save error state to history", e));
          // NOTE: Do NOT call mutateSessions() here — it would re-sync from DB
          // showing the user message twice since the backend already saved it.
        }
      }
    } finally {
      setIsLoading(false);
      setIsActuallySending(false);
      isSendingRef.current = false;

      // Background revalidation: update SWR cache but DON'T let it overwrite
      // local state mid-render. We capture the current messages snapshot here
      // so SWR hydrates with it until the DB response arrives, preventing flash.
      if (chatIdOfRequest && !chatIdOfRequest.startsWith('temp-') && chatIdOfRequest !== 'temp-chat') {
        // Pass optimistic data so SWR never briefly shows an empty/stale state
        mutateMessages(undefined, { revalidate: true, optimisticData: (current: any) => current });
      }

      if (chatIdOfRequest) {
        setGeneratingChatIds((prev) => {
          const next = new Set(prev);
          next.delete(chatIdOfRequest as string);
          return next;
        });
        delete activeStreamingTextRef.current[chatIdOfRequest];
      }
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

      if (activeChatId === chatId) {
        if (newStatus) {
          // Archiving the active chat → switch to another chat
          const nextChat = sessions.find(
            (s) => s.id !== chatId && !s.is_archived,
          );
          if (nextChat) switchChat(nextChat.id, false);
          else startNewChat();
        } else {
          // Unarchiving the active chat → update URL to non-archive path
          window.history.replaceState(null, '', `/ai/${chatId}`);
        }
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

  const handleDelete = async (chatId: string, chatTitle?: string) => {
    const previousSessions = sessionData;
    // Action-First: Delete immediately and show undo toast
    try {
      setActiveMenuId(null);

      // Optimistically remove from history immediately
      mutateSessions(
        (current: any) => ({
          ...current,
          chats: (current?.chats || []).filter((s: any) => s.id !== chatId),
        }),
        false
      );

      const deletePromise = fetch(`/api/chat/history/${chatId}`, {
        method: "DELETE",
      }).then(res => {
        if (!res.ok) throw new Error("Failed to delete chat");
        return res;
      });
      
      show({
        message: "Moved to trash",
        type: "success",
        action: {
          label: "Undo",
          onClick: () => {
            // Instantly restore to UI exactly as it was
            mutateSessions(previousSessions, false);

            const performRestore = async () => {
              try {
                await deletePromise;
                const restoreRes = await fetch(`/api/trash/restore-by-item?item_id=${chatId}&type=chat`, {
                  method: "POST"
                });
                if (restoreRes.ok) {
                  mutateSessions();
                  globalMutate("/api/trash"); // Remove from trash bin
                }
              } catch (err) {
                console.error("Undo failed:", err);
              }
            };
            performRestore();
          }
        }
      });

      if (activeChatId === chatId) {
        const nextChat = sessions.find(
          (s) => s.id !== chatId && !s.is_archived,
        );
        if (nextChat) switchChat(nextChat.id);
        else startNewChat();
      }

      await deletePromise;
      globalMutate("/api/trash");
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
        mutateSessions();
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

    let importData: { title: string; messages: Message[]; original_shared_chat_id?: string } | null = null;
    try { importData = JSON.parse(raw); } catch { return; }
    if (!importData || !importData.messages?.length) return;

    const doImport = async () => {
      try {
        setIsImporting(true);
        // Create a new chat with the original title
        const res = await fetch("/api/chat/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: importData!.title || "Shared Chat",
            original_shared_chat_id: importData!.original_shared_chat_id
          }),
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
  const unpinnedChats = activeChats.filter((s) => !s.is_pinned);
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
      switchChat(session.id, !!session.is_archived);
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
        id={`session-item-${session.id}`}
        className={`group relative w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 ${activeChatId === session.id
          ? theme === "dark"
            ? "bg-[#545454] text-white"
            : "bg-[#F0EDE8] text-[#252525]"
          : theme === "dark"
            ? "text-gray-300 hover:bg-[#2A2A2A]"
            : "text-gray-600 hover:text-[#252525] hover:bg-[#F0EDE8]"
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
                <span className={`truncate text-sm font-medium text-left ${activeChatId === session.id ? "opacity-100" : "opacity-85"}`}>
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
            const x = e.clientX;
            const y = e.clientY;

            const menuHeight = 260;
            const openUp = y + menuHeight > window.innerHeight - 40;

            setMenuPosition({
              top: y,
              left: x - 10,
              openUp
            });
            setActiveMenuId(activeMenuId === session.id ? null : session.id);
          }}
          className={`block p-1 rounded-md transition-opacity shrink-0 ${activeMenuId === session.id ? "opacity-100" : "opacity-100 md:opacity-0 group-hover:opacity-100 md:group-hover:opacity-100"} ${theme === "dark" ? "hover:bg-[#7D7D7D]" : "hover:bg-[#F0EDE8]"
            }`}
        >
          <MoreHorizontal className="w-3.5 h-3.5 opacity-70" />
        </button>

      </div>
    );
  };

  return (
    <div
      className="flex h-full overflow-hidden transition-colors duration-300 ease-in-out bg-[#F5F3EF] dark:bg-[#1A1A1A] md:dark:bg-[#1F1F1F] text-[#252525] dark:text-white"
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
        className={`fixed inset-y-0 left-0 z-[100] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] md:p-0 md:top-0 md:bottom-auto md:relative md:z-50 w-64 md:h-full flex flex-col shrink-0 border-r shadow-xl md:shadow-none transition-all duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} ${isHistoryOpen ? "md:w-64 md:translate-x-0 md:opacity-100" : "md:w-0 md:opacity-0 md:-translate-x-full md:border-r-0 md:overflow-hidden"} ${theme === "dark"
          ? "bg-[#1A1A1A] border-[#2E2E2E]"
          : "bg-[#F5F3EF] border-[#7D7D7D]/40"
          } shadow-sm transition-colors`}
      >
        {/* ── Desktop History Sidebar Header ── */}
        <div className={`hidden md:flex items-center justify-between px-4 h-14 shrink-0 border-b ${theme === "dark" ? "border-[#2E2E2E]" : "border-[#7D7D7D]/40"}`}>
          <div className="flex items-center gap-3">
            {!isMainSidebarOpen && (
              <button
                onClick={toggleMainSidebar}
                className={`hidden md:flex items-center justify-center w-8 h-8 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 ${theme === "dark"
                  ? "bg-[#252525] border-[#545454] text-[#BABABA] hover:bg-[#545454] hover:text-white hover:border-[#545454]"
                  : "bg-white border-[#E8E5E0] text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525] hover:border-[#D1D1D1]"
                  }`}
                title="Toggle main menu"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            )}
            <span className="font-medium text-sm">Chat history</span>
          </div>
          <button
            onClick={() => setIsHistoryOpen(false)}
            className={`hidden md:flex items-center justify-center w-8 h-8 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 ${theme === "dark"
              ? "bg-[#252525] border-[#545454] text-[#BABABA] hover:bg-[#545454] hover:text-white hover:border-[#545454]"
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
        <div className={`p-3 pt-4 border-b shrink-0 ${theme === "dark" ? "border-[#2E2E2E]" : "border-[#E8E5E0]"}`}>
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
        <div
          onScroll={() => setActiveMenuId(null)}
          className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar"
        >
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
          {pinnedChats.length === 0 && unpinnedChats.length === 0 && !sessionError && !isHistoryLoading && (
            <div className="flex flex-col items-center justify-center mt-10 text-center opacity-80">
              <MessageCircle className="w-8 h-8 mb-3 opacity-30" />
              <p className={`text-sm font-medium ${theme === "dark" ? "text-[#BABABA]" : "text-gray-500"}`}>
                Nothing here
              </p>
              <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                Create a new chat
              </p>
            </div>
          )}

          {pinnedChats.map((session) => renderSessionItem(session))}
          {unpinnedChats.map((session) => renderSessionItem(session))}
        </div>

        {/* Archived Folder (Moved to bottom area) */}
        <div className={`px-3 py-[11.7px] border-t shrink-0 ${theme === "dark" ? "border-[#2E2E2E]" : "border-[#7D7D7D]/40"}`}>
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
            <div className="mt-1 pl-2 space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
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
                        : "text-gray-500 hover:text-[#252525] hover:bg-[#F0EDE8]"
                      }`}
                  >
                    <button
                      onClick={() => switchChat(session.id, true)}
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
                  ? "bg-[#252525] border-[#545454] text-[#BABABA] hover:bg-[#545454] hover:text-white hover:border-[#545454]"
                  : "bg-white border-[#7D7D7D]/40 text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525] hover:border-[#D1D1D1]"
                  }`}
                title="Open main menu"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border duration-200 font-medium text-sm ${theme === "dark" ? "border-[#545454] text-gray-300 hover:text-white hover:bg-[#545454] bg-[#252525]" : "bg-white border-[#7D7D7D]/40 text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525] hover:border-[#D1D1D1]"}`}
              title="Open history"
            >
              <HistoryIcon className="w-4 h-4" />
              <span>History</span>
            </button>
          </div>
        )}
        {/* Chat Bubbles Container */}
        <div
          ref={chatContainerRef}
          onScroll={() => {
            if (chatContainerRef.current) {
              const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
              // If within 100px of bottom, consider user 'at bottom' for auto-scroll
              const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
              setAtBottom(isNearBottom);
              setShowScrollDown(!isNearBottom);
            }
          }}
          className={`absolute inset-0 custom-scrollbar space-y-3 md:space-y-4 md:p-6 ${messages.length === 0
            ? "overflow-hidden"
            : "overflow-y-auto overflow-x-hidden pb-[50px] md:pb-[60px]"
            }`}
        >
          {/* Mobile Header Toggle - Always show so users can access the menu */}
          <div className="md:hidden shrink-0 sticky top-0 z-[60] flex items-center justify-between px-4 h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] bg-[#F5F3EF] dark:bg-[#1A1A1A] border-b border-[#7D7D7D]/40 dark:border-[#2E2E2E] shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
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
                  ? "bg-[#333] text-white hover:bg-[#444]"
                  : "bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-sm"
                : theme === "dark"
                  ? "text-gray-300 hover:bg-[#252525]"
                  : "text-[#545454] hover:bg-[#F0EDE8]"
                }`}
              title="Toggle Temporary Chat"
            >
              <Ghost className="w-5 h-5" />
            </button>
          </div>
          {/* Only show skeleton if explicitly loading OR if we have a real chat ID but local messages haven't synchronized yet */}
          {messages.length === 0 && activeChatId && activeChatId !== "temp-chat" && !isImporting ? (
            <div className="flex flex-col gap-10 px-4 md:px-0 max-w-4xl mx-auto w-full pt-10">
              {/* User Bubble Skeleton (Right aligned) */}
              <div className="flex justify-end transition-all duration-700 opacity-60">
                <div className="flex flex-col items-end gap-2 w-[70%] md:w-[35%]">
                  <Skeleton className="h-12 w-full rounded-2xl rounded-tr-none" />
                </div>
              </div>

              {/* AI Response Skeleton (Left aligned) */}
              <div className="flex justify-start transition-all duration-700">
                <div className="flex flex-col items-start gap-4 w-[90%] md:w-[70%]">
                  <div className="flex items-center gap-3">
                    <Skeleton variant="circle" className="h-8 w-8" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-3 w-full">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[95%]" />
                    <Skeleton className="h-4 w-[85%]" />
                    <Skeleton className="h-4 w-[60%]" />
                  </div>
                  <Skeleton className="h-40 w-full rounded-2xl opacity-40 mt-2" />
                </div>
              </div>

              {/* Second User Bubble (Faded) */}
              <div className="flex justify-end opacity-20 hidden md:flex">
                <div className="w-[20%]">
                  <Skeleton className="h-10 w-full rounded-2xl rounded-tr-none" />
                </div>
              </div>
            </div>
          ) : messages.length === 0 && (!activeChatId || activeChatId === "temp-chat" || isImporting) ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 w-full mb-12 sm:mb-12 pb-6">
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
                  <Ghost className="w-16 h-16 mb-4 text-gray-400 opacity-80" />
                  <h2 className="text-2xl font-bold mb-2">
                    Temporary Chat Mode
                  </h2>
                  <p className="max-w-md text-sm">
                    Messages here will not be saved to your history. How can I
                    help?
                  </p>
                </>
              ) : (
                <>
                  <img
                    src={theme === "dark" ? "/icon-dark.png" : "/icon-light.png"}
                    alt="AI Logo"
                    className="w-16 h-16 mb-4 object-contain"
                  />
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
                className={`group flex gap-3 md:gap-4 max-w-4xl min-w-0 mx-auto w-full px-3 md:px-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActiveMobileMessageIdx(
                    activeMobileMessageIdx === idx ? null : idx,
                  );
                }}
              >
                {/* Avatar Model */}
                {(msg.role === "model" || msg.role === "assistant") && (
                  <div
                    className="hidden md:flex w-10 h-10 mt-1 shrink-0 items-center justify-center"
                  >
                    <motion.img
                      src={theme === "dark" ? "/icon-dark.png" : "/icon-light.png"}
                      alt="AI"
                      className="w-9 h-9 object-contain"
                      animate={isLoading && idx === messages.length - 1 ? {
                        scale: [1, 1.1, 1],
                        opacity: [1, 0.6, 1],
                        filter: ["brightness(1)", "brightness(1.4)", "brightness(1)"]
                      } : {}}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </div>
                )}

                {/* Bubble Container */}
                <div
                  className={`relative flex flex-col gap-1 min-w-0 ${msg.role === "user" ? "items-end max-w-md" : "items-start w-full md:w-[calc(100%-48px)] max-w-full"}`}
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
                    className={`relative flex flex-col group max-w-full min-w-0 ${msg.role === "user" ? "items-end ml-auto" : "items-start mr-auto"}`}
                  >
                    {editingMessageIdx === idx ? (
                      <div
                        className={`relative px-4 py-2.5 text-[14px] md:text-[15px] rounded-2xl ${theme === "dark"
                          ? "bg-[#545454] text-white rounded-br-none"
                          : "bg-[#F0EDE8] text-gray-900 rounded-br-none"
                          }`}
                      >
                        <div className="flex flex-col gap-2 min-w-[200px] sm:min-w-[300px]">
                          <div className="flex items-end">
                            {/* Image Preview in Edit Mode - Controlled exclusively by editImage state */}
                            {editImage && (
                              <div className="mr-2 mb-1 shrink-0">
                                <div className="relative h-12 w-12 md:h-16 md:w-16 rounded-md md:rounded-lg overflow-hidden border border-black/10 dark:border-white/10 shadow-sm transition-transform hover:scale-[1.02]">
                                  <img
                                    src={editImage}
                                    alt="Edit material"
                                    className="h-full w-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/20 md:bg-black/40 md:opacity-0 md:hover:opacity-100 transition-opacity flex items-center justify-center rounded-md md:rounded-lg">
                                    <button
                                      onClick={() => editFileInputRef.current?.click()}
                                      className="p-1 md:p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
                                      title="Change image"
                                    >
                                      <Paperclip className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Corner Clear Button (Sleek Integrated Style) */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditImage(null);
                                    }}
                                    className="absolute top-0 right-0 p-0.5 md:p-1 bg-black/50 hover:bg-black/80 text-white rounded-bl-lg z-30 transition-colors"
                                    title="Remove image"
                                  >
                                    <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                  </button>
                                </div>
                              </div>
                            )}

                            <textarea
                              autoFocus
                              value={editInput}
                              onChange={(e) => setEditInput(e.target.value)}
                              className={`flex-1 bg-transparent border-0 focus:ring-0 resize-none outline-none custom-scrollbar p-0 m-0 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                              rows={Math.max(2, editInput.split("\n").length)}
                            />
                          </div>

                          {/* Hidden File Input for Editing */}
                          <input
                            type="file"
                            ref={editFileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressImage(file);
                                  setEditImage(compressed);
                                } catch (err) {
                                  console.error("Compression failed:", err);
                                  // Fallback to original behavior if compression fails
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setEditImage(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }
                            }}
                          />

                          <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                            <button
                              onClick={() => {
                                setEditingMessageIdx(null);
                                setEditImage(null);
                              }}
                              className={`px-3 py-1 text-xs rounded-lg transition-colors ${theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSend(editInput, idx)}
                              disabled={
                                (!editInput.trim() && !editImage && !msg.image) || (editInput === msg.content && editImage === null)
                              }
                              className={`px-3 py-1 text-xs rounded-lg font-medium transition-transform active:scale-95 ${theme === "dark" ? "bg-white text-black hover:bg-white/90 shadow-sm" : "bg-[#252525] text-white hover:bg-[#545454] shadow-md"}`}
                            >
                              Save & Resubmit
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        {/* 1. Large Image Bubble */}
                        {msg.role === "user" && msg.image && (
                          <div className={`rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-md transition-transform hover:scale-[1.01] bg-black/5 dark:bg-white/5 w-fit max-w-[280px] sm:max-w-md flex-shrink-0`}>
                            <img
                              src={msg.image}
                              alt="Study Material"
                              className="block w-full h-auto object-contain max-h-[320px] md:max-h-[500px] cursor-zoom-in"
                              onClick={() => setImagePreviewUrl(msg.image || null)}
                            />
                          </div>
                        )}

                        {/* 2. Text Content Bubble (Small Gap) */}
                        {(msg.content || msg.isThinking) && !msg.content?.trim().startsWith('{') && (
                          <div
                            style={{ overflowWrap: 'normal', wordBreak: 'normal' }}
                            className={msg.role === "user"
                              ? theme === "dark"
                                ? "w-fit max-w-full overflow-hidden bg-[#545454] text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed"
                                : "w-fit max-w-full overflow-hidden bg-[#F0EDE8] text-gray-900 rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed"
                              : theme === "dark"
                                ? "w-fit max-w-full overflow-hidden bg-[#252525] text-white border border-[#2E2E2E] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
                                : "w-fit max-w-full overflow-hidden bg-white text-[#252525] shadow-sm border border-[#7D7D7D]/40 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
                            }
                          >
                            {msg.role === "model" ? (
                              <>
                                {msg.isThinking ? (
                                  <div className="flex items-center py-1 px-0.5 min-w-[140px] animate-pulse">
                                    <span className="text-[13px] font-medium opacity-80">
                                      {msg.type === "vision"
                                        ? visionMessages[thinkingIdx % visionMessages.length]
                                        : thinkingMessages[thinkingIdx % thinkingMessages.length]}
                                    </span>
                                  </div>
                                ) : msg.isError ? (
                                  <div className="flex flex-col gap-2 py-1.5 transition-all duration-300">
                                    <span className="text-[13px] font-medium text-red-500 dark:text-red-400 max-w-[280px]">
                                      {msg.content}
                                    </span>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {/* Show Upgrade Button if it's a quota error */}
                                      {msg.content.includes("quota") && (
                                        <button
                                          onClick={() => openPricing()}
                                          className="px-3 py-1.5 rounded-lg bg-amber-500/10 backdrop-blur-md border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-[11px] font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                          Upgrade Plan
                                        </button>
                                      )}

                                      {/* Show "Start a fresh chat" button if we have multiple errors AND it's not a quota error */}
                                      {messages.filter(m => m.isError).length >= 3 && !msg.content.includes("quota") && (
                                        <button
                                          onClick={() => startNewChat()}
                                          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[11px] font-semibold w-fit border border-red-500/20 transition-all active:scale-95"
                                        >
                                          Start a fresh chat
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      h1: ({ ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                                      h2: ({ ...props }) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
                                      h3: ({ ...props }) => <h3 className="text-md font-bold mt-2 mb-1" {...props} />,
                                      p: ({ ...props }) => <div className="mb-2 last:mb-0" {...props} />,
                                      ul: ({ ...props }) => <ul className="list-disc ml-4 space-y-1 my-2" {...props} />,
                                      ol: ({ ...props }) => <ol className="list-decimal ml-4 space-y-1 my-2" {...props} />,
                                      li: ({ ...props }) => <li className="pl-1" {...props} />,
                                      a: ({ ...props }) => <a className="text-indigo-400 hover:underline font-semibold" {...props} />,
                                      strong: ({ ...props }) => <strong className="font-bold text-inherit" {...props} />,
                                      table: ({ ...props }) => (
                                        <div className="block w-full max-w-full overflow-x-auto mb-4 mt-2 border rounded-lg border-[#E8E5E0] dark:border-[#545454] custom-scrollbar">
                                          <table className="w-full text-sm text-left border-collapse min-w-max" {...props} />
                                        </div>
                                      ),
                                      thead: ({ ...props }) => (
                                        <thead className={theme === "dark" ? "bg-[#545454]" : "bg-[#F0EDE8]"} {...props} />
                                      ),
                                      tbody: ({ ...props }) => <tbody className="divide-y divide-gray-200 dark:divide-[#545454]" {...props} />,
                                      tr: ({ ...props }) => <tr className={`transition-colors shadow-sm ${theme === "dark" ? "hover:bg-[#252525]/50" : "hover:bg-gray-50"}`} {...props} />,
                                      th: ({ ...props }) => (
                                        <th className={`px-3 py-2 font-bold border-b ${theme === "dark" ? "border-[#252525]" : "border-[#E8E5E0]"}`} {...props} />
                                      ),
                                      td: ({ ...props }) => (
                                        <td className={`px-3 py-2 border-b ${theme === "dark" ? "border-[#252525]" : "border-[#E8E5E0]"}`} {...props} />
                                      ),
                                      pre: ({ children }) => <div className="not-prose">{children}</div>,
                                      code({ inline, className, children, ...props }: any) {
                                        const match = /language-(\w+)/.exec(className || "");
                                        const codeString = String(children).replace(/\n$/, "");
                                        if (inline) {
                                          return (
                                            <code className={`px-1 py-0.5 rounded font-mono text-[11px] ${theme === "dark" ? "bg-white/10 text-[#C2A27A]" : "bg-black/5 text-[#A2825A]"}`} {...props}>
                                              {children}
                                            </code>
                                          );
                                        }
                                        return (
                                          <div className="relative group/code mb-4 mt-3 block w-full max-w-full">
                                            <div className={`flex items-center justify-between px-4 py-2 text-[10px] font-sans rounded-t-xl ${theme === "dark" ? "bg-[#2A2A2A] text-gray-400 border border-b-0 border-[#545454]" : "bg-gray-800 text-gray-400 border border-b-0 border-gray-800"}`}>
                                              <span className="uppercase font-bold tracking-widest">{match?.[1] || "code"}</span>
                                              <button onClick={() => handleCopyCode(codeString)} className="flex items-center gap-1.5 hover:text-white transition-colors">
                                                {copiedCodeBlock === codeString ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                <span className="font-bold">{copiedCodeBlock === codeString ? "Copied" : "Copy"}</span>
                                              </button>
                                            </div>
                                            <div className={`block w-full overflow-x-auto text-[13px] rounded-b-xl custom-scrollbar ${theme === "dark" ? "bg-[#161514] border border-[#545454]" : "bg-[#1e1e1e] border border-gray-800 shadow-lg"}`}>
                                              <SyntaxHighlighter
                                                style={vscDarkPlus}
                                                language={match?.[1] || "text"}
                                                PreTag="div"
                                                customStyle={{ margin: 0, padding: "1.25rem", background: "transparent", fontSize: "13px", lineHeight: "1.6" }}
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
                                )}
                              </>
                            ) : (
                              <div className="whitespace-pre-wrap leading-relaxed break-words break-all sm:break-words max-w-full overflow-hidden">{msg.content}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons Beneath Bubble */}
                  {editingMessageIdx !== idx && !isLoading && (
                    <div
                      className={`transition-opacity flex items-center gap-1.5 mt-1 ${msg.role === "user" ? "justify-end pr-2 opacity-100 md:opacity-0 md:group-hover:opacity-100" : "justify-start pl-2 opacity-100"}`}
                    >
                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopy(msg.content, idx)}
                        className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md transition-colors ${theme === "dark" ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-500 hover:text-gray-900 hover:bg-black/5"}`}
                        title="Copy message"
                      >
                        {copiedMessageIdx === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            <span className="hidden md:inline text-green-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 shrink-0" />
                            <span className="hidden md:inline">Copy</span>
                          </>
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
                              setRatings((prev) => {
                                const next = { ...prev };
                                if (next[idx] === "good") {
                                  delete next[idx];
                                } else {
                                  next[idx] = "good";
                                }
                                return next;
                              })
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
                              setRatings((prev) => {
                                const next = { ...prev };
                                if (next[idx] === "bad") {
                                  delete next[idx];
                                } else {
                                  next[idx] = "bad";
                                }
                                return next;
                              })
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

                            // Robust extraction of text for editing, even if stored as JSON
                            let cleanText = msg.content;
                            if (msg.content?.trim().startsWith('{')) {
                              try {
                                const parsed = JSON.parse(msg.content);
                                cleanText = parsed.text || parsed.content || "";
                              } catch (e) {
                                // Fallback to raw content if parsing fails
                                cleanText = msg.content;
                              }
                            }

                            setEditInput(cleanText);
                            setEditImage(msg.image || null);
                          }}
                          className={`flex items-center gap-1 text-[11px] px-1 py-0.5 rounded-md transition-colors ${theme === "dark" ? "text-gray-400 hover:text-white hover:bg-[#545454]" : "text-gray-500 hover:text-gray-900 hover:bg-[#F0EDE8]"}`}
                          title="Edit message"
                        >
                          <Edit2 className="w-3 h-3 shrink-0" />
                          <span className="hidden md:inline">Edit</span>
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

          <div ref={messagesEndRef} className="h-10 md:h-12" />
        </div>

        {/* Input Dock */}
        <div className={`absolute bottom-0 left-0 w-full z-10 px-1 sm:px-5 pb-0.5 md:pb-0 text-left transition-all duration-300 ${theme === 'dark' ? 'bg-gradient-to-t from-[#161514] from-10% via-[#161514]/95 to-transparent' : 'bg-gradient-to-t from-[#F5F3EF] from-10% via-[#F5F3EF]/95 to-transparent'}`}>
          {apiError && (
            <div className="max-w-4xl mx-auto px-3 md:px-4 md:pl-16 mb-2">
              <div className={`w-full p-2.5 rounded-xl flex items-center justify-between border backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 ${theme === "dark" ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-red-50/80 border-red-200 text-red-600"}`}>
                <div className="flex items-center gap-2 text-sm">
                  <img
                    src={theme === "dark" ? "/icon-dark.png" : "/icon-light.png"}
                    alt="AI"
                    className="w-4 h-4 shrink-0 object-contain"
                  />
                  <span>{apiError}</span>
                  {apiError.includes("quota") && (
                    <button
                      onClick={() => openPricing()}
                      className={`ml-3 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 border ${theme === "dark" ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" : "bg-amber-500/10 border-amber-500/20 text-amber-700 hover:bg-amber-500/20"}`}
                    >
                      Upgrade Plan
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setApiError(null)}
                  className="p-1 hover:bg-black/5 rounded-full transition-colors"
                  title="Dismiss error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          <div className="max-w-4xl mx-auto relative px-3 md:px-4 md:pl-16">
            <AnimatePresence>
              {showScrollDown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 md:mb-6 z-50 md:pl-16"
                >
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      if (chatContainerRef.current) {
                        chatContainerRef.current.scrollTo({
                          top: chatContainerRef.current.scrollHeight,
                          behavior: "smooth",
                        });
                      }
                    }}
                    className={`flex items-center justify-center w-9 h-9 rounded-full shadow-lg border transition-all active:scale-90
                      ${theme === "dark"
                        ? "bg-[#252525] border-[#545454] text-white hover:bg-[#333]"
                        : "bg-white border-[#E8E5E0] text-[#252525] hover:bg-[#F9F8F6]"}`}
                    title="Scroll to bottom"
                  >
                    <ChevronDown size={20} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    const compressed = await compressImage(file);
                    setSelectedImage(compressed);
                  } catch (err) {
                    console.error("Compression failed:", err);
                    // Fallback
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setSelectedImage(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                  // Auto-focus the input after image selection (especially for laptop)
                  setTimeout(() => {
                    inputRef.current?.focus();
                  }, 100);
                }
              }}
            />

            {/* Main Pill Wrapper */}
            <div
              className={`flex-1 relative rounded-[28px] flex flex-col p-1 border transition-all duration-300 ease-in-out ${theme === "dark"
                ? "bg-[#252525] border-[#333] focus-within:border-[#C2A27A]/40"
                : "bg-white border-[#E5E5E5] focus-within:border-[#252525]/20"
                }`}
            >
              {/* Integrated Image Preview (Sticks to top of pill) */}
              {selectedImage && (
                <div className="px-3 pt-2 shrink-0">
                  <div className="relative h-12 w-12 md:h-16 md:w-16 rounded-xl overflow-hidden border border-gray-200 dark:border-[#545454] shadow-sm">
                    <img src={selectedImage} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-0 right-0 p-0.5 md:p-1 bg-black/50 text-white rounded-bl-lg hover:bg-black/80 transition-colors z-30"
                      title="Remove image"
                    >
                      <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center px-1">
                {/* 1. Attachment Button (Inside Pill) */}
                <div className="relative flex items-center justify-center shrink-0">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 ${theme === "dark"
                      ? "text-gray-400 hover:bg-[#333] hover:text-white"
                      : "text-gray-500 hover:bg-[#F0EDE8] hover:text-[#252525]"
                      } hover:scale-110`}
                    title="Attach image"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. Main Input */}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!isLoading) {
                        // Laptop-only: don't blur on enter
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                          e.currentTarget.blur();
                        }
                        handleSend();
                      }
                    }
                  }}
                  placeholder={isQuotaReached ? (usage?.chat?.reset ? `Daily limit reached. Resets in ${Math.ceil((usage.chat.reset - Date.now()) / (1000 * 60 * 60))}h` : "Daily limit reached.") : (selectedImage ? "Add a description..." : (messages.length === 0 ? "Ask anything" : "Ask Azviq AI anything..."))}
                  disabled={isQuotaReached && !isLoading}
                  style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}
                  className={`flex-1 max-h-[120px] min-h-[40px] bg-transparent border-0 focus:ring-0 resize-none px-3 py-[9px] text-[15px] outline-none overflow-y-auto custom-scrollbar leading-tight font-medium whitespace-pre-wrap ${isQuotaReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                  rows={1}
                />

                {/* 3. Action Buttons (Right Side) */}
                <div className="flex items-center gap-1">
                  <div className="relative flex items-center justify-center shrink-0">
                    <button
                      onClick={toggleDictation}
                      title="Dictate"
                      className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 ${isDictating
                        ? "bg-red-500 text-white animate-pulse"
                        : theme === "dark"
                          ? "text-gray-400 hover:bg-[#333] hover:text-white"
                          : "text-gray-500 hover:bg-[#F0EDE8] hover:text-[#252525]"
                        } hover:scale-110`}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>

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
                      className={`flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full transition-all active:scale-90 ${theme === "dark" ? "bg-[#3A3A3A] text-white hover:bg-[#545454]" : "bg-[#F0EDE8] text-gray-700 hover:bg-[#D1D1D1]"}`}
                      title="Stop generating"
                    >
                      <Square className="w-3 h-3 fill-current" />
                    </button>
                  ) : (
                    <button
                      onPointerDown={(e) => {
                        // Fix for mobile: send message immediately without waiting for keyboard blur
                        if (!isLoading && (input.trim() || selectedImage)) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      className={`flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-95 ${input.trim() || selectedImage
                        ? "bg-[#252525] text-white hover:bg-[#545454] dark:bg-white dark:text-black dark:hover:bg-[#BABABA]"
                        : theme === "dark" ? "bg-[#333] text-gray-500 cursor-not-allowed" : "bg-[#F5F3EF] text-gray-400 cursor-not-allowed"
                        }`}
                      disabled={!input.trim() && !selectedImage}
                      title="Send message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-[11px] opacity-40 mt-1 pb-3 hidden md:block select-none">
            Azviq AI can make mistakes. Consider verifying critical
            information.
          </p>
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all shrink-0 ${sharedLinkCopied === "modal"
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

        <ImportersModal
          isOpen={!!importerModalData}
          onClose={() => setImporterModalData(null)}
          type="chat"
          id={importerModalData?.id || ""}
          theme={theme}
        />

        {/* ── Image Lightbox ── */}
        {imagePreviewUrl && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
              onClick={() => setImagePreviewUrl(null)}
            />

            <div className="absolute top-4 right-4 z-[160] md:top-8 md:right-8">
              <button
                onClick={() => setImagePreviewUrl(null)}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all duration-200 backdrop-blur-md border border-white/20 shadow-xl group"
                title="Close preview"
              >
                <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="relative w-full h-full flex items-center justify-center pointer-events-none transform animate-in zoom-in-95 duration-300">
              <img
                src={imagePreviewUrl}
                alt="Preview Full Screen"
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg pointer-events-auto cursor-zoom-out"
                onClick={() => setImagePreviewUrl(null)}
              />
            </div>
          </div>
        )}
      </div>
      {/* ── Chat History Dropdown Menu (Fixed at top level to escape transforms) ── */}
      {activeMenuId && menuPosition && (() => {
        const session = sessions.find(s => s.id === activeMenuId);
        if (!session) return null;

        const formatDate = (iso: string) => {
          if (!iso) return "";
          const date = new Date(iso);
          return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        };

        return (
          <div
            ref={menuRef}
            style={{
              top: menuPosition?.openUp ? 'auto' : `${menuPosition?.top}px`,
              bottom: menuPosition?.openUp ? `${window.innerHeight - (menuPosition?.top ?? 0)}px` : 'auto',
              left: menuPosition ? `${menuPosition.left}px` : 'auto'
            }}
            className={`fixed w-44 rounded-xl shadow-xl border z-[9999] overflow-hidden ${theme === "dark"
              ? "bg-[#2A2A2A] border-[#444]"
              : "bg-white border-gray-200 shadow-xl"
              } ${menuPosition?.openUp ? "origin-bottom-right" : "origin-top-right"}`}
          >
            <div className={`px-2.5 py-1.5 border-b flex items-center gap-2 opacity-50 text-[10px] font-bold uppercase tracking-wider ${theme === "dark" ? "border-[#444]" : "border-gray-200"}`}>
              <Clock size={12} />
              {formatDate(session.created_at)}
            </div>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await handleShareChat(session);
              }}
              disabled={sharingChatId === session.id}
              className={`w-full px-2.5 py-1.5 text-left flex items-center gap-2 transition-colors text-[13px] ${theme === "dark" ? "hover:bg-[#333]" : "hover:bg-gray-50"}`}
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
                // Auto-scroll on mobile
                if (window.innerWidth < 768) {
                  setTimeout(() => {
                    document.getElementById(`session-item-${session.id}`)?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center'
                    });
                  }, 100);
                }
              }}
              className={`w-full px-2.5 py-1.5 text-left flex items-center gap-2 transition-colors text-[13px] ${theme === "dark" ? "hover:bg-[#333]" : "hover:bg-gray-50"
                }`}
            >
              <Edit2 className="w-3.5 h-3.5 opacity-70" /> Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePin(session.id, !!session.is_pinned);
              }}
              className={`w-full px-2.5 py-1.5 text-left flex items-center gap-2 transition-colors text-[13px] ${theme === "dark" ? "hover:bg-[#333]" : "hover:bg-gray-50"
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
              className={`w-full px-2.5 py-1.5 text-left flex items-center gap-2 transition-colors text-[13px] ${theme === "dark" ? "hover:bg-[#333]" : "hover:bg-gray-50"
                }`}
            >
              <Archive className="w-3.5 h-3.5 opacity-70" /> Archive
            </button>
            {session.share_links && session.share_links.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImporterModalData({ id: session.id });
                  setActiveMenuId(null);
                }}
                className={`w-full px-2.5 py-1.5 text-left flex items-center gap-2 transition-colors text-[13px] ${theme === "dark" ? "hover:bg-[#333]" : "hover:bg-gray-50"
                  }`}
              >
                <Users className="w-3.5 h-3.5 opacity-70" /> Chat Importers
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(session.id, session.title);
              }}
              className={`w-full px-2.5 py-1.5 text-left flex items-center gap-2 transition-colors text-[13px] ${theme === "dark"
                ? "text-red-400 hover:bg-[#333]"
                : "text-red-600 hover:bg-gray-50"
                }`}
            >
              <Trash2 className="w-3.5 h-3.5 opacity-70" /> Move to Trash
            </button>
          </div>
        );
      })()}
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
