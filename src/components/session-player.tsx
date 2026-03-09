"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { ReplayDetailDTO } from "@/lib/types/dto";
import { SegiOrb } from "@/components/segi-orb";
import {
  Loader2,
  Play,
  Pause,
  Sparkles,
  SkipBack,
  SkipForward,
  ChevronDown,
  FastForward,
} from "lucide-react";
import { cn } from "@/lib/utils";

const INACTIVE_THRESHOLD_MS = 5000;

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface TimelineSegment {
  startMs: number;
  endMs: number;
  inactive: boolean;
}

function computeSegments(events: any[]): TimelineSegment[] {
  if (!events || events.length < 2) return [];
  const sorted = [...events]
    .filter((e) => typeof e.timestamp === "number")
    .sort((a, b) => a.timestamp - b.timestamp);
  if (sorted.length < 2) return [];

  const t0 = sorted[0].timestamp;
  const segments: TimelineSegment[] = [];
  let cursor = 0;

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].timestamp - sorted[i - 1].timestamp;
    const segEnd = sorted[i - 1].timestamp - t0;
    if (gap >= INACTIVE_THRESHOLD_MS) {
      if (segEnd > cursor) {
        segments.push({ startMs: cursor, endMs: segEnd, inactive: false });
      }
      segments.push({
        startMs: segEnd,
        endMs: sorted[i].timestamp - t0,
        inactive: true,
      });
      cursor = sorted[i].timestamp - t0;
    }
  }
  const last = sorted[sorted.length - 1].timestamp - t0;
  if (last > cursor) {
    segments.push({ startMs: cursor, endMs: last, inactive: false });
  }
  return segments;
}

interface Props {
  projectId: string;
  sessionId: string;
  onBack: () => void;
}

