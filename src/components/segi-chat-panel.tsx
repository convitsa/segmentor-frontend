"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SegiIcon } from "@/components/segi-icon";
import { SegiOrb } from "@/components/segi-orb";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  MessageSquarePlus,
  BarChart3,
  Square,
  User,
  X,
} from "lucide-react";

function renderInline(text: string, lineKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let partKey = 0;
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2]) {
      parts.push(<strong key={`p-${lineKey}-${partKey++}`}><em>{match[2]}</em></strong>);
    } else if (match[3]) {
      parts.push(<strong key={`p-${lineKey}-${partKey++}`}>{match[3]}</strong>);
    } else if (match[4]) {
      parts.push(<em key={`p-${lineKey}-${partKey++}`}>{match[4]}</em>);
    } else if (match[5]) {
      parts.push(<code key={`p-${lineKey}-${partKey++}`} className="px-1 py-0.5 rounded bg-muted text-[13px] font-mono">{match[5]}</code>);
    } else if (match[6] && match[7]) {
      parts.push(<a key={`p-${lineKey}-${partKey++}`} href={match[7]} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700 underline underline-offset-2">{match[6]}</a>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType;
      result.push(<Tag key={`list-${result.length}`} className={`text-sm ${listType === "ol" ? "list-decimal" : "list-disc"} pl-5 space-y-0.5`}>{listItems}</Tag>);
      listItems = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      flushList();
      const level = headerMatch[1].length;
      const cls = level === 1 ? "text-base font-bold" : level === 2 ? "text-sm font-bold" : "text-sm font-semibold";
      result.push(<div key={`h-${i}`} className={`${cls} mt-2 mb-0.5`}>{renderInline(headerMatch[2], i)}</div>);
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (listType !== "ul") { flushList(); listType = "ul"; }
      listItems.push(<li key={`li-${i}`}>{renderInline(ulMatch[1], i)}</li>);
      continue;
    }

    const olMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      if (listType !== "ol") { flushList(); listType = "ol"; }
      listItems.push(<li key={`li-${i}`}>{renderInline(olMatch[1], i)}</li>);
      continue;
    }

    flushList();
    if (line.trim() === "" && i > 0) {
      result.push(<div key={`sp-${i}`} className="h-1" />);
    } else {
      if (result.length > 0 && lines[i - 1]?.trim() !== "" && !lines[i - 1]?.match(/^#{1,3}\s/)) {
        result.push(<br key={`br-${i}`} />);
      }
      result.push(...renderInline(line, i));
    }
  }
  flushList();
  return result;
}

