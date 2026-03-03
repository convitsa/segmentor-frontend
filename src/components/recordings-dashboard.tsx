"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Video,
  Play,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  AlertTriangle,
  Smile,
  Meh,
  Frown,
  Loader2,
  RefreshCw,
  Power,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";
import { RecordingPlayer } from "@/components/recording-player";

interface RecordingItem {
  id: string;
  visitorId: string;
  sessionId: string;
  status: string;
  eventsCount: number;
  duration: number;
  pagesVisited: string[];
  startedAt: string;
  endedAt?: string | null;
  summary?: string | null;
  sentiment?: string | null;
  analyzedAt?: string | null;
  visitor?: {
    visitorId: string;
    name?: string | null;
    email?: string | null;
    country?: string | null;
    countryCode?: string | null;
    device?: string | null;
  } | null;
}

interface RecordingsDashboardProps {
  projectId: string;
}

const SENTIMENT_CONFIG: Record<string, { icon: typeof Smile; label: string; color: string }> = {
  positive: { icon: Smile, label: "Positive", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400" },
  neutral: { icon: Meh, label: "Neutral", color: "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400" },
  frustrated: { icon: Frown, label: "Frustrated", color: "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400" },
};

function DeviceIcon({ device }: { device?: string | null }) {
  if (device === "mobile") return <Smartphone className="h-3.5 w-3.5" />;
  if (device === "tablet") return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function RecordingsDashboard({ projectId }: RecordingsDashboardProps) {
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recordingEnabled, setRecordingEnabled] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("analyzed");
  const [sentimentFilter, setSentimentFilter] = useState("all");

  const loadRecordings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (sentimentFilter && sentimentFilter !== "all") params.set("sentiment", sentimentFilter);
      if (search) params.set("visitorId", search);

      const res = await api.get<{
        recordings: RecordingItem[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/api/projects/${projectId}/recordings?${params.toString()}`);

      setRecordings(res.recordings);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch {
      toast.error("Failed to load recordings");
    } finally {
      setLoading(false);
    }
  }, [projectId, page, statusFilter, sentimentFilter, search]);

  const loadProjectSettings = useCallback(async () => {
    try {
      const project = await api.get<{ recordingEnabled: boolean }>(`/api/projects/${projectId}`);
      setRecordingEnabled(project.recordingEnabled);
    } catch {}
  }, [projectId]);

  useEffect(() => {
    loadRecordings();
    loadProjectSettings();
  }, [loadRecordings, loadProjectSettings]);

  async function toggleRecording() {
    setToggling(true);
    try {
      const res = await api.patch<{ recordingEnabled: boolean }>(
        `/api/projects/${projectId}/settings/recording`,
        { enabled: !recordingEnabled }
      );
      setRecordingEnabled(res.recordingEnabled);
      toast.success(res.recordingEnabled ? "Session recording enabled" : "Session recording disabled");
    } catch {
      toast.error("Failed to update recording settings");
    } finally {
      setToggling(false);
    }
  }

  if (selectedId) {
    return (
      <RecordingPlayer
        projectId={projectId}
        recordingId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by visitor..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="analyzed">Analyzed</SelectItem>
              <SelectItem value="recording">Recording</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sentimentFilter} onValueChange={(v) => { setSentimentFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Sentiment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sentiment</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="frustrated">Frustrated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadRecordings} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant={recordingEnabled ? "default" : "outline"}
            size="sm"
            onClick={toggleRecording}
            disabled={toggling || recordingEnabled === null}
          >
            {toggling ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : recordingEnabled ? (
              <Power className="h-4 w-4 mr-1.5" />
            ) : (
              <PowerOff className="h-4 w-4 mr-1.5" />
            )}
            {recordingEnabled ? "Recording On" : "Recording Off"}
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{total} recording{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Recordings list */}
      {loading && recordings.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : recordings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No recordings yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {recordingEnabled
              ? "Recordings will appear here once visitors start browsing your site."
              : "Enable session recording to start capturing visitor sessions with AI-powered analysis."}
          </p>
          {!recordingEnabled && (
            <Button onClick={toggleRecording} disabled={toggling}>
              <Power className="mr-2 h-4 w-4" />
              Enable Recording
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {recordings.map((rec) => {
            const sentiment = SENTIMENT_CONFIG[rec.sentiment || ""];
            const SentimentIcon = sentiment?.icon;
            return (
              <Card
                key={rec.id}
                className="cursor-pointer hover:border-muted-foreground/30 transition-colors"
                onClick={() => setSelectedId(rec.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Play icon */}
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Play className="h-5 w-5" />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {rec.visitor?.name || rec.visitor?.email || rec.visitorId.slice(0, 12)}
                        </span>
                        {rec.visitor?.countryCode && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {rec.visitor.countryCode}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <DeviceIcon device={rec.visitor?.device} />
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {rec.summary || rec.pagesVisited.join(" → ") || "No summary"}
                      </p>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 shrink-0">
                      {sentiment && SentimentIcon && (
                        <Badge variant="secondary" className={`text-[10px] gap-1 ${sentiment.color}`}>
                          <SentimentIcon className="h-3 w-3" />
                          {sentiment.label}
                        </Badge>
                      )}
                      {rec.status === "analyzing" && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Analyzing
                        </Badge>
                      )}
                      {rec.status === "failed" && (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(rec.duration)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(rec.startedAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
