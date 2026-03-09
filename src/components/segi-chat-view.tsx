"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SegiOrb } from "@/components/segi-orb";
import { SessionAnalysisView } from "@/components/session-analysis";
import type { SessionAnalysis } from "@/lib/types/dto";
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
  PlayCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Globe,
  FileBarChart,
  GitCompare,
  LogOut,
  Brain,
  Activity,
  BookOpen,
  Eye,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
  | { type: "tool"; tool: ToolCallState }
  | { type: "analysis"; analysis: SessionAnalysis };

interface Props {
  projectId: string;
  conversationId?: string | null;
  autoMessage?: string | null;
  prefillRecording?: string | null;
  prefillMessage?: string | null;
  onConversationCreated?: (id: string) => void;
  onTitleUpdate?: (title: string) => void;
}

export function SegiChatView({ projectId, conversationId: initialConversationId, autoMessage, prefillRecording, prefillMessage, onConversationCreated, onTitleUpdate }: Props) {
  const chatRouter = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [linkedRecordingId, setLinkedRecordingId] = useState<string | null>(null);
  const [attachedRecording, setAttachedRecording] = useState<string | null>(null);

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
  const prevConversationIdRef = useRef<string | null | undefined>(undefined);
  const autoMessageSentRef = useRef(false);

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
      setLinkedRecordingId(null);
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
    if (prefillRecording) {
      setAttachedRecording(prefillRecording);
    }
    if (prefillMessage) {
      setInput(prefillMessage);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [prefillRecording, prefillMessage]);

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
      setAttachedRecording(null);
      setLinkedRecordingId(null);
      updateTitle("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      inputRef.current?.focus();
    };
    window.addEventListener("segi-new-chat", handler);
    return () => window.removeEventListener("segi-new-chat", handler);
  }, [updateTitle]);

  useEffect(() => {
    const handler = () => {
      const lines: string[] = [];
      for (const msg of messages) {
        if (msg.type === "user") lines.push(`User: ${msg.content}\n`);
        else if (msg.type === "assistant") lines.push(`Assistant: ${msg.content}\n`);
        else if (msg.type === "analysis") {
          const a = msg.analysis;
          lines.push(`Session Analysis\n`);
          lines.push(`Visitor: ${a.metadata.visitor}`);
          lines.push(`Location: ${a.metadata.location}`);
          lines.push(`Device: ${a.metadata.device}`);
          lines.push(`Browser: ${a.metadata.browser}`);
          lines.push(`Date: ${a.metadata.date}`);
          lines.push(`Verdict: ${a.metadata.verdict}\n`);
          lines.push(`Activity: ${a.activityOverview.sessions} sessions, ${a.activityOverview.pageviews} pageviews, ${a.activityOverview.rageClicks} rage clicks, ${a.activityOverview.timeOnSite}\n`);
          lines.push(`Friction Score: ${a.frictionScore.score}/100 (${a.frictionScore.level})`);
          lines.push(`${a.frictionScore.description}\n`);
          if (a.frictionPoints.length) {
            lines.push(`Friction Points:`);
            a.frictionPoints.forEach(fp => lines.push(`  [${fp.severity}] ${fp.text}`));
            lines.push("");
          }
          lines.push(`Journey: ${a.visitorJourney.join(" → ")}\n`);
          if (a.recommendations.length) {
            lines.push(`Recommendations:`);
            a.recommendations.forEach(r => lines.push(`  ${r.title}: ${r.description}`));
            lines.push("");
          }
          lines.push(`Verdict: "${a.verdict.summary}"\n`);
        }
      }
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "session-analysis.txt";
      link.click();
      URL.revokeObjectURL(url);
    };
    window.addEventListener("segi-export", handler);
    return () => window.removeEventListener("segi-export", handler);
  }, [messages]);

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
      setLinkedRecordingId(data.conversation.recordingSessionId || null);

      if (data.conversation.title) {
        updateTitle(data.conversation.title);
      }

      const loaded: ChatMessage[] = [];
      const msgs = data.conversation.messages || [];
      for (const msg of msgs) {
        if (msg.role === "user") {
          loaded.push({ type: "user", content: msg.content });
        } else if (msg.role === "assistant" && msg.content) {
          let parsed: SessionAnalysis | null = null;
          try {
            const obj = JSON.parse(msg.content);
            if (obj && obj.metadata && obj.frictionScore && obj.verdict) {
              parsed = obj as SessionAnalysis;
            }
          } catch { /* not JSON, regular message */ }
          if (parsed) {
            loaded.push({ type: "analysis", analysis: parsed });
          } else {
            loaded.push({ type: "assistant", content: msg.content });
          }
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

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isStreaming) return;

    const currentAttachedRecording = attachedRecording;
    setInput("");
    setInputRows(1);
    setAttachedRecording(null);
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

      let chatConvId = conversationId;
      if (currentAttachedRecording && !chatConvId) {
        const analyzeRes = await fetch(`${API_URL}/api/projects/${projectId}/replays/${currentAttachedRecording}/analyze-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: "{}",
          signal: controller.signal,
        });
        if (analyzeRes.ok) {
          const analyzeData = await analyzeRes.json();
          chatConvId = analyzeData.conversationId;
          setConversationId(chatConvId);
          setLinkedRecordingId(currentAttachedRecording);
          prevConversationIdRef.current = chatConvId;
          onConversationCreated?.(chatConvId!);
          window.dispatchEvent(new CustomEvent("segi-conversations-updated"));
        }
      }

      const res = await fetch(`${API_URL}/api/projects/${projectId}/segi/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId: chatConvId, message: text }),
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
            try {
              const obj = JSON.parse(last.content);
              if (obj && obj.metadata && obj.frictionScore && obj.verdict) {
                return [...prev.slice(0, -1), { type: "analysis" as const, analysis: obj as SessionAnalysis }];
              }
            } catch { /* not JSON, keep as text */ }
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
                const isNew = !chatConvId && (!conversationId || conversationId !== parsed.conversationId);
                setConversationId(parsed.conversationId);
                if (isNew) {
                  prevConversationIdRef.current = parsed.conversationId;
                  onConversationCreated?.(parsed.conversationId);
                }
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
              } else if (!fullText) {
                setMessages((prev) => [...prev, { type: "assistant", content: "I wasn't able to generate a response. Please try again." }]);
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
  }, [input, isStreaming, projectId, conversationId, attachedRecording, onConversationCreated, updateTitle]);

  useEffect(() => {
    if (initialConversationId !== prevConversationIdRef.current) {
      autoMessageSentRef.current = false;
    }
  }, [initialConversationId]);

  useEffect(() => {
    if (
      autoMessage &&
      !autoMessageSentRef.current &&
      !loadingConversation &&
      !isStreaming &&
      conversationId &&
      messages.length === 0
    ) {
      autoMessageSentRef.current = true;
      sendMessage(autoMessage);
    }
  }, [autoMessage, loadingConversation, isStreaming, conversationId, messages.length, sendMessage]);

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

  const hasAttachment = !!attachedRecording;

  const inputBar = (
    <div className="max-w-3xl mx-auto w-full px-6 py-4">
      <div className={`flex flex-col ${hasAttachment ? "rounded-2xl" : inputRows > 1 ? "rounded-3xl" : "rounded-full"} dark:bg-[#484848] bg-muted transition-[border-radius] duration-150`}>
        {attachedRecording && (
          <div className="px-4 pt-3 pb-1">
            <div className="relative inline-block rounded-lg overflow-hidden border dark:border-[#5a5a5a] w-[160px]">
              <div className="bg-[#2a2a2a] p-2 flex flex-col items-center justify-center h-[100px]">
                <PlayCircle className="size-8 text-muted-foreground/60 mb-1" />
                <span className="text-[10px] text-muted-foreground/60">Session Recording</span>
              </div>
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                <button
                  onClick={() => setAttachedRecording(null)}
                  className="p-1 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                  title="Remove"
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          </div>
        )}
        <div className={`flex items-end gap-3 px-5 py-2.5`}>
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
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
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
                {linkedRecordingId && (
                  <button
                    onClick={() => chatRouter.push(`/dashboard/projects/${projectId}?section=recordings&sessionId=${linkedRecordingId}`)}
                    className="w-full flex items-center gap-3 rounded-xl border dark:border-[#484848] dark:bg-[#3d3d3d] bg-muted/40 px-4 py-3 text-left hover:dark:bg-[#484848] transition-colors cursor-pointer group"
                  >
                    <div className="flex size-10 items-center justify-center rounded-lg bg-[#FA783E]/10">
                      <PlayCircle className="size-5 text-[#FA783E]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium dark:text-white truncate">Session Recording</p>
                      <p className="text-xs text-muted-foreground">Click to watch the recording</p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:dark:text-white transition-colors" />
                  </button>
                )}
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

  if (message.type === "analysis") {
    return (
      <div className="flex gap-3">
        <div className="shrink-0 mt-0.5">
          <SegiOrb size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <SessionAnalysisView analysis={message.analysis} />
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
  const toolName = tool.name;

  let icon;
  let label: string;
  let summary = "";

  const toolConfig: Record<string, { icon: React.ReactNode; running: string; done: string; getSummary?: (r: any) => string }> = {
    filter_visitors: { icon: <Filter className="h-3.5 w-3.5" />, running: "Filtering visitors...", done: "Filtered visitors", getSummary: (r) => r.summary || `${r.matchedCount} visitors found` },
    get_visitor_details: { icon: <User className="h-3.5 w-3.5" />, running: "Looking up visitor...", done: "Visitor details", getSummary: (r) => r.visitor?.name || r.error || "" },
    clear_filters: { icon: <X className="h-3.5 w-3.5" />, running: "Clearing filters...", done: "Filters cleared", getSummary: (r) => r.summary || "All filters removed" },
    query_visitor_stats: { icon: <BarChart3 className="h-3.5 w-3.5" />, running: "Querying statistics...", done: "Visitor statistics", getSummary: (r) => `${r.totalVisitors} total visitors` },
    export_visitors: { icon: <Download className="h-3.5 w-3.5" />, running: "Preparing export...", done: "Export ready", getSummary: (r) => r.summary || `${r.recordCount} records` },
    analyze_funnel: { icon: <Zap className="h-3.5 w-3.5" />, running: "Analyzing funnel...", done: "Funnel analysis", getSummary: (r) => r.summary || "" },
    analyze_traffic_sources: { icon: <Globe className="h-3.5 w-3.5" />, running: "Analyzing traffic sources...", done: "Traffic source analysis", getSummary: (r) => r.summary || "" },
    analyze_page_performance: { icon: <FileBarChart className="h-3.5 w-3.5" />, running: "Analyzing pages...", done: "Page performance", getSummary: (r) => r.summary || "" },
    compare_segments: { icon: <GitCompare className="h-3.5 w-3.5" />, running: "Comparing segments...", done: "Segment comparison", getSummary: (r) => r.summary || "" },
    find_drop_offs: { icon: <LogOut className="h-3.5 w-3.5" />, running: "Finding drop-offs...", done: "Drop-off analysis", getSummary: (r) => r.summary || "" },
    analyze_behavior_patterns: { icon: <Brain className="h-3.5 w-3.5" />, running: "Analyzing behavior...", done: "Behavior patterns", getSummary: (r) => r.summary || "" },
    analyze_trends: { icon: <Activity className="h-3.5 w-3.5" />, running: "Analyzing trends...", done: "Trend analysis", getSummary: (r) => r.summary || "" },
    fetch_page_content: { icon: <Eye className="h-3.5 w-3.5" />, running: "Analyzing page...", done: "Page analyzed", getSummary: (r) => r.title ? `${r.title}` : r.url || "" },
    load_cro_skill: { icon: <BookOpen className="h-3.5 w-3.5" />, running: "Loading expertise...", done: "Loaded expertise", getSummary: (r) => r.skill ? `${r.skill} skill` : "" },
  };

  const config = toolConfig[toolName];
  if (config) {
    icon = config.icon;
    label = isRunning ? config.running : config.done;
    if (tool.result && config.getSummary) summary = config.getSummary(tool.result);
  } else {
    icon = <Loader2 className="h-3.5 w-3.5" />;
    label = toolName;
  }

  const isFilter = toolName === "filter_visitors";
  const isStats = toolName === "query_visitor_stats";
  const isExport = toolName === "export_visitors";
  const isVisitorDetail = toolName === "get_visitor_details";
  const isCroTool = ["analyze_funnel", "analyze_traffic_sources", "analyze_page_performance", "compare_segments", "find_drop_offs", "analyze_behavior_patterns", "analyze_trends", "fetch_page_content"].includes(toolName);

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

  const hasExpandable = !isRunning && tool.result && (isStats || isFilter || isVisitorDetail || isCroTool);

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
                {toolName === "analyze_funnel" && tool.result.steps && (
                  <div className="mt-2 space-y-2">
                    {tool.result.steps.map((step: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-sm">
                            <span className="truncate font-medium">{step.step}</span>
                            <span className="text-muted-foreground tabular-nums shrink-0 ml-2">{step.visitors}</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${step.conversionFromFirst}%` }} />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums w-12 text-right shrink-0">{step.conversionFromFirst}%</span>
                      </div>
                    ))}
                    <div className="text-xs text-muted-foreground pt-1 border-t">
                      Overall: {tool.result.overallConversion}% · Biggest drop: {tool.result.biggestDropOff} (-{tool.result.biggestDropOffRate?.toFixed(1)}%)
                    </div>
                  </div>
                )}
                {toolName === "analyze_traffic_sources" && tool.result.sources && (
                  <div className="mt-2">
                    <div className="grid grid-cols-[1fr,auto,auto,auto] gap-x-3 gap-y-1 text-xs">
                      <span className="text-muted-foreground font-medium">Source</span>
                      <span className="text-muted-foreground font-medium text-right">Visitors</span>
                      <span className="text-muted-foreground font-medium text-right">Conv %</span>
                      <span className="text-muted-foreground font-medium text-right">Revenue</span>
                      {tool.result.sources.slice(0, 10).map((s: any, i: number) => (
                        <React.Fragment key={i}>
                          <span className="text-sm truncate">{s.source}</span>
                          <span className="text-sm tabular-nums text-right">{s.visitors}</span>
                          <span className={`text-sm tabular-nums text-right ${s.conversionRate >= 10 ? "text-green-500" : s.conversionRate >= 5 ? "text-yellow-500" : "text-red-400"}`}>{s.conversionRate}%</span>
                          <span className="text-sm tabular-nums text-right">${((s.revenue || 0) / 100).toFixed(0)}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
                {toolName === "analyze_page_performance" && tool.result.pages && (
                  <div className="mt-2">
                    <div className="grid grid-cols-[1fr,auto,auto,auto] gap-x-3 gap-y-1 text-xs">
                      <span className="text-muted-foreground font-medium">Page</span>
                      <span className="text-muted-foreground font-medium text-right">Views</span>
                      <span className="text-muted-foreground font-medium text-right">Avg Time</span>
                      <span className="text-muted-foreground font-medium text-right">Exit %</span>
                      {tool.result.pages.slice(0, 10).map((p: any, i: number) => (
                        <React.Fragment key={i}>
                          <span className="text-sm truncate" title={p.url}>{p.url.replace(/^https?:\/\/[^/]+/, "")}</span>
                          <span className="text-sm tabular-nums text-right">{p.pageviews}</span>
                          <span className="text-sm tabular-nums text-right">{p.avgDuration}s</span>
                          <span className={`text-sm tabular-nums text-right ${p.exitRate >= 40 ? "text-red-400" : "text-muted-foreground"}`}>{p.exitRate}%</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
                {toolName === "compare_segments" && tool.result.segmentA && (
                  <div className="mt-2">
                    <div className="grid grid-cols-[1fr,auto,auto] gap-x-4 gap-y-1.5 text-sm">
                      <span className="text-muted-foreground font-medium" />
                      <span className="font-medium text-right">{tool.result.segmentA.label}</span>
                      <span className="font-medium text-right">{tool.result.segmentB.label}</span>
                      {[
                        ["Visitors", tool.result.segmentA.visitors, tool.result.segmentB.visitors],
                        ["Identified", `${tool.result.segmentA.identifiedRate}%`, `${tool.result.segmentB.identifiedRate}%`],
                        ["Paid", `${tool.result.segmentA.paidRate}%`, `${tool.result.segmentB.paidRate}%`],
                        ["Avg Pages", tool.result.segmentA.avgPageviews, tool.result.segmentB.avgPageviews],
                        ["Avg Sessions", tool.result.segmentA.avgSessions, tool.result.segmentB.avgSessions],
                      ].map(([metric, a, b]) => (
                        <React.Fragment key={String(metric)}>
                          <span className="text-muted-foreground">{String(metric)}</span>
                          <span className="tabular-nums text-right">{String(a)}</span>
                          <span className="tabular-nums text-right">{String(b)}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
                {toolName === "find_drop_offs" && tool.result.dropOffs && (
                  <div className="mt-2 space-y-1.5">
                    {tool.result.dropOffs.slice(0, 8).map((d: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={`inline-block size-2 rounded-full shrink-0 ${d.exitRate >= 50 ? "bg-red-500" : d.exitRate >= 30 ? "bg-orange-400" : "bg-yellow-400"}`} />
                        <span className="truncate flex-1" title={d.page}>{d.page.replace(/^https?:\/\/[^/]+/, "")}</span>
                        <span className="text-muted-foreground tabular-nums shrink-0">{d.exitRate}% exit · {d.exits} exits</span>
                      </div>
                    ))}
                  </div>
                )}
                {toolName === "analyze_behavior_patterns" && tool.result.converters && (
                  <div className="mt-2">
                    <div className="grid grid-cols-[1fr,auto,auto] gap-x-4 gap-y-1.5 text-sm">
                      <span className="text-muted-foreground font-medium" />
                      <span className="font-medium text-right text-green-500">Converters</span>
                      <span className="font-medium text-right text-muted-foreground">Others</span>
                      {[
                        ["Count", tool.result.converters.count, tool.result.nonConverters.count],
                        ["Avg Pages", tool.result.converters.avgPageviews, tool.result.nonConverters.avgPageviews],
                        ["Avg Sessions", tool.result.converters.avgSessions, tool.result.nonConverters.avgSessions],
                        ["Avg Events", tool.result.converters.avgEvents, tool.result.nonConverters.avgEvents],
                      ].map(([metric, a, b]) => (
                        <React.Fragment key={String(metric)}>
                          <span className="text-muted-foreground">{String(metric)}</span>
                          <span className="tabular-nums text-right">{String(a)}</span>
                          <span className="tabular-nums text-right">{String(b)}</span>
                        </React.Fragment>
                      ))}
                    </div>
                    {tool.result.converters.topPages?.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Top converter pages: </span>
                        <span className="text-xs">{tool.result.converters.topPages.slice(0, 5).map((p: any) => p.url.replace(/^https?:\/\/[^/]+/, "")).join(", ")}</span>
                      </div>
                    )}
                  </div>
                )}
                {toolName === "analyze_trends" && tool.result.current && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">Current ({tool.result.days}d):</span>
                      <span className="font-medium tabular-nums">{tool.result.metric === "bounceRate" ? tool.result.current.dailyAvg + "%" : tool.result.current.total}</span>
                      {tool.result.previous && (
                        <>
                          <span className="text-muted-foreground">vs previous:</span>
                          <span className={`font-medium tabular-nums flex items-center gap-1 ${tool.result.changePercent > 0 ? (tool.result.metric === "bounceRate" ? "text-red-400" : "text-green-500") : (tool.result.metric === "bounceRate" ? "text-green-500" : "text-red-400")}`}>
                            {tool.result.changePercent > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                            {tool.result.changePercent > 0 ? "+" : ""}{tool.result.changePercent}%
                          </span>
                        </>
                      )}
                    </div>
                    {tool.result.alerts?.length > 0 && (
                      <div className="text-xs text-orange-400">
                        {tool.result.alerts.map((a: string, i: number) => <div key={i}>⚠ {a}</div>)}
                      </div>
                    )}
                    {tool.result.current.dataPoints?.length > 0 && (
                      <div className="flex items-end gap-[2px] h-10">
                        {tool.result.current.dataPoints.map((dp: any, i: number) => {
                          const max = Math.max(...tool.result.current.dataPoints.map((d: any) => d.value || 0), 1);
                          const h = Math.max(((dp.value || 0) / max) * 100, 4);
                          return <div key={i} className="flex-1 rounded-sm bg-primary/60 min-w-[2px]" style={{ height: `${h}%` }} title={`${dp.date}: ${dp.value}`} />;
                        })}
                      </div>
                    )}
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
