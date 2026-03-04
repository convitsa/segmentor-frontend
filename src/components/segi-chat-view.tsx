"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SegiOrb } from "@/components/segi-orb";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  Check,
  ChevronRight,
  Download,
  Filter,
  Loader2,
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
      parts.push(<a key={`p-${lineKey}-${partKey++}`} href={match[7]} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-2">{match[6]}</a>);
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
      listItems.push(<li key={`li-${i}`} value={listItems.length + 1}>{renderInline(olMatch[1], i)}</li>);
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

interface Props {
  projectId: string;
  conversationId?: string | null;
  onConversationCreated?: (id: string) => void;
  onTitleUpdate?: (title: string) => void;
}

export function SegiChatView({ projectId, conversationId: initialConversationId, onConversationCreated, onTitleUpdate }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const updateTitle = useCallback((title: string) => {
    onTitleUpdate?.(title);
    window.dispatchEvent(new CustomEvent("segi-title-updated", { detail: title }));
  }, [onTitleUpdate]);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [activeToolCalls, setActiveToolCalls] = useState<Map<string, ToolCallState>>(new Map());
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [inputRows, setInputRows] = useState(1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const userScrolledUp = useRef(false);
  const prevConversationIdRef = useRef<string | null | undefined>(initialConversationId);

  useEffect(() => {
    if (initialConversationId === prevConversationIdRef.current) return;
    prevConversationIdRef.current = initialConversationId;

    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    setInput("");
    setInputRows(1);
    setIsStreaming(false);
    setIsThinking(false);
    setActiveToolCalls(new Map());

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    if (initialConversationId) {
      loadConversation(initialConversationId);
    } else {
      setMessages([]);
      setConversationId(null);
      updateTitle("");
    }
  }, [initialConversationId, updateTitle]);

  useEffect(() => {
    if (!userScrolledUp.current) {
      scrollToBottom();
    }
  }, [messages, activeToolCalls]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [initialConversationId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      abortRef.current?.abort();
      abortRef.current = null;
      setMessages([]);
      setConversationId(null);
      setInput("");
      setInputRows(1);
      setIsStreaming(false);
      setIsThinking(false);
      setActiveToolCalls(new Map());
      updateTitle("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      inputRef.current?.focus();
    };
    window.addEventListener("segi-new-chat", handler);
    return () => window.removeEventListener("segi-new-chat", handler);
  }, [updateTitle]);

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

  async function loadConversation(id: string) {
    setLoadingConversation(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/projects/${projectId}/segi/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setConversationId(id);

      if (data.conversation.title) {
        updateTitle(data.conversation.title);
      }

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
    } catch { /* ignore */ } finally {
      setLoadingConversation(false);
    }
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setInputRows(1);
    if (inputRef.current) inputRef.current.style.height = "auto";
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
              if (parsed.conversationId) {
                setConversationId(parsed.conversationId);
                onConversationCreated?.(parsed.conversationId);
              }
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
              if (parsed.title) updateTitle(parsed.title);
              window.dispatchEvent(new CustomEvent("segi-conversations-updated"));
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

      if (buffer.trim()) {
        buffer += "\n\n";
        processBuffer();
      }

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
  }, [input, isStreaming, projectId, conversationId, onConversationCreated, updateTitle]);

  function stopStreaming() {
    abortRef.current?.abort();
    abortRef.current = null;
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

  if (loadingConversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasMessages = messages.length > 0 || isStreaming;

  const inputBar = (
    <div className="max-w-3xl mx-auto w-full px-6 py-4">
      <div className={`flex items-end gap-3 ${inputRows > 1 ? "rounded-3xl" : "rounded-full"} dark:bg-[#484848] bg-muted px-5 py-2.5 transition-[border-radius] duration-150`}>
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
          placeholder="Ask anything..."
          rows={1}
          className="flex-1 bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/60 min-h-[24px] max-h-[120px] overflow-y-auto"
          style={{ height: "auto" }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            const h = Math.min(el.scrollHeight, 120);
            el.style.height = h + "px";
            setInputRows(h > 30 ? 2 : 1);
          }}
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button
            onClick={stopStreaming}
            className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shrink-0"
            title="Stop"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        ) : (
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <AnimatePresence mode="wait">
        {!hasMessages ? (
          <motion.div
            key="empty"
            initial={false}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <SegiOrb size={56} className="mb-6" />
              <h1 className="text-2xl  dark:text-white mb-2">Let's Analyze Something</h1>
              <div className="mt-8 grid grid-cols-3 gap-5 w-full max-w-3xl">
                {[
                  {
                    title: "Top performing countries by engagement score",
                    desc: "Show me the top performing countries by engagement score",
                    visual: (
                      <div className="relative h-[160px] flex items-center justify-center overflow-hidden">
                        <div className="absolute w-14 h-14 rounded-xl dark:bg-[#3e3e3e]/40 bg-muted shadow-sm rotate-[-15deg] -translate-x-8 translate-y-1 flex items-center justify-center">
                          <span className="text-2xl select-none">🇺🇸</span>
                        </div>
                        <div className="absolute w-14 h-14 rounded-xl dark:bg-[#3e3e3e] bg-muted shadow-md z-10 -translate-y-2 flex items-center justify-center">
                          <span className="text-2xl select-none">🇨🇦</span>
                        </div>
                        <div className="absolute w-14 h-14 rounded-xl dark:bg-[#484848] bg-muted/80 shadow-sm rotate-[15deg] translate-x-8 translate-y-1 flex items-center justify-center">
                          <span className="text-2xl select-none">🇬🇧</span>
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: "User Activity Performance Summary",
                    desc: "Give me a user activity performance summary",
                    visual: (
                      <div className="h-[160px] flex flex-col items-center justify-center gap-2.5 px-5">
                        <div className="w-full h-8 rounded-[10px] dark:bg-[#393939] bg-muted flex items-center gap-2.5 px-3 opacity-50">
                          <div className="w-4 h-4 rounded-full dark:border dark:border-[#5a5a5a] bg-muted-foreground/10 shrink-0" />
                          <div className="h-1.5 w-10 rounded-full dark:bg-[#5a5a5a] bg-muted-foreground/20" />
                        </div>
                        <div className="w-full h-10 rounded-[13px] dark:bg-[#3e3e3e] bg-muted flex items-center gap-2.5 px-3.5 shadow-sm">
                          <div className="w-5 h-5 rounded-full dark:border dark:border-[#5a5a5a] bg-muted-foreground/15 shrink-0" />
                          <div className="h-1.5 w-[86px] rounded-full dark:bg-[#5a5a5a] bg-muted-foreground/25" />
                        </div>
                        <div className="w-full h-8 rounded-[10px] dark:bg-[#383838] bg-muted flex items-center gap-2.5 px-3 opacity-50">
                          <div className="w-4 h-4 rounded-full dark:border dark:border-[#5a5a5a] bg-muted-foreground/10 shrink-0" />
                          <div className="h-1.5 w-12 rounded-full dark:bg-[#5a5a5a] bg-muted-foreground/20" />
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: "EU users heatmap — attention distribution report",
                    desc: "Show me a heatmap of EU users attention distribution",
                    visual: (
                      <div className="h-[160px] flex items-center justify-center px-4">
                        <div className="w-full h-[90px] rounded-xl overflow-hidden relative" style={{ background: "linear-gradient(180deg, rgba(62,62,62,0.3) 0%, #3E3E3E 100%)" }}>
                          <div className="absolute top-4 right-4 -translate-x-1/4 flex flex-col items-center gap-1.5">
                            <div className="h-0.5 w-16 rounded-full dark:bg-[#3e3e3e] bg-muted-foreground/15" />
                            <div className="h-0.5 w-7 rounded-full dark:bg-[#3e3e3e] bg-muted-foreground/10" />
                          </div>
                          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-[107px] h-[41px] rounded-[10px] dark:bg-[#444444] bg-muted" />
                          <div className="absolute top-1 right-5 w-7 h-7 rounded-full dark:bg-white/60 blur-[12px]" />
                          <div className="absolute top-3 left-5 w-7 h-7 rounded-full dark:bg-white/30 blur-[12px]" />
                          <div className="absolute bottom-2 left-8 w-7 h-7 rounded-full dark:bg-white/30 blur-[12px]" />
                          <div className="absolute bottom-0 right-2 w-7 h-7 rounded-full dark:bg-white/60 blur-[12px]" />
                        </div>
                      </div>
                    ),
                  },
                ].map((q) => (
                  <button
                    key={q.title}
                    onClick={() => { setInput(q.desc); inputRef.current?.focus(); }}
                    className="text-left rounded-lg border dark:border-[#484848] hover:bg-muted/30 transition-colors cursor-pointer overflow-hidden flex flex-col"
                  >
                    {q.visual}
                    <div className="px-4 pb-4 pt-2">
                      <p className="text-sm font-medium dark:text-white leading-snug">{q.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="shrink-0">
              {inputBar}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto min-h-0"
            >
              <div className="max-w-3xl mx-auto p-6 space-y-5">
                {messages.map((msg, i) => (
                  <MessageBubble key={i} message={msg} projectId={projectId} />
                ))}

                {[...activeToolCalls.values()].filter((tc) => tc.status === "running").map((tc) => (
                  <ToolCard key={tc.id} tool={tc} projectId={projectId} />
                ))}

                {isThinking && !messages.some((m) => m.type === "assistant" && m.streaming) && activeToolCalls.size === 0 && (
                  <div className="flex items-center gap-2.5">
                    <SegiOrb size={24} />
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <div className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span>Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="shrink-0"
            >
              {inputBar}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBubble({ message, projectId }: { message: ChatMessage; projectId: string }) {
  if (message.type === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] dark:bg-[#484848] bg-muted rounded-xl px-4 py-3 text-sm dark:text-white">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.type === "assistant") {
    return (
      <div className="flex gap-3">
        <div className="shrink-0 mt-0.5">
          <SegiOrb size={24} />
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
  const isSearchRecordings = tool.name === "search_recordings";
  const isAnalyzeBehavior = tool.name === "analyze_behavior_patterns";

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
  } else if (isSearchRecordings) {
    icon = <BarChart3 className="h-3.5 w-3.5" />;
    label = isRunning ? "Searching recordings..." : "Session recordings";
    if (tool.result) summary = tool.result.summary || `${tool.result.matchedCount} recordings found`;
  } else if (isAnalyzeBehavior) {
    icon = <BarChart3 className="h-3.5 w-3.5" />;
    label = isRunning ? "Analyzing behavior..." : "Behavior analysis";
    if (tool.result) summary = `Analyzed ${tool.result.matchedCount || 0} sessions`;
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
    } catch { /* ignore */ } finally {
      setDownloading(false);
    }
  }

  if (isExport && !isRunning && tool.result) {
    return (
      <div className="ml-8">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2.5 w-full rounded-xl border bg-card hover:bg-muted/60 transition-colors px-4 py-3 text-left"
        >
          <div className="shrink-0 flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {tool.result.filename || `visitors-export.${tool.result.format}`}
            </div>
            <div className="text-xs text-muted-foreground">
              {downloading ? "Downloading..." : `${tool.result.recordCount} records · ${(tool.result.format || "csv").toUpperCase()}`}
            </div>
          </div>
          <Download className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </div>
    );
  }

  const hasExpandable = !isRunning && tool.result && (isStats || isFilter || isVisitorDetail);

  return (
    <div className="ml-8">
      <div
        className={`rounded-xl border transition-colors ${isRunning ? "border-primary/30 bg-primary/5" : "bg-card"}`}
      >
        <button
          onClick={() => hasExpandable && setExpanded(!expanded)}
          className={`flex items-center gap-2 px-4 py-3 w-full text-left ${hasExpandable ? "cursor-pointer" : "cursor-default"}`}
          disabled={isRunning}
        >
          <div className={`shrink-0 ${isRunning ? "text-primary animate-pulse" : "text-muted-foreground"}`}>
            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">{label}</span>
            {summary && <span className="text-sm text-muted-foreground ml-1.5">{summary}</span>}
          </div>
          {hasExpandable && (
            <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
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
              <div className="px-4 pb-3 border-t">
                {isStats && tool.result.breakdown && (
                  <div className="mt-2 space-y-1">
                    {tool.result.breakdown.slice(0, 8).map((b: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span>{b.name}</span>
                        <span className="text-muted-foreground tabular-nums">{b.count} ({b.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                )}
                {isFilter && (
                  <div className="mt-2 text-sm text-muted-foreground font-mono">
                    {Object.entries(tool.result.filters || {}).map(([k, v]) => (
                      <div key={k}>{k}: {String(v)}</div>
                    ))}
                    {tool.result.visitorIds?.length > 0 && (
                      <div>visitorIds: [{tool.result.visitorIds.length} IDs]</div>
                    )}
                  </div>
                )}
                {isVisitorDetail && tool.result.visitor && (
                  <div className="mt-2 space-y-1 text-sm">
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
