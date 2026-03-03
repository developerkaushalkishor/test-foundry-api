"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Loader2,
  Cpu,
  User as UserIcon,
  LogOut,
  MessageSquare,
  Plus,
  Trash2,
  Menu,
  Pin,
  PinOff,
  Pencil,
  Check,
} from "lucide-react";
import { callAzureFoundry } from "@/lib/azure-api";
import {
  saveUserName,
  getChatSessions,
  getSessionMessages,
  createNewSession,
  saveMessageToSession,
  renameSession,
  togglePinSession,
  clearAllSessions
} from "@/lib/user-actions";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// --- Typewriter Component ---
const Typewriter = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, 10);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, onComplete]);

  return (
    <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#0d0d0d] prose-pre:border prose-pre:border-[#2f2f2f]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
    </div>
  );
};

// --- Main Page Component ---
interface Message {
  role: "user" | "assistant";
  content: string;
  isNew?: boolean;
}

interface ChatSession {
  _id: string;
  title: string;
  pinned: boolean;
  createdAt: string;
  messageCount: number;
}

export default function Home() {
  const [userName, setUserName] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");
  const [isOnboarding, setIsOnboarding] = useState(true);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const initApp = async () => {
      const savedName = localStorage.getItem("chat_user_name");
      if (savedName) {
        setUserName(savedName);
        setIsOnboarding(false);
        await loadSessions(savedName);
      }
    };
    initApp();
  }, []);

  const loadSessions = async (name: string, selectFirst: boolean = true) => {
    const res = await getChatSessions(name);
    if (res.success && res.sessions) {
      setSessions(res.sessions);
      if (selectFirst && res.sessions.length > 0) {
        await handleSelectSession(name, res.sessions[0]._id);
      } else if (res.sessions.length === 0) {
        await handleNewChat(name);
      }
    }
  };

  const handleSelectSession = async (name: string, sessionId: string) => {
    setActiveSessionId(sessionId);
    setMessages([]);
    setIsSidebarOpen(false);
    const res = await getSessionMessages(name, sessionId);
    if (res.success && res.messages) {
      setMessages(res.messages.map((m: any) => ({ role: m.role, content: m.content })));
    }
  };

  const handleNewChat = async (name: string | null = userName) => {
    if (!name) return;
    setLoading(true);
    const res = await createNewSession(name);
    if (res.success && res.sessionId) {
      setActiveSessionId(res.sessionId);
      setMessages([]);
      await loadSessions(name, false);
    }
    setIsSidebarOpen(false);
    setLoading(false);
  };

  const handleNameSubmit = async () => {
    if (!tempName.trim()) return;
    setLoading(true);
    const result = await saveUserName(tempName);
    if (result.success) {
      localStorage.setItem("chat_user_name", tempName);
      setUserName(tempName);
      setIsOnboarding(false);
      await loadSessions(tempName);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("chat_user_name");
    setUserName(null);
    setIsOnboarding(true);
    setMessages([]);
    setSessions([]);
    setActiveSessionId(null);
  };

  const handleClearAllChats = async () => {
    if (!userName) return;
    setMessages([]);
    setSessions([]);
    setActiveSessionId(null);
    await clearAllSessions(userName);
    await handleNewChat(userName);
  };

  const handleRenameStart = (session: ChatSession) => {
    setEditingSessionId(session._id);
    setEditTitle(session.title);
  };

  const handleRenameSave = async (sessionId: string) => {
    if (!userName || !editTitle.trim()) return;
    const res = await renameSession(userName, sessionId, editTitle.trim());
    if (res.success) {
      setSessions(prev => prev.map(s => s._id === sessionId ? { ...s, title: res.title as string } : s));
    }
    setEditingSessionId(null);
  };

  const handleTogglePin = async (sessionId: string) => {
    if (!userName) return;
    const res = await togglePinSession(userName, sessionId);
    if (res.success) {
      setSessions(prev => {
        const updated = prev.map(s => s._id === sessionId ? { ...s, pinned: res.pinned as boolean } : s);
        // Re-sort: pinned first, then by date
        return updated.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });
    }
  };

  const handleTest = async () => {
    if (!prompt.trim() || loading || isTyping || !userName || !activeSessionId) return;

    const userPrompt = prompt.trim();
    setPrompt("");
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const isFirstMessage = messages.length === 0;

    // 1. Update UI and DB for user message
    const updatedMessages = [...messages, { role: "user" as const, content: userPrompt }];
    setMessages(updatedMessages);

    // Non-blocking save to DB for speed
    const dbSaveRes = await saveMessageToSession(userName, activeSessionId, "user", userPrompt, isFirstMessage);
    if (dbSaveRes.success && dbSaveRes.titleUpdated && dbSaveRes.title) {
      // Update sidebar title dynamically with AI-generated title
      setSessions(prev => prev.map(s => s._id === activeSessionId ? { ...s, title: dbSaveRes.title as string } : s));
    }

    setLoading(true);

    try {
      // Send past context to Azure (up to last 6 messages to save tokens)
      const contextMessages = updatedMessages.slice(-6).map(m => ({ role: m.role, content: m.content }));

      const data = await callAzureFoundry(contextMessages);
      const assistantContent = data.choices?.[0]?.message?.content || "No response received.";

      setLoading(false);
      setIsTyping(true);

      setMessages(prev => [...prev, { role: "assistant", content: assistantContent, isNew: true }]);
      await saveMessageToSession(userName, activeSessionId, "assistant", assistantContent, false);

    } catch (err: any) {
      console.error(err);
      setLoading(false);
      setMessages(prev => [...prev, { role: "assistant", content: `**Error:** ${err.message || "Connection failed"}`, isNew: true }]);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  if (isOnboarding) {
    return (
      <main className="min-h-screen bg-[#212121] text-[#ececec] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#2f2f2f] p-10 rounded-2xl max-w-md w-full text-center shadow-xl"
        >
          <div className="p-4 bg-white/5 rounded-full w-fit mx-auto mb-6">
            <Cpu className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Finance Foundry</h2>
          <p className="text-[#b4b4b4] mb-8 text-sm">Enter your name to access your AI Financial Advisor</p>

          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
            placeholder="John Doe"
            className="w-full bg-[#212121] border border-[#424242] rounded-lg p-3 text-center text-white mb-6 focus:ring-1 focus:ring-white outline-none transition-all placeholder:text-[#6b6b6b]"
          />

          <button
            onClick={handleNameSubmit}
            disabled={loading || !tempName.trim()}
            className="w-full bg-white text-black py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Secure Session"}
          </button>
        </motion.div>
      </main>
    );
  }

  return (
    <div className="flex h-screen bg-[#212121] text-[#ececec] overflow-hidden font-sans">

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 w-[260px] bg-[#171717] flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-3">
          <button
            onClick={() => handleNewChat(userName)}
            className="flex items-center gap-2 w-full p-3 rounded-lg hover:bg-[#212121] transition-colors text-sm font-medium text-white"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
              <Plus className="w-4 h-4" />
            </div>
            New Financial Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="text-xs text-[#6b6b6b] font-semibold px-2 mb-3 mt-2">Previous Sessions</div>
          {sessions.map((session) => (
            <div
              key={session._id}
              className={`group flex items-center gap-1 w-full rounded-lg text-sm transition-colors mb-1
                ${activeSessionId === session._id ? 'bg-[#2f2f2f] text-white' : 'hover:bg-[#212121] text-[#ececec]'}
              `}
            >
              {editingSessionId === session._id ? (
                <div className="flex items-center gap-1 w-full p-1.5 pl-2.5">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSave(session._id);
                      if (e.key === 'Escape') setEditingSessionId(null);
                    }}
                    autoFocus
                    className="flex-1 bg-[#171717] border border-[#424242] rounded px-2 py-1 text-sm text-white outline-none focus:border-white/40"
                  />
                  <button onClick={() => handleRenameSave(session._id)} className="p-1 hover:bg-white/10 rounded">
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleSelectSession(userName!, session._id)}
                    className="flex items-center gap-3 flex-1 p-2.5 text-left truncate min-w-0"
                  >
                    {session.pinned ? (
                      <Pin className="w-3.5 h-3.5 shrink-0 text-yellow-400 rotate-45" />
                    ) : (
                      <MessageSquare className="w-4 h-4 shrink-0" />
                    )}
                    <span className="truncate flex-1">{session.title}</span>
                  </button>
                  <div className="hidden group-hover:flex items-center shrink-0 pr-1">
                    <button onClick={() => handleRenameStart(session)} className="p-1 hover:bg-white/10 rounded" title="Rename">
                      <Pencil className="w-3.5 h-3.5 text-[#b4b4b4]" />
                    </button>
                    <button onClick={() => handleTogglePin(session._id)} className="p-1 hover:bg-white/10 rounded" title={session.pinned ? 'Unpin' : 'Pin'}>
                      {session.pinned ? <PinOff className="w-3.5 h-3.5 text-yellow-400" /> : <Pin className="w-3.5 h-3.5 text-[#b4b4b4]" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-[#6b6b6b] px-2 italic">No previous sessions</p>
          )}
        </div>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleClearAllChats}
            className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-[#212121] text-sm text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear all sessions
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-3 mt-1 rounded-lg hover:bg-[#212121] text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log out ({userName})
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative w-full">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10 md:hidden bg-[#212121] z-10 sticky top-0">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-[#ececec]">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-medium text-sm">Finance Assistant</span>
          <div className="w-6" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto w-full scroll-smooth">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-white/5">
                <Cpu className="w-8 h-8 text-[#212121]" />
              </div>
              <h1 className="text-3xl font-semibold mb-2">Finance Advisor AI</h1>
              <p className="text-[#b4b4b4] max-w-md mt-2">
                Ask me about wealth management, stock markets, accounting, or economic trends.
              </p>
            </div>
          ) : (
            <div className="pb-32 pt-8">
              {messages.map((msg, idx) => (
                <div key={idx} className={`w-full flex justify-center py-4 px-4`}>
                  <div className={`w-full max-w-3xl flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 mt-1 shadow-sm">
                        <Cpu className="w-5 h-5 text-[#212121]" />
                      </div>
                    )}

                    <div className={`
                      relative group
                      ${msg.role === 'user'
                        ? 'bg-[#2f2f2f] px-5 py-3 rounded-3xl max-w-[80%]'
                        : 'w-full max-w-[calc(100%-3rem)]'
                      }
                    `}>
                      {msg.role === 'assistant' ? (
                        <div className="text-[#ececec] pt-1">
                          {msg.isNew ? (
                            <Typewriter text={msg.content} onComplete={() => setIsTyping(false)} />
                          ) : (
                            <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#0d0d0d] prose-pre:border prose-pre:border-[#2f2f2f]">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="w-full flex justify-center py-6 px-4">
                  <div className="w-full max-w-3xl flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                      <Cpu className="w-5 h-5 text-[#212121]" />
                    </div>
                    <div className="flex items-center mt-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-[#ececec] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-[#ececec] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-[#ececec] rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-6 pb-6 px-4">
          <div className="max-w-3xl mx-auto relative">
            <div className="bg-[#2f2f2f] rounded-2xl flex items-end p-2 pb-2 pl-4 border border-[#424242] focus-within:border-[#565656] shadow-md transition-colors">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onInput={handleTextareaInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleTest();
                  }
                }}
                placeholder="Ask about stocks, budgets, or finance..."
                className="w-full max-h-[200px] bg-transparent border-none py-2.5 pr-3 text-[#ececec] placeholder:text-[#b4b4b4] focus:ring-0 outline-none resize-none font-sans"
                rows={1}
              />
              <button
                onClick={handleTest}
                disabled={loading || !prompt.trim() || isTyping}
                className={`
                  p-2 mb-1 mr-1 rounded-xl transition-all shrink-0
                  ${loading || !prompt.trim() || isTyping
                    ? 'bg-[#171717] text-[#6b6b6b] cursor-not-allowed'
                    : 'bg-white text-black hover:bg-gray-200'}
                `}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-[10px] text-[#b4b4b4] mt-3">
              This AI is tuned for finance. Always verify critical financial decisions.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
