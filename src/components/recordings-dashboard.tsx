"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { ReplayDTO, PaginationDTO } from "@/lib/types/dto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Laptop,
  Monitor,
  MousePointerClick,
  Play,
  Search,
  Smartphone,
  Tablet,
  Trash2,
  X,
} from "lucide-react";
import { SessionPlayer } from "@/components/session-player";

const AVATAR_STYLES = [
  "adventurer",
  "adventurer-neutral",
  "avataaars",
  "big-ears",
  "big-smile",
  "lorelei",
  "notionists",
  "open-peeps",
  "personas",
  "thumbs",
] as const;

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function visitorAvatarUrl(
  v: { visitorEmail?: string | null; visitorId: string },
  size = 80,
): string {
  const seed = v.visitorEmail || v.visitorId;
  const style = AVATAR_STYLES[hashSeed(seed) % AVATAR_STYLES.length];
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

function countryCodeToFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function DeviceIcon({ device }: { device: string | null }) {
  if (device === "mobile") return <Smartphone className="h-3.5 w-3.5" />;
  if (device === "tablet") return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

interface Props {
  projectId: string;
}

export function RecordingsDashboard({ projectId }: Props) {
  const [replays, setReplays] = useState<ReplayDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [device, setDevice] = useState("");
  const [minDuration, setMinDuration] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        sortBy: "startedAt",
        sortOrder: "desc",
      });
      if (search) params.set("visitor", search);
      if (device) params.set("device", device);
      if (minDuration) params.set("minDuration", minDuration);

      const res = await api.get<{
        replays: ReplayDTO[];
        pagination: PaginationDTO;
      }>(`/api/projects/${projectId}/replays?${params}`);
      setReplays(res.replays);
      setPagination(res.pagination);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [projectId, page, search, device, minDuration]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, device, minDuration]);

  async function deleteReplay(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api.delete(`/api/projects/${projectId}/replays/${sessionId}`);
      load();
    } catch {
      /* ignore */
    }
  }

  if (selectedSessionId) {
    return (
      <SessionPlayer
        projectId={projectId}
        sessionId={selectedSessionId}
        onBack={() => setSelectedSessionId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search visitors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={device || "all"} onValueChange={(v) => setDevice(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All devices" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All devices</SelectItem>
            <SelectItem value="desktop">Desktop</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
          </SelectContent>
        </Select>
        <Select value={minDuration || "0"} onValueChange={(v) => setMinDuration(v === "0" ? "" : v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Min duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any duration</SelectItem>
            <SelectItem value="10">10s+</SelectItem>
            <SelectItem value="30">30s+</SelectItem>
            <SelectItem value="60">1m+</SelectItem>
            <SelectItem value="300">5m+</SelectItem>
          </SelectContent>
        </Select>
        {(search || device || minDuration) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setDevice("");
              setMinDuration("");
            }}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Recording list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : replays.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <Play className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No recordings yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Enable session recordings in your project settings and visitor sessions
            will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {replays.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors cursor-pointer group"
                onClick={() => setSelectedSessionId(r.sessionId)}
              >
                <img
                  src={visitorAvatarUrl(r, 80)}
                  alt=""
                  className="h-10 w-10 rounded-full shrink-0 bg-muted object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate dark:text-white">
                      {r.visitorName}
                    </span>
                    {r.status === "recording" && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-green-500/10 text-green-500"
                      >
                        Live
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {r.entryUrl || "Unknown page"}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(r.duration)}
                </div>
                <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <MousePointerClick className="h-3.5 w-3.5" />
                  {r.clickCount}
                </div>
                <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <DeviceIcon device={r.device} />
                  {r.browser || "—"}
                </div>
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <Globe className="h-3.5 w-3.5" />
                  {r.country || "—"} {countryCodeToFlag(r.countryCode)}
                </div>
                <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
                  {timeAgo(r.startedAt)}
                </span>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSessionId(r.sessionId);
                    }}
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => deleteReplay(r.sessionId, e)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {pagination.total} recording{pagination.total !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