export function SessionPlayer({ projectId, sessionId, onBack }: Props) {
  const router = useRouter();
  const [replay, setReplay] = useState<ReplayDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const analyzing = false;
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [skipInactive, setSkipInactive] = useState(true);
  const progressRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef(false);
  const skipInactiveRef = useRef(true);
  const [skipping, setSkipping] = useState(false);
  const segmentsRef = useRef<TimelineSegment[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ReplayDetailDTO>(
        `/api/projects/${projectId}/replays/${sessionId}`,
      );
      setReplay(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load recording");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, sessionId]);

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
              window.innerHeight - 220,
            ),
            autoPlay: false,
            speed: 1,
            speedOption: [1, 2, 4, 8],
            showController: false,
            skipInactive: true,
            inactiveColor: "#525252",
          },
        });

        playerInstanceRef.current = playerInstance;

        try {
          const meta = playerInstance.getMetaData();
          if (meta?.totalTime) setTotalTime(meta.totalTime);
        } catch { /* some versions may not expose this immediately */ }

        playerInstance.addEventListener("finish", () => {
          isPlayingRef.current = false;
          setIsPlaying(false);
        });
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

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = setInterval(() => {
      const p = playerInstanceRef.current;
      if (!p || !isPlayingRef.current) return;
      try {
        const replayer = p.getReplayer();
        if (!replayer) return;
        const t = replayer.getCurrentTime();
        setCurrentTime(t);
        const meta = replayer.getMetaData();
        if (meta?.totalTime) {
          setTotalTime((old) => old || meta.totalTime);
        }
        if (meta?.totalTime && t >= meta.totalTime) {
          isPlayingRef.current = false;
          setIsPlaying(false);
        }

        const inInactive = segmentsRef.current.some(
          (s) => s.inactive && t >= s.startMs && t < s.endMs,
        );
        setSkipping(skipInactiveRef.current && inInactive);
      } catch { /* ignore */ }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [replay]);

  function togglePlay() {
    const p = playerInstanceRef.current;
    if (!p) return;
    try {
      if (isPlayingRef.current) {
        p.pause();
        isPlayingRef.current = false;
        setIsPlaying(false);
      } else {
        p.play();
        isPlayingRef.current = true;
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("togglePlay error:", err);
    }
  }

  function changeSpeed(newSpeed: number) {
    setSpeed(newSpeed);
    setSpeedMenuOpen(false);
    const p = playerInstanceRef.current;
    if (!p) return;
    try { p.setSpeed(newSpeed); } catch { /* ignore */ }
  }

  const segments = useMemo(() => {
    const segs = replay ? computeSegments(replay.events as any[]) : [];
    segmentsRef.current = segs;
    return segs;
  }, [replay]);

  function setSkipInactiveState(value: boolean) {
    if (skipInactiveRef.current === value) return;
    setSkipInactive(value);
    skipInactiveRef.current = value;
    const p = playerInstanceRef.current;
    if (!p) return;
    try { p.toggleSkipInactive(); } catch { /* ignore */ }
  }

  function toggleSkipInactive() {
    setSkipInactiveState(!skipInactiveRef.current);
  }

  function isInactiveAt(ms: number): boolean {
    return segments.some((s) => s.inactive && ms >= s.startMs && ms < s.endMs);
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const bar = progressRef.current;
    const p = playerInstanceRef.current;
    if (!bar || !p || !totalTime) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = Math.floor(ratio * totalTime);

    if (isInactiveAt(newTime) && skipInactiveRef.current) {
      setSkipInactiveState(false);
    }

    try {
      p.goto(newTime, isPlayingRef.current);
      setCurrentTime(newTime);
    } catch { /* ignore */ }
  }

  function handleSkipBack() {
    const p = playerInstanceRef.current;
    if (!p) return;
    const newTime = Math.max(0, currentTime - 10000);
    try {
      p.goto(newTime, isPlaying);
      setCurrentTime(newTime);
    } catch { /* ignore */ }
  }

  function handleSkipForward() {
    const p = playerInstanceRef.current;
    if (!p || !totalTime) return;
    const newTime = Math.min(totalTime, currentTime + 10000);
    try {
      p.goto(newTime, isPlaying);
      setCurrentTime(newTime);
    } catch { /* ignore */ }
  }

  function handleAnalyze() {
    if (!replay) return;
    router.push(
      `/dashboard/projects/${projectId}?section=chat&prefillRecording=${sessionId}&prefillMessage=${encodeURIComponent("Summarize this recording")}`,
    );
  }

  const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[520px]">
        <SegiOrb size={48} thinking />
      </div>
    );
  }

  if (error || !replay) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted-foreground">
          {error || "Recording not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Player */}
      <div className="rounded-2xl border dark:border-[#484848] overflow-hidden bg-black dark:bg-black relative">
        <div ref={playerRef} className="[&_.rr-player]:!bg-transparent [&_.rr-player__frame]:!bg-transparent" />
        {/* Skip inactivity overlay */}
        <div
          className={cn(
            "absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-300 bg-black/60",
            skipping ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="flex items-center gap-2.5 rounded-xl bg-white/10 backdrop-blur-md px-5 py-3">
            <FastForward className="size-5 text-[#FA783E] animate-pulse" />
            <span className="text-[14px] font-medium text-white">Skipping inactivity</span>
          </div>
        </div>
      </div>

      {/* Custom Controls */}
      <div className="rounded-2xl border dark:border-[#484848] bg-transparent px-4 py-3 flex flex-col gap-3">
        {/* Segmented timeline */}
        <div
          ref={progressRef}
          className="w-full h-2 rounded-full bg-white/10 cursor-pointer relative overflow-hidden group/tl"
          onClick={handleProgressClick}
        >
          {/* Layer 1: orange played fill */}
          <div
            className="absolute inset-y-0 left-0 bg-[#FA783E] pointer-events-none"
            style={{ width: `${progress}%` }}
          />
          {/* Layer 2: inactive segments with played/unplayed colors */}
          {totalTime > 0 && segments.filter((s) => s.inactive).map((seg, i) => {
            const leftPct = (seg.startMs / totalTime) * 100;
            const widthPct = ((seg.endMs - seg.startMs) / totalTime) * 100;

            if (currentTime <= seg.startMs) {
              return (
                <div
                  key={i}
                  className="absolute inset-y-0 pointer-events-none"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: "#525252" }}
                />
              );
            }
            if (currentTime >= seg.endMs) {
              return (
                <div
                  key={i}
                  className="absolute inset-y-0 pointer-events-none"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: "#8a5a3e" }}
                />
              );
            }
            const frac = (currentTime - seg.startMs) / (seg.endMs - seg.startMs);
            return (
              <div key={i} className="absolute inset-y-0 pointer-events-none" style={{ left: `${leftPct}%`, width: `${widthPct}%` }}>
                <div className="absolute inset-y-0 left-0" style={{ width: `${frac * 100}%`, backgroundColor: "#8a5a3e" }} />
                <div className="absolute inset-y-0 right-0" style={{ width: `${(1 - frac) * 100}%`, backgroundColor: "#525252" }} />
              </div>
            );
          })}
          {/* Layer 3: playhead dot on hover */}
          {totalTime > 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3.5 rounded-full bg-white shadow-md opacity-0 group-hover/tl:opacity-100 transition-opacity pointer-events-none z-10"
              style={{ left: `${progress}%` }}
            />
          )}
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="flex size-8 items-center justify-center rounded-full bg-[#FA783E] text-white hover:bg-[#FA783E]/90 transition-colors"
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
            </button>
            <span className="text-[14px] dark:text-[#C2C0B6] tabular-nums">
              {formatTime(currentTime)} / {formatTime(totalTime)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Analyze with AI */}
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-white text-[13px] font-medium transition-all disabled:opacity-60 hover:brightness-110"
              style={{ background: "linear-gradient(90deg, #C0CC4C 0%, #F4925A 37%, #D0B659 84%, #76CB69 100%)" }}
            >
              {analyzing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              <span>{analyzing ? "Analyzing..." : "Analyze with AI"}</span>
            </button>

            {/* Skip Inactive */}
            <button
              onClick={toggleSkipInactive}
              className="flex items-center gap-2 text-[14px] dark:text-[#C2C0B6] hover:dark:text-white transition-colors"
            >
              <div className={cn(
                "w-8 h-4 rounded-full transition-colors relative",
                skipInactive ? "bg-[#FA783E]" : "dark:bg-white/20"
              )}>
                <div className={cn(
                  "absolute top-0.5 size-3 rounded-full bg-white transition-transform",
                  skipInactive ? "translate-x-[18px]" : "translate-x-0.5"
                )} />
              </div>
              <span>Skip inactive</span>
            </button>

            {/* Speed */}
            <div className="relative">
              <button
                onClick={() => setSpeedMenuOpen((o) => !o)}
                className="flex items-center gap-1 text-[14px] dark:text-[#C2C0B6] hover:dark:text-white transition-colors"
              >
                <span>{speed}x</span>
                <ChevronDown className="size-4" />
              </button>
              {speedMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSpeedMenuOpen(false)} />
                  <div className="absolute bottom-full right-0 mb-2 z-50 rounded-lg dark:bg-[#3d3d3d] dark:border-[#484848] border shadow-lg py-1 min-w-[60px]">
                    {[1, 2, 4, 8].map((s) => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={cn(
                          "w-full text-left px-3 py-1 text-[13px] hover:dark:bg-[#484848] transition-colors",
                          s === speed ? "dark:text-white font-medium" : "dark:text-[#C2C0B6]"
                        )}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Skip Back / Forward (10s) */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleSkipBack}
                className="size-5 flex items-center justify-center dark:text-[#C2C0B6] hover:dark:text-white transition-colors"
              >
                <SkipBack className="size-5" />
              </button>
              <button
                onClick={handleSkipForward}
                className="size-5 flex items-center justify-center dark:text-[#C2C0B6] hover:dark:text-white transition-colors"
              >
                <SkipForward className="size-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
