"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { SegiOrb } from "@/components/segi-orb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, MousePointer2, Circle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Props {
  projectId: string;
  sessionId: string;
  visitorId: string;
  onClose: () => void;
}

type CbStatus = "connecting" | "waiting" | "active" | "ended" | "error";

export function CobrowsePanel({ projectId, sessionId, visitorId, onClose }: Props) {
  const [status, setStatus] = useState<CbStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const replayRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const eventsRef = useRef<any[]>([]);

  const initCobrowse = useCallback(async () => {
    try {
      await api.post(`/api/projects/${projectId}/cobrowse/request`, {
        sessionId,
        visitorId,
      });

      const token = localStorage.getItem("segmentor_token");
      if (!token) { setStatus("error"); return; }

      const wsProtocol = API_URL.startsWith("https") ? "wss" : "ws";
      const wsBase = API_URL.replace(/^https?/, wsProtocol);
      const ws = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "cb_join", sessionId }));
        setStatus("waiting");
      };

      ws.onmessage = async (e) => {
        try {
          const msg = JSON.parse(e.data);

          if (msg.type === "cb_visitor_ready") {
            setStatus("active");
          }

          if (msg.type === "cb_rrweb" && Array.isArray(msg.events) && msg.events.length > 0) {
            eventsRef.current.push(...msg.events);
            await renderReplay(msg.events);
          }
        } catch (err) {
          console.error("[CobrowsePanel] ws message error:", err);
        }
      };

      ws.onclose = () => {
        setStatus("ended");
      };

      ws.onerror = () => {
        setStatus("error");
      };
    } catch {
      setStatus("error");
    }
  }, [projectId, sessionId, visitorId]);

  async function renderReplay(events: any[]) {
    if (!replayRef.current) return;

    if (!playerRef.current) {
      if (eventsRef.current.length < 2) return;

      const hasSnapshot = eventsRef.current.some(
        (e: any) => e.type === 2 || e.type === "FullSnapshot",
      );
      if (!hasSnapshot) return;

      try {
        const rrwebPlayer = await import("rrweb-player");
        await import("rrweb-player/dist/style.css");

        if (!replayRef.current) return;
        replayRef.current.innerHTML = "";

        const RRWebPlayer =
          rrwebPlayer.default || (rrwebPlayer as any).Player || rrwebPlayer;

        const w = replayRef.current.clientWidth;
        const h = Math.min(w * 0.5625, window.innerHeight - 200);

        playerRef.current = new RRWebPlayer({
          target: replayRef.current,
          props: {
            events: eventsRef.current,
            width: w,
            height: Math.max(h, 300),
            autoPlay: true,
            showController: false,
            liveMode: true,
            skipInactive: true,
          },
        });
      } catch (err) {
        console.error("[CobrowsePanel] Failed to init player:", err);
      }
    } else {
      try {
        for (const event of events) {
          playerRef.current.addEvent(event);
        }
      } catch (err) {
        console.error("[CobrowsePanel] addEvent error:", err);
      }
    }
  }

  useEffect(() => {
    initCobrowse();
    return () => {
      if (wsRef.current) wsRef.current.close();
      playerRef.current = null;
    };
  }, [initCobrowse]);

  function sendCursor(e: React.MouseEvent) {
    if (!wsRef.current || wsRef.current.readyState !== 1 || !replayRef.current) return;
    const rect = replayRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    wsRef.current.send(JSON.stringify({ type: "cb_cursor", sessionId, x, y }));
  }

  function sendHighlight() {
    if (!wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({
      type: "cb_highlight",
      sessionId,
      selector: "body",
    }));
  }

  const endSession = async () => {
    try {
      await api.post(`/api/projects/${projectId}/cobrowse/${sessionId}/end`, {});
    } catch {}
    if (wsRef.current) wsRef.current.close();
    onClose();
  };

  const statusConfig: Record<CbStatus, { label: string; color: string }> = {
    connecting: { label: "Connecting...", color: "bg-yellow-500" },
    waiting: { label: "Waiting for visitor", color: "bg-yellow-500" },
    active: { label: "Live", color: "bg-green-500" },
    ended: { label: "Session ended", color: "bg-gray-500" },
    error: { label: "Connection failed", color: "bg-red-500" },
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] rounded-xl overflow-hidden border dark:border-[#484848]">
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-[#484848] bg-[#222]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${statusConfig[status].color} ${status === "active" ? "animate-pulse" : ""}`} />
            <span className="text-sm font-medium text-white">{statusConfig[status].label}</span>
          </div>
          <Badge variant="outline" className="text-[11px] text-[#999]">
            {sessionId.substring(0, 12)}...
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {status === "active" && (
            <Button variant="ghost" size="sm" className="text-xs h-7 text-[#999] hover:text-white" onClick={sendHighlight}>
              <MousePointer2 className="h-3.5 w-3.5 mr-1" />
              Highlight
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-xs h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={endSession}>
            <X className="h-3.5 w-3.5 mr-1" />
            End
          </Button>
        </div>
      </div>

      <div
        ref={replayRef}
        className="flex-1 min-h-0 relative"
        onMouseMove={status === "active" ? sendCursor : undefined}
      >
        {(status === "connecting" || status === "waiting") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <SegiOrb size={48} thinking />
            <p className="text-sm text-[#999]">
              {status === "connecting" ? "Initiating co-browse session..." : "Waiting for visitor to connect..."}
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Circle className="h-12 w-12 text-red-500/50" />
            <p className="text-sm text-[#999]">Failed to connect. The visitor may have left.</p>
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        )}

        {status === "ended" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <p className="text-sm text-[#999]">Co-browse session has ended.</p>
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}
