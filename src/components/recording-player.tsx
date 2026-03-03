"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Loader2,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Smile,
  Meh,
  Frown,
  MousePointerClick,
  AlertTriangle,
  Route,
  Brain,
  RefreshCw,
  Clock,
  FileText,
  Activity,
  ScrollText,
  FormInput,
  PauseCircle,
  Navigation,
  MousePointer,
  Play,
  List,
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface RecordingDetail {
  id: string;
  projectId: string;
  visitorId: string;
  sessionId: string;
  status: string;
  eventsCount: number;
  duration: number;
  pagesVisited: string[];
  startedAt: string;
  endedAt?: string | null;
  summary?: string | null;
  journeySteps?: any[];
  clickPoints?: any[];
  frictionPoints?: any[];
  conversionEvents?: any[];
  sentiment?: string | null;
  analyzedAt?: string | null;
  visitor?: {
    visitorId: string;
    name?: string | null;
    email?: string | null;
    country?: string | null;
    countryCode?: string | null;
    city?: string | null;
    device?: string | null;
    browser?: string | null;
    os?: string | null;
  } | null;
}

interface RecordingPlayerProps {
  projectId: string;
  recordingId: string;
  onBack: () => void;
}

interface TimelineEvent {
  ts: number;
  type: string;
  url?: string;
  title?: string;
  text?: string;
  selector?: string;
  depth?: number;
}

const SENTIMENT_CONFIG: Record<string, { icon: typeof Smile; label: string; color: string }> = {
  positive: { icon: Smile, label: "Positive", color: "text-emerald-600" },
  neutral: { icon: Meh, label: "Neutral", color: "text-amber-600" },
  frustrated: { icon: Frown, label: "Frustrated", color: "text-red-600" },
};

const EVENT_ICONS: Record<string, typeof MousePointer> = {
  click: MousePointerClick,
  scroll: ScrollText,
  input: FormInput,
  page: Navigation,
  idle: PauseCircle,
};

function DeviceIcon({ device }: { device?: string | null }) {
  if (device === "mobile") return <Smartphone className="h-4 w-4" />;
  if (device === "tablet") return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function buildTimeline(rawEvents: any[]): TimelineEvent[] {
  if (!rawEvents?.length) return [];
  const baseTs = rawEvents[0]?.timestamp || 0;
  const tl: TimelineEvent[] = [];
  let lastUrl = "";

  for (const evt of rawEvents) {
    const ts = evt.timestamp - baseTs;
    if (evt.type === 4 && evt.data?.href && evt.data.href !== lastUrl) {
      lastUrl = evt.data.href;
      let title = "";
      try { title = new URL(lastUrl).pathname; } catch { title = lastUrl; }
      tl.push({ ts, type: "page", url: lastUrl, title });
    }
    if (evt.type === 3 && evt.data?.source === 2 && evt.data?.type === 2) {
      tl.push({ ts, type: "click", text: evt.data.__text || "", selector: evt.data.__selector || "" });
    }
    if (evt.type === 3 && evt.data?.source === 3) {
      const prev = tl[tl.length - 1];
      const scrollY = evt.data.y || 0;
      const depth = Math.min(100, Math.round((scrollY + 900) / 3000 * 100));
      if (!prev || prev.type !== "scroll" || Math.abs(depth - (prev.depth || 0)) > 20) {
        tl.push({ ts, type: "scroll", depth });
      }
    }
    if (evt.type === 3 && evt.data?.source === 5) {
      tl.push({ ts, type: "input", selector: `node#${evt.data.id}` });
    }
  }

  const withIdle: TimelineEvent[] = [];
  for (let i = 0; i < tl.length; i++) {
    if (i > 0 && tl[i].ts - tl[i - 1].ts > 10000) {
      withIdle.push({ ts: tl[i - 1].ts, type: "idle" });
    }
    withIdle.push(tl[i]);
  }
  return withIdle;
}

function hasFullSnapshot(events: any[]): boolean {
  return events.some((e: any) => e.type === 2 && e.data?.node);
}

function EventRow({ evt }: { evt: TimelineEvent }) {
  const Icon = EVENT_ICONS[evt.type] || Activity;
  const sec = Math.round(evt.ts / 1000);
  const timeStr = sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;
  let label = evt.type;
  let detail = "";

  switch (evt.type) {
    case "page": label = "Navigated"; detail = evt.title || ""; break;
    case "click": label = evt.text ? `Clicked "${evt.text}"` : "Clicked"; detail = evt.selector || ""; break;
    case "scroll": label = `Scrolled to ${evt.depth}%`; break;
    case "input": label = "Typed in field"; detail = evt.selector || ""; break;
    case "idle": label = "Idle"; break;
  }

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="text-[11px] text-muted-foreground w-12 text-right shrink-0 pt-0.5 font-mono">{timeStr}</span>
      <div className={`h-5 w-5 rounded flex items-center justify-center shrink-0 ${
        evt.type === "click" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300" :
        evt.type === "page" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300" :
        evt.type === "idle" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300" :
        evt.type === "input" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300" :
        "bg-muted text-muted-foreground"
      }`}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {detail && <p className="text-xs text-muted-foreground truncate">{detail}</p>}
      </div>
    </div>
  );
}

