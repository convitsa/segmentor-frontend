"use client";

import { useEffect, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("segmentor_token");
}

export type SSEEvent = {
  type: string;
  data: Record<string, unknown>;
};

export function useSSE(
  projectId: string | null | undefined,
  onEvent: (event: SSEEvent) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const maybeToken = getToken();
    if (!maybeToken) return;
    const token: string = maybeToken;

    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function open() {
      if (closed) return;
      const url = `${API_URL}/api/sse/projects/${projectId}/live?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);

      es.addEventListener("visitor_update", (e) => {
        try {
          onEventRef.current({ type: "visitor_update", data: JSON.parse(e.data) });
        } catch { /* ignore */ }
      });

      es.addEventListener("purchase", (e) => {
        try {
          onEventRef.current({ type: "purchase", data: JSON.parse(e.data) });
        } catch { /* ignore */ }
      });

      es.onerror = () => {
        es.close();
        if (!closed) reconnectTimer = setTimeout(open, 5000);
      };

      esRef.current = es;
    }

    open();

    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [projectId]);
}
