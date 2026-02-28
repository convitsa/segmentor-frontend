"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useSSE } from "@/lib/use-sse";
import type {
  VisitorDTO,
  SessionDTO,
  TimelineEntry,
  PaginationDTO,
} from "@/lib/types/dto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  DollarSign,
  Eye,
  Globe,
  Laptop,
  Monitor,
  MousePointerClick,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  Tablet,
  User,
  FileText,
  Zap,
  ShoppingCart,
  Activity,
  MapPin,
  X,
  Copy,
} from "lucide-react";

/* ─── Friendly Name Generator ─── */

const ADJECTIVES = [
  "friendly", "cosmic", "swift", "gentle", "bold", "clever", "bright",
  "calm", "happy", "brave", "quiet", "wild", "warm", "cool", "wise",
  "noble", "eager", "lucky", "merry", "vivid", "azure", "coral",
  "golden", "silver", "amber", "crimson", "jade", "violet", "rustic",
  "lively", "daring", "witty", "sleek", "rapid", "steady", "keen",
  "fierce", "serene", "jolly", "plucky", "nimble", "peppy", "breezy",
];

const ANIMALS = [
  "lizard", "panda", "falcon", "fox", "owl", "dolphin", "wolf",
  "tiger", "hawk", "bear", "rabbit", "otter", "raven", "lynx",
  "eagle", "koala", "badger", "crane", "heron", "swan", "jaguar",
  "gazelle", "phoenix", "sparrow", "turtle", "bison", "panther",
  "coyote", "finch", "osprey", "mongoose", "marten", "penguin",
  "toucan", "ibis", "condor", "stork", "oriole", "wombat", "lemur",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function friendlyName(visitorId: string): string {
  const h = hashStr(visitorId);
  const adj = ADJECTIVES[h % ADJECTIVES.length];
  const animal = ANIMALS[(h >> 8) % ANIMALS.length];
  return `${adj} ${animal}`;
}

/* ─── Avatar URL ─── */

const AVATAR_STYLES = ["adventurer", "adventurer-neutral", "avataaars", "big-ears", "big-smile", "lorelei", "notionists", "open-peeps", "personas", "thumbs"] as const;

function avatarUrl(v: VisitorDTO, size = 80): string {
  const seed = v.email || v.visitorId;
  const style = AVATAR_STYLES[hashStr(seed) % AVATAR_STYLES.length];
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

function VisitorAvatar({ visitor, size = "md" }: { visitor: VisitorDTO; size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "h-15 w-15" : size === "lg" ? "h-50 w-50" : "h-15 w-15";
  const px = size === "sm" ? 40 : size === "lg" ? 80 : 48;
  return (
    <img
      src={avatarUrl(visitor, px * 2)}
      alt=""
      className={`${dim} rounded-full shrink-0 bg-muted object-cover`}
      loading="lazy"
    />
  );
}

/* ─── Helpers ─── */

interface Props {
  projectId: string;
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function formatRevenue(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function DeviceIcon({ device, className }: { device?: string | null; className?: string }) {
  const c = className || "h-3.5 w-3.5";
  if (device === "mobile") return <Smartphone className={c} />;
  if (device === "tablet") return <Tablet className={c} />;
  return <Monitor className={c} />;
}

function countryFlag(code?: string | null) {
  if (!code || code.length !== 2) return "";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function displayName(v: VisitorDTO) {
  return v.name || v.email || friendlyName(v.visitorId);
}

function browserIcon(browser?: string | null) {
  const b = (browser || "").toLowerCase();
  if (b.includes("chrome")) return "Chrome";
  if (b.includes("safari")) return "Safari";
  if (b.includes("firefox")) return "Firefox";
  if (b.includes("edge")) return "Edge";
  if (b.includes("opera")) return "Opera";
  return browser || "Browser";
}

/* ═══════════════════════════════════════════
   Main Export
   ═══════════════════════════════════════════ */

export function VisitorsDashboard({ projectId }: Props) {
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function openVisitor(vid: string) {
    setSelectedVisitorId(vid);
    setSheetOpen(true);
  }

  function closeVisitor() {
    setSheetOpen(false);
    setTimeout(() => setSelectedVisitorId(null), 300);
  }

  return (
    <>
      <VisitorsList projectId={projectId} onSelect={openVisitor} />
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeVisitor(); }}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="h-[85vh] rounded-t-2xl p-0 flex flex-col"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Visitor Details</SheetTitle>
            <SheetDescription>Detailed visitor information and timeline</SheetDescription>
          </SheetHeader>
          {selectedVisitorId && (
            <VisitorDetailPanel
              projectId={projectId}
              visitorId={selectedVisitorId}
              onClose={closeVisitor}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ═══════════════════════════════════════════
   Visitors List
   ═══════════════════════════════════════════ */

function VisitorsList({
  projectId,
  onSelect,
}: {
  projectId: string;
  onSelect: (visitorId: string) => void;
}) {
  const [visitors, setVisitors] = useState<VisitorDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationDTO | null>(null);
  const [stats, setStats] = useState<{ totalVisitors: number; identifiedVisitors: number; paidVisitors: number; totalRevenue: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("lastSeenAt");
  const [filterDevice, setFilterDevice] = useState("all");
  const [filterIdentified, setFilterIdentified] = useState("all");
  const [filterRevenue, setFilterRevenue] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      params.set("sortBy", sortBy);
      params.set("sortOrder", "desc");
      if (search) params.set("search", search);
      if (filterDevice !== "all") params.set("device", filterDevice);
      if (filterIdentified !== "all") params.set("identified", filterIdentified);
      if (filterRevenue === "paid") params.set("hasRevenue", "true");

      const res = await api.get<{
        visitors: VisitorDTO[];
        pagination: PaginationDTO;
        stats: { totalVisitors: number; identifiedVisitors: number; paidVisitors: number; totalRevenue: number };
      }>(`/api/projects/${projectId}/visitors?${params.toString()}`);
      setVisitors(res.visitors);
      setPagination(res.pagination);
      setStats(res.stats);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [projectId, page, sortBy, search, filterDevice, filterIdentified, filterRevenue]);

  useEffect(() => { load(); }, [load]);

  useSSE(projectId, useCallback((event) => {
    if (event.type === "visitor_update") {
      const d = event.data as { visitorId: string; timestamp: string; pageviews?: number; events?: number };
      setVisitors((prev) =>
        prev.map((v) =>
          v.visitorId === d.visitorId
            ? { ...v, lastSeenAt: d.timestamp, totalPageviews: v.totalPageviews + (d.pageviews || 0), totalEvents: v.totalEvents + (d.events || 0) }
            : v
        )
      );
    } else if (event.type === "purchase") {
      const d = event.data as { visitorId: string; amount?: number };
      if (d.visitorId && d.amount) {
        setVisitors((prev) =>
          prev.map((v) =>
            v.visitorId === d.visitorId
              ? { ...v, totalRevenue: v.totalRevenue + d.amount! }
              : v
          )
        );
      }
    }
  }, []));

  const liveCount = visitors.filter((v) => {
    return Date.now() - new Date(v.lastSeenAt).getTime() < 5 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-border">
          <div className="p-4">
            <div className="text-xs text-muted-foreground">Total Visitors</div>
            <div className="text-2xl font-bold mt-0.5">{stats?.totalVisitors ?? pagination?.total ?? 0}</div>
          </div>
          <div className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live Now
            </div>
            <div className="text-2xl font-bold text-green-600 mt-0.5">{liveCount}</div>
          </div>
          <div className="p-4">
            <div className="text-xs text-muted-foreground">Identified</div>
            <div className="text-2xl font-bold mt-0.5">{stats?.identifiedVisitors ?? 0}</div>
          </div>
          <div className="p-4">
            <div className="text-xs text-muted-foreground">Paid Customers</div>
            <div className="text-2xl font-bold mt-0.5">{stats?.paidVisitors ?? 0}</div>
          </div>
          <div className="p-4">
            <div className="text-xs text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold mt-0.5">{formatRevenue(stats?.totalRevenue ?? 0)}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search visitors..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lastSeenAt">Last Seen</SelectItem>
            <SelectItem value="firstSeenAt">First Seen</SelectItem>
            <SelectItem value="totalPageviews">Pageviews</SelectItem>
            <SelectItem value="totalSessions">Sessions</SelectItem>
            <SelectItem value="totalRevenue">Revenue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDevice} onValueChange={(v) => { setFilterDevice(v); setPage(1); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Device" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Devices</SelectItem>
            <SelectItem value="desktop">Desktop</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterIdentified} onValueChange={(v) => { setFilterIdentified(v); setPage(1); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Identity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Identified</SelectItem>
            <SelectItem value="false">Anonymous</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRevenue} onValueChange={(v) => { setFilterRevenue(v); setPage(1); }}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Revenue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Visitor Rows */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : visitors.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <User className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No visitors found.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Data will appear once your tracking script is installed.
              </p>
            </CardContent>
          </Card>
        ) : (
          visitors.map((v) => (
            <VisitorRow key={v.visitorId} visitor={v} onClick={() => onSelect(v.visitorId)} />
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} visitors)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Visitor Row (like the reference design) ─── */

function VisitorRow({ visitor: v, onClick }: { visitor: VisitorDTO; onClick: () => void }) {
  const isLive = Date.now() - new Date(v.lastSeenAt).getTime() < 5 * 60 * 1000;

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/40 group"
      onClick={onClick}
    >
      <CardContent className="py-3.5 px-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <VisitorAvatar visitor={v} />

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{displayName(v)}</span>
              {v.email && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400">
                  Identified
                </Badge>
              )}
              {v.totalRevenue > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400">
                  Customer
                </Badge>
              )}
              {isLive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              {v.countryCode && (
                <span className="flex items-center gap-1">
                  <span className="text-sm leading-none">{countryFlag(v.countryCode)}</span>
                  {v.city || v.country}
                </span>
              )}
              {v.device && (
                <span className="flex items-center gap-1">
                  <DeviceIcon device={v.device} className="h-3 w-3" />
                  <span className="capitalize">{v.device}</span>
                </span>
              )}
              {v.os && <span>{v.os}</span>}
              {v.browser && <span>{browserIcon(v.browser)}</span>}
            </div>
          </div>

          {/* Right side stats */}
          <div className="hidden sm:flex items-center gap-6 text-sm shrink-0">
            <div className="text-right">
              <div className="font-medium tabular-nums">{v.totalPageviews}</div>
              <div className="text-[10px] text-muted-foreground">pages</div>
            </div>
            <div className="text-right">
              <div className="font-medium tabular-nums">{v.totalSessions}</div>
              <div className="text-[10px] text-muted-foreground">sessions</div>
            </div>
            {v.totalRevenue > 0 && (
              <div className="text-right">
                <div className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatRevenue(v.totalRevenue)}
                </div>
                <div className="text-[10px] text-muted-foreground">revenue</div>
              </div>
            )}
          </div>

          {/* Time */}
          <div className="text-xs text-muted-foreground text-right shrink-0 w-16">
            {formatTimeAgo(v.lastSeenAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════
   Visitor Detail Panel (Bottom Sheet)
   ═══════════════════════════════════════════ */

function VisitorDetailPanel({
  projectId,
  visitorId,
  onClose,
}: {
  projectId: string;
  visitorId: string;
  onClose: () => void;
}) {
  const [visitor, setVisitor] = useState<VisitorDTO | null>(null);
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [timelinePagination, setTimelinePagination] = useState<PaginationDTO | null>(null);
  const [timelinePage, setTimelinePage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{
        visitor: VisitorDTO;
        recentSessions: SessionDTO[];
        purchases: any[];
      }>(`/api/projects/${projectId}/visitors/${visitorId}`);
      setVisitor(res.visitor);
      setSessions(res.recentSessions);
      setPurchases(res.purchases);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [projectId, visitorId]);

  const loadTimeline = useCallback(async () => {
    try {
      const res = await api.get<{
        timeline: TimelineEntry[];
        pagination: PaginationDTO;
      }>(`/api/projects/${projectId}/visitors/${visitorId}/timeline?page=${timelinePage}&limit=50`);
      setTimeline(res.timeline);
      setTimelinePagination(res.pagination);
    } catch { /* ignore */ }
  }, [projectId, visitorId, timelinePage]);

  useEffect(() => { loadDetail(); }, [loadDetail]);
  useEffect(() => { loadTimeline(); }, [loadTimeline]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Visitor not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Drag handle + close */}
      <div className="flex items-center justify-center pt-3 pb-1">
        <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
      </div>
      <div className="absolute top-3 right-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left: Profile */}
        <div className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r p-6 flex flex-col gap-5 overflow-y-auto">
          {/* Avatar + Name */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left gap-3">
            <VisitorAvatar visitor={visitor} size="lg" />
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
                <h2 className="text-lg font-semibold truncate max-w-[220px]">
                  {displayName(visitor)}
                </h2>
                {visitor.email && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400">
                    Identified
                  </Badge>
                )}
                {visitor.totalRevenue > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0">
                    Paid Customer
                  </Badge>
                )}
              </div>
              {visitor.email && (
                <p className="text-xs text-muted-foreground mt-0.5">{visitor.email}</p>
              )}
              {visitor.name && visitor.name !== visitor.email && (
                <p className="text-xs text-muted-foreground">{visitor.name}</p>
              )}
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-3 text-sm">
            {visitor.countryCode && (
              <div className="flex items-center gap-2.5">
                <span className="text-lg leading-none">{countryFlag(visitor.countryCode)}</span>
                <span>{[visitor.city, visitor.country].filter(Boolean).join(", ")}</span>
              </div>
            )}
            {visitor.device && (
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <DeviceIcon device={visitor.device} className="h-4 w-4" />
                <span className="capitalize">{visitor.device}</span>
                {visitor.os && <span className="text-xs">({visitor.os})</span>}
              </div>
            )}
            {visitor.browser && (
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>{browserIcon(visitor.browser)}</span>
              </div>
            )}
            {visitor.language && (
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{visitor.language}</span>
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatBox icon={<Eye className="h-3.5 w-3.5" />} label="Pageviews" value={visitor.totalPageviews} />
            <StatBox icon={<Laptop className="h-3.5 w-3.5" />} label="Sessions" value={visitor.totalSessions} />
            <StatBox icon={<Zap className="h-3.5 w-3.5" />} label="Events" value={visitor.totalEvents} />
            <StatBox icon={<DollarSign className="h-3.5 w-3.5" />} label="Revenue" value={visitor.totalRevenue > 0 ? formatRevenue(visitor.totalRevenue) : "$0"} />
          </div>

          {/* Purchases */}
          {purchases.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Purchases</p>
              {purchases.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded-md bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShoppingCart className="h-3 w-3 text-green-500 shrink-0" />
                    <span className="truncate font-medium">{p.productName || p.type}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.amount && (
                      <span className="font-semibold">{formatRevenue(p.amount)}</span>
                    )}
                    <span className="text-muted-foreground">{formatTimeAgo(p.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* UTM / referrer */}
          {(visitor.firstUtmSource || visitor.firstReferrer) && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Acquisition</p>
              {visitor.firstReferrer && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  <span className="truncate">{visitor.firstReferrer}</span>
                </div>
              )}
              {visitor.firstUtmSource && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>utm_source:</span>
                  <Badge variant="outline" className="text-[10px] h-4">{visitor.firstUtmSource}</Badge>
                </div>
              )}
              {visitor.firstUtmMedium && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>utm_medium:</span>
                  <Badge variant="outline" className="text-[10px] h-4">{visitor.firstUtmMedium}</Badge>
                </div>
              )}
              {visitor.firstUtmCampaign && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>utm_campaign:</span>
                  <Badge variant="outline" className="text-[10px] h-4">{visitor.firstUtmCampaign}</Badge>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Timeline */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Date header */}
          <div className="px-6 py-3 border-b bg-muted/30 flex items-center justify-between">
            <span className="text-sm font-medium">
              {visitor.lastSeenAt ? formatFullDate(visitor.lastSeenAt) : "Activity"}
            </span>
            {timelinePagination && (
              <span className="text-xs text-muted-foreground">
                {timelinePagination.total} events
              </span>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-1">
              {timeline.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No activity recorded yet.</p>
              ) : (
                timeline.map((entry, i) => (
                  <TimelineRow key={i} entry={entry} />
                ))
              )}

              {timelinePagination && timelinePagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={timelinePage <= 1}
                    onClick={() => setTimelinePage(timelinePage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {timelinePagination.page} / {timelinePagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={timelinePage >= (timelinePagination?.totalPages || 1)}
                    onClick={() => setTimelinePage(timelinePage + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Box ─── */

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

/* ─── Timeline Row (reference-style) ─── */

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const [expanded, setExpanded] = useState(false);
  const data = entry.data;

  let icon: React.ReactNode;
  let label: string;
  let detail = "";
  let props: Record<string, unknown> | null = null;

  switch (entry.kind) {
    case "pageview":
      icon = <Eye className="h-3.5 w-3.5 text-foreground" />;
      label = "Viewed page";
      detail = (data.url as string) || "";
      if (data.duration || data.scrollDepth) {
        const parts: string[] = [];
        if (data.duration) parts.push(formatDuration(data.duration as number));
        if (data.scrollDepth) parts.push(`${data.scrollDepth}% scrolled`);
        detail += ` (${parts.join(", ")})`;
      }
      break;
    case "click":
      icon = <MousePointerClick className="h-3.5 w-3.5 text-orange-500" />;
      label = "Clicked";
      const cProps = data.properties as Record<string, string> | undefined;
      detail = cProps?.text || cProps?.tag || "";
      if (cProps?.href) detail += ` → ${cProps.href}`;
      break;
    case "form_submit":
      icon = <FileText className="h-3.5 w-3.5 text-purple-500" />;
      label = "Submitted form";
      const fProps = data.properties as Record<string, string> | undefined;
      detail = fProps?.formId || fProps?.action || "";
      break;
    case "impression":
      icon = <Sparkles className="h-3.5 w-3.5 text-indigo-500" />;
      label = "Personalization shown";
      detail = `Element: ${data.elementId || "—"}, Variant: ${data.variantId || "—"}`;
      break;
    case "purchase":
      icon = <ShoppingCart className="h-3.5 w-3.5 text-green-500" />;
      label = (data.type as string) || "Purchase";
      detail = (data.productName as string) || "";
      if (data.amount) {
        detail += ` — ${formatRevenue(data.amount as number)} ${((data.currency as string) || "USD").toUpperCase()}`;
      }
      break;
    default:
      icon = <Zap className="h-3.5 w-3.5 text-yellow-500" />;
      label = `Triggered event: ${entry.kind}`;
      if (data.properties && typeof data.properties === "object") {
        props = data.properties as Record<string, unknown>;
        const count = Object.keys(props).length;
        detail = `(${count}) parameter${count !== 1 ? "s" : ""}`;
      }
  }

  return (
    <div className="group flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors">
      <div className="mt-0.5 shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-muted/60">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{label}</span>
          {detail && (
            <span className="text-xs text-muted-foreground truncate max-w-[400px]">{detail}</span>
          )}
          {props && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
        {expanded && props && (
          <div className="mt-2 text-xs bg-muted/50 rounded-md p-2 space-y-1 font-mono">
            {Object.entries(props).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-muted-foreground shrink-0">{k}:</span>
                <span className="truncate">{String(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums mt-0.5">
        {formatTime(entry.timestamp)}
      </span>
    </div>
  );
}
