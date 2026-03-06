"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import type { ReplayDetailDTO } from "@/lib/types/dto";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Bot,
  Clock,
  Globe,
  Loader2,
  Monitor,
  MousePointerClick,
  RefreshCw,
  Smartphone,
  Tablet,
} from "lucide-react";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function countryCodeToFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

function DeviceIcon({ device }: { device: string | null }) {
  if (device === "mobile") return <Smartphone className="h-3.5 w-3.5" />;
  if (device === "tablet") return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

interface Props {
  projectId: string;
  sessionId: string;
  onBack: () => void;
}

export function SessionPlayer({ projectId, sessionId, onBack }: Props) {
  const [replay, setReplay] = useState<ReplayDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [journeySummary, setJourneySummary] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ReplayDetailDTO>(
        `/api/projects/${projectId}/replays/${sessionId}`,
      );
      setReplay(res);
      setJourneySummary(res.journeySummary);
    } catch (err: any) {
      setError(err?.message || "Failed to load replay");
    } finally {
      setLoading(false);
    }
  }, [projectId, sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!replay || !playerRef.current) return;

    let mounted = true;
    let playerInstance: any = null;

    async function initPlayer() {
      try {
        const rrwebPlayerModule = await import("rrweb-player");
        await import("rrweb-player/dist/style.css");

        if (!mounted || !playerRef.current) return;

        playerRef.current.innerHTML = "";

        const RRWebPlayer =
          rrwebPlayerModule.default || rrwebPlayerModule.Player;

        playerInstance = new RRWebPlayer({
          target: playerRef.current,
          props: {
            events: replay!.events as any[],
            width: playerRef.current.clientWidth,
            height: Math.min(
              playerRef.current.clientWidth * 0.5625,
              window.innerHeight - 280,
            ),
            autoPlay: false,
            speed: 1,
            speedOption: [1, 2, 4, 8],
            showController: true,
            skipInactive: true,
            inactiveColor: "#525252",
          },
        });

        playerInstanceRef.current = playerInstance;
      } catch (err) {
        console.error("Failed to init player:", err);
        if (mounted) setError("Failed to initialize replay player");
      }
    }

    initPlayer();

    return () => {
      mounted = false;
      if (playerInstance && typeof playerInstance.$destroy === "function") {
        playerInstance.$destroy();
      }
      playerInstanceRef.current = null;
    };
  }, [replay]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  if (error || !replay) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to replays
        </Button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-muted-foreground">
            {error || "Replay not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold dark:text-white">
                {replay.visitorName}
              </h2>
              {replay.status === "recording" && (
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-green-500/10 text-green-500"
                >
                  Live
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {replay.entryUrl || "Unknown page"}
            </p>
          </div>
        </div>
      </div>

      {/* Metadata bar */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {formatDuration(replay.duration)}
        </div>
        <div className="flex items-center gap-1.5">
          <MousePointerClick className="h-3.5 w-3.5" />
          {replay.clickCount} clicks
        </div>
        <div className="flex items-center gap-1.5">
          <DeviceIcon device={replay.device} />
          {replay.device || "—"} · {replay.browser || "—"} · {replay.os || "—"}
        </div>
        <div className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" />
          {replay.country || "—"} {countryCodeToFlag(replay.countryCode)}
        </div>
        <div className="text-muted-foreground/60">
          {new Date(replay.startedAt).toLocaleString()}
        </div>
      </div>

      {/* Player */}
      <div
        ref={playerRef}
        className="rounded-xl border border-border overflow-hidden bg-black/5 dark:bg-white/5"
      />

      {/* AI Journey Summary */}
      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold dark:text-white">
              AI Journey Analysis
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={analyzing}
            onClick={async () => {
              setAnalyzing(true);
              try {
                const res = await api.post<{ journeySummary: string }>(
                  `/api/projects/${projectId}/replays/${sessionId}/analyze`,
                  {},
                );
                setJourneySummary(res.journeySummary);
              } catch {
                /* ignore */
              } finally {
                setAnalyzing(false);
              }
            }}
          >
            {analyzing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : journeySummary ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            ) : (
              <Bot className="h-3.5 w-3.5 mr-1.5" />
            )}
            {analyzing
              ? "Analyzing..."
              : journeySummary
                ? "Re-analyze"
                : "Analyze Session"}
          </Button>
        </div>
        {journeySummary ? (
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {journeySummary}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/60">
            {analyzing
              ? "AI is analyzing the user's session..."
              : "Click \"Analyze Session\" to generate an AI summary of this user's journey."}
          </p>
        )}
      </div>
    </div>
  );
}
