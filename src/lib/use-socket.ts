"use client";

import { useEffect, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("segmentor_token");
}

function buildWsUrl(token: string): string {
  const url = new URL(API_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.searchParams.set("token", token);
  return url.toString();
}

export type SocketEvent = {
  type: string;
  data: Record<string, unknown>;
};

const LIVE_EVENTS = new Set([
  "visitor_update",
  "visitor_offline",
  "purchase",
  "live:pageview",
  "live:pageview_end",
  "live:click",
  "live:form_submit",
  "live:identify",
  "live:custom",
  "live:impression",
  "recording:update",
  "recording:end",
  "analytics:activity",
  "heatmap:new",
]);

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 5000;

export function useSocket(
  projectId: string | null | undefined,
  onEvent: (event: SocketEvent) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const token = getToken();
    if (!token) return;
    const validToken: string = token;

    let disposed = false;
    let reconnectDelay = RECONNECT_BASE_MS;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (disposed) return;

      const ws = new WebSocket(buildWsUrl(validToken));
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectDelay = RECONNECT_BASE_MS;
        ws.send(JSON.stringify({ type: "join", projectId }));
        if (process.env.NODE_ENV === "development") {
          console.log("[Segmentor] WS connected, joining project:", projectId);
        }
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type && LIVE_EVENTS.has(msg.type)) {
            if (process.env.NODE_ENV === "development") {
              console.log("[Segmentor] WS event:", msg.type, msg.data);
            }
            onEventRef.current({ type: msg.type, data: msg.data ?? {} });
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (disposed) return;
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
          connect();
        }, reconnectDelay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      const ws = wsRef.current;
      if (ws) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "leave", projectId }));
        }
        ws.close();
        wsRef.current = null;
      }
    };
  }, [projectId]);
}