function RenderedMarkdown({ content, streaming }: { content: string; streaming?: boolean }) {
  const rendered = useMemo(() => renderMarkdown(content), [content]);
  return (
    <>
      {rendered}
      {streaming && <span className="inline-block w-1.5 h-4 bg-foreground/60 animate-pulse ml-0.5 -mb-0.5" />}
    </>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("segmentor_token");
}

// ─── Types ──────────────────────────────────────────────────────────

interface ToolCallState {
  id: string;
  name: string;
  args: string;
  status: "running" | "done";
  result?: any;
}

type ChatMessage =
  | { type: "user"; content: string }
  | { type: "assistant"; content: string; streaming?: boolean }
  | { type: "tool"; tool: ToolCallState };

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  projectId: string;
  onApplyFilters: (filters: Record<string, string>, visitorIds: string[]) => void;
  onClose: () => void;
  onNewChat?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function SegiChatPanel({ projectId, onApplyFilters, onClose, onNewChat }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeToolCalls, setActiveToolCalls] = useState<Map<string, ToolCallState>>(new Map());

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    loadConversations();
  }, [projectId]);

  useEffect(() => {
    if (!userScrolledUp.current) {
      scrollToBottom();
    }
  }, [messages, activeToolCalls]);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    userScrolledUp.current = !atBottom;
  }

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState<string | null>(null);

  async function loadConversations() {
    setLoadingHistory(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/projects/${projectId}/segi/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      } else {
        setLoadError("Failed to load chat history");
        setTimeout(() => setLoadError(null), 4000);
      }
    } catch {
      setLoadError("Failed to load chat history");
      setTimeout(() => setLoadError(null), 4000);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadConversation(id: string) {
    setLoadingConversation(id);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/projects/${projectId}/segi/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setLoadError("Failed to load conversation");
        setTimeout(() => setLoadError(null), 4000);
        return;
      }
      const data = await res.json();
      setConversationId(id);
      setShowHistory(false);

      const loaded: ChatMessage[] = [];
      const msgs = data.conversation.messages || [];
      for (const msg of msgs) {
        if (msg.role === "user") {
          loaded.push({ type: "user", content: msg.content });
        } else if (msg.role === "assistant" && msg.content) {
          loaded.push({ type: "assistant", content: msg.content });
        } else if (msg.role === "tool_use" && msg.toolName) {
          loaded.push({
            type: "tool",
            tool: {
              id: msg.id,
              name: msg.toolName,
              args: JSON.stringify(msg.toolInput || {}),
              status: "done",
              result: null,
            },
          });
        } else if (msg.role === "tool_result" && msg.toolOutput) {
          const last = loaded[loaded.length - 1];
          if (last && last.type === "tool") {
            last.tool.result = msg.toolOutput;
          }
        }
      }
      setMessages(loaded);
    } catch {
      setLoadError("Failed to load conversation");
      setTimeout(() => setLoadError(null), 4000);
    } finally {
      setLoadingConversation(null);
    }
  }

  function startNewChat() {
    setMessages([]);
    setConversationId(null);
    setIsThinking(false);
    setActiveToolCalls(new Map());
    setShowHistory(false);
    onNewChat?.();
    inputRef.current?.focus();
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setMessages((prev) => [...prev, { type: "user", content: text }]);
    setIsStreaming(true);
    setIsThinking(true);
    setActiveToolCalls(new Map());
    userScrolledUp.current = false;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/projects/${projectId}/segi/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId, message: text }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => [...prev, { type: "assistant", content: "Sorry, something went wrong. Please try again." }]);
        setIsStreaming(false);
        setIsThinking(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let hasStreamingMsg = false;

      const appendOrUpdateStreaming = (txt: string) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.type === "assistant" && last.streaming) {
            return [...prev.slice(0, -1), { type: "assistant", content: txt, streaming: true }];
          }
          return [...prev, { type: "assistant", content: txt, streaming: true }];
        });
        hasStreamingMsg = true;
      };

      const finalizeStreaming = () => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.type === "assistant" && last.streaming) {
            return [...prev.slice(0, -1), { type: "assistant", content: last.content }];
          }
          return prev;
        });
        hasStreamingMsg = false;
      };

      const processBuffer = () => {
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          if (!block.trim()) continue;
          let event = "";
          let data = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data = line.slice(5).trim();
          }
          if (!event) continue;

          let parsed: any;
          try { parsed = JSON.parse(data); } catch { continue; }

          switch (event) {
            case "conversation":
              if (parsed.conversationId) setConversationId(parsed.conversationId);
              break;

            case "thinking":
              setIsThinking(true);
              break;

            case "text_delta":
              setIsThinking(false);
              fullText += parsed.delta || "";
              appendOrUpdateStreaming(fullText);
              break;

            case "tool_call_start":
              setIsThinking(false);
              if (fullText && hasStreamingMsg) {
                finalizeStreaming();
                fullText = "";
              }
              setActiveToolCalls((prev) => {
                const next = new Map(prev);
                next.set(parsed.toolCallId, {
                  id: parsed.toolCallId,
                  name: parsed.toolName,
                  args: "",
                  status: "running",
                });
                return next;
              });
              break;

            case "tool_call_args":
              setActiveToolCalls((prev) => {
                const next = new Map(prev);
                const tc = next.get(parsed.toolCallId);
                if (tc) tc.args += parsed.delta || "";
                return next;
              });
              break;

            case "tool_result": {
              const result = parsed.result;
              setActiveToolCalls((prev) => {
                const next = new Map(prev);
                const tc = next.get(parsed.toolCallId);
                if (tc) { tc.status = "done"; tc.result = result; }
                return next;
              });

              if (parsed.toolName === "filter_visitors" && result) {
                onApplyFilters(result.filters || {}, result.visitorIds || []);
              } else if (parsed.toolName === "clear_filters" && result?.cleared) {
                onNewChat?.();
              }

              const toolState: ToolCallState = {
                id: parsed.toolCallId,
                name: parsed.toolName,
                args: "",
                status: "done",
                result,
              };
              setActiveToolCalls((prev) => {
                const tc = prev.get(parsed.toolCallId);
                if (tc) toolState.args = tc.args;
                return prev;
              });
              setMessages((prev) => [...prev, { type: "tool", tool: toolState }]);
              break;
            }

            case "done":
              if (hasStreamingMsg) {
                finalizeStreaming();
              }
              fullText = "";
              setIsStreaming(false);
              setIsThinking(false);
              setActiveToolCalls(new Map());
              loadConversations();
              break;

            case "error":
              if (hasStreamingMsg) finalizeStreaming();
              setMessages((prev) => [...prev, { type: "assistant", content: `Error: ${parsed.message || "Something went wrong"}` }]);
              setIsStreaming(false);
              setIsThinking(false);
              break;
          }
        }
      };

      const INACTIVITY_TIMEOUT = 60_000;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => { controller.abort(); }, INACTIVITY_TIMEOUT);
      };
      resetTimeout();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resetTimeout();
        buffer += decoder.decode(value, { stream: true });
        processBuffer();
      }
      if (timeoutId) clearTimeout(timeoutId);

      // Flush remaining buffer after stream closes
      if (buffer.trim()) {
        buffer += "\n\n";
        processBuffer();
      }

      // Final safety net
      if (hasStreamingMsg) {
        finalizeStreaming();
      }
      setIsStreaming(false);
      setIsThinking(false);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.type === "assistant" && last.streaming) {
            return [...prev.slice(0, -1), { type: "assistant", content: last.content || "Connection lost. Please try again." }];
          }
          return [...prev, { type: "assistant", content: "Connection lost. Please try again." }];
        });
      }
      setIsStreaming(false);
      setIsThinking(false);
    }
  }, [input, isStreaming, projectId, conversationId, onApplyFilters]);

  function stopStreaming() {
    abortRef.current?.abort();
    setIsStreaming(false);
    setIsThinking(false);
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.type === "assistant" && last.streaming) {
        return [...prev.slice(0, -1), { type: "assistant", content: last.content }];
      }
      return prev;
    });
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b shrink-0 bg-background">
        <div className="flex items-center gap-2.5">
          <SegiIcon size={22} />
          <span className="font-semibold text-sm">Segi</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { const next = !showHistory; setShowHistory(next); if (next) loadConversations(); }}
            title="Chat history"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showHistory ? "rotate-180" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startNewChat} title="New chat">
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Error toast */}
      {loadError && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs border-b shrink-0">
          {loadError}
        </div>
      )}

      {/* History dropdown */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b"
          >
            {loadingHistory ? (
              <div className="flex items-center justify-center py-4">
                <SegiOrb size={24} thinking />
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">No conversations yet</div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => loadConversation(c.id)}
                    disabled={loadingConversation === c.id}
                    className={`w-full text-left px-4 py-2 text-xs hover:bg-muted/50 transition-colors flex items-center gap-2 ${c.id === conversationId ? "bg-muted/40 font-medium" : "text-muted-foreground"}`}
                  >
                    {loadingConversation === c.id ? (
                      <SegiOrb size={14} thinking className="shrink-0" />
                    ) : null}
                    <span className="truncate flex-1">{c.title || "Untitled"}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(c.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0"
      >
        <div className="p-4 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <SegiIcon size={40} className="mb-4 opacity-60" />
              <p className="text-sm font-medium mb-1">Ask Segi anything</p>
              <p className="text-xs text-muted-foreground max-w-[240px]">
                Filter visitors, get insights, export data - all through conversation.
              </p>
              <div className="mt-6 space-y-2 w-full max-w-[260px]">
                {["Show me mobile visitors", "How many visitors from Germany?", "Export all paid customers as CSV"].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors text-muted-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} projectId={projectId} />
          ))}

          {/* Active tool calls (running) */}
          {[...activeToolCalls.values()].filter((tc) => tc.status === "running").map((tc) => (
            <ToolCard key={tc.id} tool={tc} projectId={projectId} />
          ))}

          {/* Thinking indicator */}
          {isThinking && !messages.some((m) => m.type === "assistant" && m.streaming) && activeToolCalls.size === 0 && (
            <div className="flex items-center gap-2.5">
              <SegiIcon size={18} />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span>Segi is thinking...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t p-3">
        <div className="flex items-end gap-2 rounded-xl border bg-muted/30 focus-within:bg-card focus-within:ring-1 focus-within:ring-ring transition-colors p-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask Segi..."
            rows={1}
            className="flex-1 bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/60 min-h-[20px] max-h-[120px]"
            style={{ height: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shrink-0"
              title="Stop"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="p-1.5 rounded-lg bg-foreground text-background disabled:opacity-30 hover:opacity-80 transition-opacity shrink-0"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function MessageBubble({ message, projectId }: { message: ChatMessage; projectId: string }) {
  if (message.type === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-muted/60 rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.type === "assistant") {
    return (
      <div className="flex gap-2.5">
        <div className="shrink-0 mt-0.5">
          <SegiIcon size={18} />
        </div>
        <div className="text-sm leading-relaxed max-w-[90%]">
          <RenderedMarkdown content={message.content} streaming={message.streaming} />
        </div>
      </div>
    );
  }

  if (message.type === "tool") {
    return <ToolCard tool={message.tool} projectId={projectId} />;
  }

  return null;
}

function ToolCard({ tool, projectId }: { tool: ToolCallState; projectId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isRunning = tool.status === "running";
  const isFilter = tool.name === "filter_visitors";
  const isStats = tool.name === "query_visitor_stats";
  const isExport = tool.name === "export_visitors";
  const isClear = tool.name === "clear_filters";
  const isVisitorDetail = tool.name === "get_visitor_details";

  let icon;
  let label: string;
  let summary = "";

  if (isFilter) {
    icon = <Filter className="h-3.5 w-3.5" />;
    label = isRunning ? "Filtering visitors..." : "Filtered visitors";
    if (tool.result) summary = tool.result.summary || `${tool.result.matchedCount} visitors found`;
  } else if (isVisitorDetail) {
    icon = <User className="h-3.5 w-3.5" />;
    label = isRunning ? "Looking up visitor..." : "Visitor details";
    if (tool.result) summary = tool.result.visitor?.name || tool.result.error || "";
  } else if (isClear) {
    icon = <X className="h-3.5 w-3.5" />;
    label = isRunning ? "Clearing filters..." : "Filters cleared";
    if (tool.result) summary = tool.result.summary || "All filters removed";
  } else if (isStats) {
    icon = <BarChart3 className="h-3.5 w-3.5" />;
    label = isRunning ? "Querying statistics..." : "Visitor statistics";
    if (tool.result) summary = `${tool.result.totalVisitors} total visitors`;
  } else if (isExport) {
    icon = <Download className="h-3.5 w-3.5" />;
    label = isRunning ? "Preparing export..." : "Export ready";
    if (tool.result) summary = tool.result.summary || `${tool.result.recordCount} records`;
  } else {
    icon = <Loader2 className="h-3.5 w-3.5" />;
    label = tool.name;
  }

  async function handleDownload() {
    if (!tool.result || downloading) return;
    setDownloading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({ format: tool.result.format || "csv" });
      if (tool.result.filters && Object.keys(tool.result.filters).length > 0) {
        params.set("filters", JSON.stringify(tool.result.filters));
      }
      const res = await fetch(`${API_URL}/api/projects/${projectId}/segi/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = tool.result.filename || `visitors-export.${tool.result.format || "csv"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setDownloading(false);
    }
  }

  if (isExport && !isRunning && tool.result) {
    return (
      <div className="ml-6">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2.5 w-full rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors px-3 py-2.5 text-left"
        >
          <div className="shrink-0 flex items-center justify-center h-8 w-8 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-600">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">
              {tool.result.filename || `visitors-export.${tool.result.format}`}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {downloading ? "Downloading..." : `${tool.result.recordCount} records · ${(tool.result.format || "csv").toUpperCase()}`}
            </div>
          </div>
          <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </div>
    );
  }

  const hasExpandable = !isRunning && tool.result && (isStats || isFilter || isVisitorDetail);

  return (
    <div className="ml-6">
      <div
        className={`rounded-lg border transition-colors ${isRunning ? "border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20" : "bg-muted/30"}`}
      >
        <button
          onClick={() => hasExpandable && setExpanded(!expanded)}
          className={`flex items-center gap-2 px-3 py-2 w-full text-left ${hasExpandable ? "cursor-pointer" : "cursor-default"}`}
          disabled={isRunning}
        >
          <div className={`shrink-0 ${isRunning ? "text-violet-500 animate-pulse" : "text-muted-foreground"}`}>
            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium">{label}</span>
            {summary && <span className="text-xs text-muted-foreground ml-1.5">{summary}</span>}
          </div>
          {hasExpandable && (
            <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
          )}
        </button>

        <AnimatePresence>
          {expanded && tool.result && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-2 border-t">
                {isStats && tool.result.breakdown && (
                  <div className="mt-2 space-y-1">
                    {tool.result.breakdown.slice(0, 8).map((b: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span>{b.name}</span>
                        <span className="text-muted-foreground tabular-nums">{b.count} ({b.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                )}
                {isFilter && (
                  <div className="mt-2 text-xs text-muted-foreground font-mono">
                    {Object.entries(tool.result.filters || {}).map(([k, v]) => (
                      <div key={k}>{k}: {String(v)}</div>
                    ))}
                    {tool.result.visitorIds?.length > 0 && (
                      <div>visitorIds: [{tool.result.visitorIds.length} IDs]</div>
                    )}
                  </div>
                )}
                {isVisitorDetail && tool.result.visitor && (
                  <div className="mt-2 space-y-1 text-xs">
                    {[
                      ["Location", [tool.result.visitor.city, tool.result.visitor.country].filter(Boolean).join(", ") || "Unknown"],
                      ["Device", [tool.result.visitor.device, tool.result.visitor.browser, tool.result.visitor.os].filter(Boolean).join(" · ") || "Unknown"],
                      ["Pages", tool.result.visitor.totalPageviews],
                      ["Sessions", tool.result.visitor.totalSessions],
                      ["Events", tool.result.visitor.totalEvents],
                      ["First seen", new Date(tool.result.visitor.firstSeenAt).toLocaleDateString()],
                      ["Last seen", new Date(tool.result.visitor.lastSeenAt).toLocaleDateString()],
                    ].map(([k, v]) => (
                      <div key={String(k)} className="flex justify-between">
                        <span className="text-muted-foreground">{String(k)}</span>
                        <span className="font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
