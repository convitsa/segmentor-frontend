"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { SegiOrb } from "@/components/segi-orb";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type LiveStatus = "connecting" | "waiting" | "streaming" | "cobrowsing" | "ended" | "error";

interface Props {
  projectId: string;
  sessionId: string;
  visitorId: string;
  onBack: () => void;
  onStatusChange?: (status: LiveStatus) => void;
}

export function LiveSessionViewer({
  projectId,
  sessionId,
  visitorId,
  onBack,
  onStatusChange,
}: Props) {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);
  const eventsRef = useRef<any[]>([]);
  const statusRef = useRef<LiveStatus>("connecting");

  const updateStatus = useCallback(
    (s: LiveStatus) => {
      statusRef.current = s;
      setStatus(s);
      onStatusChange?.(s);
    },
    [onStatusChange],
  );

  const initLiveView = useCallback(async () => {
    try {
      await api.post(`/api/projects/${projectId}/cobrowse/request`, {
        sessionId,
        visitorId,
      });

      const token = localStorage.getItem("segmentor_token");
      if (!token) {
        updateStatus("error");
        return;
      }

      const wsProtocol = API_URL.startsWith("https") ? "wss" : "ws";
      const wsBase = API_URL.replace(/^https?/, wsProtocol);
      const ws = new WebSocket(
        `${wsBase}/ws?token=${encodeURIComponent(token)}`,
      );
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "cb_join", sessionId }));
        updateStatus("waiting");
      };

      ws.onmessage = async (e) => {
        try {
          const msg = JSON.parse(e.data);

          if (msg.type === "cb_visitor_ready") {
            updateStatus("streaming");
          }

          if (
            msg.type === "cb_rrweb" &&
            Array.isArray(msg.events) &&
            msg.events.length > 0
          ) {
            eventsRef.current.push(...msg.events);
            await renderPlayer(msg.events);
          }
        } catch (err) {
          console.error("[LiveSession] ws message error:", err);
        }
      };

      ws.onclose = () => {
        updateStatus("ended");
      };

      ws.onerror = () => {
        updateStatus("error");
      };
    } catch {
      updateStatus("error");
    }
  }, [projectId, sessionId, visitorId, updateStatus]);

  async function renderPlayer(events: any[]) {
    if (!playerRef.current) return;

    if (!playerInstanceRef.current) {
      if (eventsRef.current.length < 2) return;

      const hasSnapshot = eventsRef.current.some(
        (e: any) => e.type === 2 || e.type === "FullSnapshot",
      );
      if (!hasSnapshot) return;

      try {
        const rrwebPlayer = await import("rrweb-player");
        await import("rrweb-player/dist/style.css");

        if (!playerRef.current) return;
        playerRef.current.innerHTML = "";

        const RRWebPlayer =
          rrwebPlayer.default ||
          (rrwebPlayer as any).Player ||
          rrwebPlayer;

        const w = playerRef.current.clientWidth;
        const h = Math.min(w * 0.5625, window.innerHeight - 200);

        playerInstanceRef.current = new RRWebPlayer({
          target: playerRef.current,
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
        console.error("[LiveSession] Failed to init player:", err);
      }
    } else {
      try {
        for (const event of events) {
          playerInstanceRef.current.addEvent(event);
        }
      } catch (err) {
        console.error("[LiveSession] addEvent error:", err);
      }
    }
  }

  useEffect(() => {
    initLiveView();
    return () => {
      if (wsRef.current) wsRef.current.close();
      playerInstanceRef.current = null;
    };
  }, [initLiveView]);

  function sendHighlight() {
    if (!wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(
      JSON.stringify({ type: "cb_highlight", sessionId, selector: "body" }),
    );
  }

  function sendCursor(e: React.MouseEvent) {
    if (
      !wsRef.current ||
      wsRef.current.readyState !== 1 ||
      !playerRef.current
    )
      return;
    if (statusRef.current !== "cobrowsing") return;
    const rect = playerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    wsRef.current.send(
      JSON.stringify({ type: "cb_cursor", sessionId, x, y }),
    );
  }

  async function startCobrowse() {
    updateStatus("cobrowsing");
  }

  async function stopCobrowse() {
    try {
      await api.post(
        `/api/projects/${projectId}/cobrowse/${sessionId}/end`,
        {},
      );
    } catch {}
    if (wsRef.current) wsRef.current.close();
    onBack();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border dark:border-[#484848] overflow-hidden bg-black relative">
        <div
          ref={playerRef}
          className="[&_.rr-player]:!bg-transparent [&_.rr-player__frame]:!bg-transparent min-h-[300px]"
          onMouseMove={
            statusRef.current === "cobrowsing" ? sendCursor : undefined
          }
        >
          {(status === "connecting" || status === "waiting") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
              <SegiOrb size={48} thinking />
              <p className="text-sm text-[#999]">
                {status === "connecting"
                  ? "Connecting to live session..."
                  : "Waiting for visitor stream..."}
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
              <p className="text-sm text-[#999]">
                Failed to connect. The visitor may have left.
              </p>
              <button
                onClick={onBack}
                className="text-sm text-[#fa783e] hover:underline"
              >
                Go back
              </button>
            </div>
          )}

          {status === "ended" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
              <p className="text-sm text-[#999]">
                Live session has ended.
              </p>
              <button
                onClick={onBack}
                className="text-sm text-[#fa783e] hover:underline"
              >
                Go back
              </button>
            </div>
          )}
        </div>
      </div>

      {(status === "streaming" || status === "cobrowsing") && (
        <div className="rounded-2xl border dark:border-[#484848] bg-transparent px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[14px] dark:text-[#C2C0B6]">
                {status === "cobrowsing" ? "Co-browsing" : "Watching live"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {status === "cobrowsing" && (
              <button
                onClick={sendHighlight}
                className="flex items-center justify-center px-[7px] py-[6px] rounded-[91px] bg-[#616161] text-[12px] font-medium text-white hover:bg-[#717171] transition-colors"
              >
                Highlight
              </button>
            )}

            {status === "streaming" && (
              <button
                onClick={startCobrowse}
                className="flex items-center justify-center px-[7px] py-[6px] rounded-[91px] bg-[#fa783e] text-[12px] font-medium text-white hover:bg-[#fa783e]/90 transition-colors"
              >
                Start Co Browsing
              </button>
            )}

            {status === "cobrowsing" && (
              <button
                onClick={stopCobrowse}
                className="flex items-center justify-center px-[7px] py-[6px] rounded-[91px] bg-[#fa783e] text-[12px] font-medium text-white hover:bg-[#fa783e]/90 transition-colors"
              >
                Stop Co Browsing
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