export function RecordingPlayer({ projectId, recordingId, onBack }: RecordingPlayerProps) {
  const [recording, setRecording] = useState<RecordingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [viewMode, setViewMode] = useState<"replay" | "timeline">("replay");
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  const loadRecording = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ recording: RecordingDetail }>(`/api/projects/${projectId}/recordings/${recordingId}`);
      setRecording(res.recording);
    } catch {
      toast.error("Failed to load recording");
    } finally {
      setLoading(false);
    }
  }, [projectId, recordingId]);

  useEffect(() => { loadRecording(); }, [loadRecording]);

  useEffect(() => {
    if (!recording || recording.status === "recording") return;
    let cancelled = false;
    setEventsLoading(true);

    const token = typeof window !== "undefined" ? localStorage.getItem("segmentor_token") : null;
    fetch(`${API_URL}/api/projects/${projectId}/recordings/${recordingId}/events`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((events) => {
        if (cancelled) return;
        setRawEvents(events || []);
        setTimeline(buildTimeline(events || []));
        setEventsLoading(false);
      })
      .catch(() => { if (!cancelled) setEventsLoading(false); });

    return () => { cancelled = true; };
  }, [recording, projectId, recordingId]);

  useEffect(() => {
    if (!rawEvents.length || !playerContainerRef.current || viewMode !== "replay") return;
    if (!hasFullSnapshot(rawEvents)) {
      setPlayerError(true);
      setViewMode("timeline");
      return;
    }

    let cancelled = false;
    setPlayerReady(false);
    setPlayerError(false);

    if (playerInstanceRef.current) {
      try { playerInstanceRef.current.$destroy?.(); } catch {}
      playerContainerRef.current.innerHTML = "";
      playerInstanceRef.current = null;
    }

    import("rrweb-player")
      .then((mod) => {
        if (cancelled || !playerContainerRef.current) return;
        const Player = mod.default || mod;
        try {
          playerInstanceRef.current = new Player({
            target: playerContainerRef.current,
            props: {
              events: rawEvents,
              width: playerContainerRef.current.clientWidth,
              height: Math.min(500, playerContainerRef.current.clientWidth * 0.6),
              autoPlay: false,
              showController: true,
              speedOption: [1, 2, 4, 8],
            },
          });
          setPlayerReady(true);
        } catch (err) {
          console.error("rrweb-player init error:", err);
          setPlayerError(true);
          setViewMode("timeline");
        }
      })
      .catch(() => {
        setPlayerError(true);
        setViewMode("timeline");
      });

    return () => {
      cancelled = true;
      if (playerInstanceRef.current) {
        try { playerInstanceRef.current.$destroy?.(); } catch {}
        playerInstanceRef.current = null;
      }
    };
  }, [rawEvents, viewMode]);

  async function handleReanalyze() {
    setReanalyzing(true);
    try {
      await api.post(`/api/projects/${projectId}/recordings/${recordingId}/analyze`, {});
      toast.success("Re-analysis started");
      setTimeout(loadRecording, 3000);
    } catch {
      toast.error("Failed to start re-analysis");
    } finally {
      setReanalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Recording not found</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  const sentiment = SENTIMENT_CONFIG[recording.sentiment || ""];
  const SentimentIcon = sentiment?.icon;
  const journeySteps = (recording.journeySteps as any[]) || [];
  const clickPoints = (recording.clickPoints as any[]) || [];
  const frictionPoints = (recording.frictionPoints as any[]) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold">
              {recording.visitor?.name || recording.visitor?.email || recording.visitorId.slice(0, 16)}
            </h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {recording.visitor?.country && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {recording.visitor.city ? `${recording.visitor.city}, ` : ""}
                  {recording.visitor.country}
                </span>
              )}
              <span className="flex items-center gap-1">
                <DeviceIcon device={recording.visitor?.device} />
                {recording.visitor?.browser || "Unknown"} / {recording.visitor?.os || "Unknown"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(recording.duration)}
              </span>
              {sentiment && SentimentIcon && (
                <span className={`flex items-center gap-1 ${sentiment.color}`}>
                  <SentimentIcon className="h-3 w-3" />
                  {sentiment.label}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleReanalyze} disabled={reanalyzing}>
          {reanalyzing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
          Re-analyze
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Session Replay</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant={viewMode === "replay" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setViewMode("replay")}
                    disabled={playerError}
                  >
                    <Play className="h-3 w-3 mr-1" /> Video
                  </Button>
                  <Button
                    variant={viewMode === "timeline" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setViewMode("timeline")}
                  >
                    <List className="h-3 w-3 mr-1" /> Timeline
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden rounded-b-lg">
              {eventsLoading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                  <span className="text-sm text-muted-foreground">Loading replay...</span>
                </div>
              )}

              {/* Video replay */}
              <div
                ref={playerContainerRef}
                className={eventsLoading || viewMode !== "replay" ? "hidden" : "w-full [&_.rr-player]:!w-full [&_.rr-player__frame]:!w-full [&_.replayer-wrapper]:!mx-auto"}
              />
              {!eventsLoading && viewMode === "replay" && !playerReady && !playerError && rawEvents.length > 0 && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                  <span className="text-sm text-muted-foreground">Initializing player...</span>
                </div>
              )}

              {/* Timeline view */}
              {!eventsLoading && viewMode === "timeline" && (
                <div className="p-4">
                  {timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">
                      {recording.status === "recording" ? "Session still recording..." : "No events recorded"}
                    </p>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto divide-y divide-border/50">
                      {timeline.map((evt, i) => <EventRow key={i} evt={evt} />)}
                    </div>
                  )}
                </div>
              )}

              {!eventsLoading && rawEvents.length === 0 && recording.status !== "recording" && (
                <div className="flex items-center justify-center py-20">
                  <span className="text-sm text-muted-foreground">No events recorded</span>
                </div>
              )}
              {!eventsLoading && recording.status === "recording" && (
                <div className="flex items-center justify-center py-20">
                  <span className="text-sm text-muted-foreground">Session still recording...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {journeySteps.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Route className="h-4 w-4 text-primary" />
                  Journey Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative space-y-0">
                  {journeySteps.map((step: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 pb-4 last:pb-0">
                      <div className="relative flex flex-col items-center">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                          {i + 1}
                        </div>
                        {i < journeySteps.length - 1 && (
                          <div className="w-px h-full bg-border absolute top-6 left-1/2 -translate-x-1/2" />
                        )}
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-medium truncate">{step.page || step.url || "Page"}</p>
                        <p className="text-xs text-muted-foreground">{step.action || "Visited"}</p>
                        {step.durationOnPage && (
                          <p className="text-xs text-muted-foreground">{step.durationOnPage}s on page</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {recording.summary && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  AI Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{recording.summary}</p>
              </CardContent>
            </Card>
          )}

          {clickPoints.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4 text-primary" />
                  Click Points
                  <Badge variant="secondary" className="text-[10px] ml-auto">{clickPoints.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {clickPoints.map((click: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center text-primary text-[10px] shrink-0">
                        {i + 1}
                      </div>
                      <span className="truncate">{click.text || click.selector || "Click"}</span>
                      {click.timestamp != null && (
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">{click.timestamp}s</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {frictionPoints.length > 0 && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  Friction Points
                  <Badge variant="destructive" className="text-[10px] ml-auto">{frictionPoints.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {frictionPoints.map((fp: any, i: number) => (
                    <div key={i} className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 dark:text-red-400 dark:border-red-800">
                          {fp.type || "friction"}
                        </Badge>
                        {fp.page && <span className="text-xs text-muted-foreground truncate">{fp.page}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{fp.description || "Friction detected"}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {recording.pagesVisited.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Pages Visited
                  <Badge variant="secondary" className="text-[10px] ml-auto">{recording.pagesVisited.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {[...new Set(recording.pagesVisited)].map((page, i) => (
                    <p key={i} className="text-xs text-muted-foreground truncate">{page}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {recording.status !== "analyzed" && recording.status !== "recording" && (
            <Card>
              <CardContent className="p-4 text-center">
                {recording.status === "analyzing" ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI analysis in progress...
                  </div>
                ) : recording.status === "failed" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-sm text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      Analysis failed
                    </div>
                    <Button variant="outline" size="sm" onClick={handleReanalyze} disabled={reanalyzing}>
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Ready for analysis</p>
                    <Button variant="outline" size="sm" onClick={handleReanalyze} disabled={reanalyzing}>
                      Analyze Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
