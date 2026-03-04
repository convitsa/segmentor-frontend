"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useSocket } from "@/lib/use-socket";
import { Favicon } from "@/components/favicon";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRangePicker } from "@/components/ui/date-picker";
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
  Filter,
  RotateCcw,
  X,
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
    <div className="absolute inset-0 flex">
      {/* Visitors column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex h-14 shrink-0 items-center px-6 border-b bg-background dark:bg-[#343434]">
          <span className="text-lg font-semibold">Visitors</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <VisitorsList
            projectId={projectId}
            onSelect={openVisitor}
          />
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeVisitor(); }}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full sm:max-w-2xl lg:max-w-4xl p-0 flex flex-col"
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
    </div>
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
  const newVisitorIds = useRef(new Set<string>());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("lastSeenAt");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [filterDevice, setFilterDevice] = useState("all");
  const [filterBrowser, setFilterBrowser] = useState("all");
  const [filterOs, setFilterOs] = useState("all");
  const [filterIdentified, setFilterIdentified] = useState("all");
  const [filterRevenue, setFilterRevenue] = useState("all");
  const [filterLive, setFilterLive] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [filterUtmSource, setFilterUtmSource] = useState("all");
  const [filterUtmMedium, setFilterUtmMedium] = useState("all");
  const [filterUtmCampaign, setFilterUtmCampaign] = useState("all");
  const [filterReferrer, setFilterReferrer] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [filterSeenAfter, setFilterSeenAfter] = useState("");
  const [filterSeenBefore, setFilterSeenBefore] = useState("");

  type FilterOptions = {
    countries: string[]; languages: string[]; browsers: string[]; os: string[];
    devices: string[]; referrers: string[]; utmSources: string[]; utmMediums: string[];
    utmCampaigns: string[]; tags: string[];
  };
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);

  useEffect(() => {
    api.get<FilterOptions>(`/api/projects/${projectId}/visitors/filters`)
      .then(setFilterOptions)
      .catch(() => {});
  }, [projectId]);

  const activeFilterCount = [
    filterDevice !== "all", filterBrowser !== "all", filterOs !== "all",
    filterIdentified !== "all", filterRevenue !== "all", filterLive !== "all",
    filterCountry !== "all", filterLanguage !== "all",
    filterUtmSource !== "all", filterUtmMedium !== "all",
    filterUtmCampaign !== "all", filterReferrer !== "all", filterTag !== "all",
  ].filter(Boolean).length;

  const clearAllFilters = useCallback(() => {
    setFilterDevice("all"); setFilterBrowser("all"); setFilterOs("all");
    setFilterIdentified("all"); setFilterRevenue("all"); setFilterLive("all");
    setFilterCountry("all"); setFilterLanguage("all");
    setFilterUtmSource("all"); setFilterUtmMedium("all"); setFilterUtmCampaign("all");
    setFilterReferrer("all"); setFilterTag("all");
    setFilterSeenAfter(""); setFilterSeenBefore("");
    setPage(1);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      if (search) params.set("search", search);
      if (filterDevice !== "all") params.set("device", filterDevice);
      if (filterBrowser !== "all") params.set("browser", filterBrowser);
      if (filterOs !== "all") params.set("os", filterOs);
      if (filterIdentified !== "all") params.set("identified", filterIdentified);
      if (filterRevenue === "paid") params.set("hasRevenue", "true");
      if (filterLive === "live") params.set("live", "true");
      if (filterCountry !== "all") params.set("country", filterCountry);
      if (filterLanguage !== "all") params.set("language", filterLanguage);
      if (filterUtmSource !== "all") params.set("utmSource", filterUtmSource);
      if (filterUtmMedium !== "all") params.set("utmMedium", filterUtmMedium);
      if (filterUtmCampaign !== "all") params.set("utmCampaign", filterUtmCampaign);
      if (filterReferrer !== "all") params.set("referrer", filterReferrer);
      if (filterTag !== "all") params.set("tag", filterTag);
      if (filterSeenAfter) params.set("seenAfter", filterSeenAfter);
      if (filterSeenBefore) params.set("seenBefore", filterSeenBefore);
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
  }, [projectId, page, sortBy, sortOrder, search, filterDevice, filterBrowser, filterOs, filterIdentified, filterRevenue, filterLive, filterCountry, filterLanguage, filterUtmSource, filterUtmMedium, filterUtmCampaign, filterReferrer, filterTag, filterSeenAfter, filterSeenBefore]);

  useEffect(() => { load(); }, [load]);

  useSocket(projectId, useCallback((event) => {
    if (event.type === "visitor_update") {
      const d = event.data as {
        visitorId: string;
        timestamp: string;
        pageviews?: number;
        events?: number;
        email?: string | null;
        country?: string | null;
        countryCode?: string | null;
        region?: string | null;
        city?: string | null;
        language?: string | null;
        device?: string | null;
        browser?: string | null;
        os?: string | null;
        referrer?: string | null;
        utmSource?: string | null;
        utmMedium?: string | null;
        utmCampaign?: string | null;
      };
      if (!d.visitorId || !d.timestamp) return;
      const extras: Partial<VisitorDTO> = {};
      if (d.email) extras.email = d.email;
      if (d.country) extras.country = d.country;
      if (d.countryCode) extras.countryCode = d.countryCode;
      if (d.region) extras.region = d.region;
      if (d.city) extras.city = d.city;
      if (d.language) extras.language = d.language;
      if (d.device) extras.device = d.device;
      if (d.browser) extras.browser = d.browser;
      if (d.os) extras.os = d.os;
      if (d.referrer) extras.firstReferrer = d.referrer;
      if (d.utmSource) extras.firstUtmSource = d.utmSource;
      if (d.utmMedium) extras.firstUtmMedium = d.utmMedium;
      if (d.utmCampaign) extras.firstUtmCampaign = d.utmCampaign;

      setVisitors((prev) => {
        const existing = prev.find((v) => v.visitorId === d.visitorId);
        if (existing) {
          return prev.map((v) =>
            v.visitorId === d.visitorId
              ? {
                  ...v,
                  lastSeenAt: d.timestamp,
                  totalPageviews: v.totalPageviews + (d.pageviews || 0),
                  totalEvents: v.totalEvents + (d.events || 0),
                  ...extras,
                }
              : v
          );
        }
        const newVisitor: VisitorDTO = {
          id: `live-${d.visitorId}`,
          projectId,
          visitorId: d.visitorId,
          totalSessions: 1,
          totalPageviews: d.pageviews || 1,
          totalEvents: d.events || 0,
          totalRevenue: 0,
          tags: [],
          firstSeenAt: d.timestamp,
          lastSeenAt: d.timestamp,
          ...extras,
        };
        newVisitorIds.current.add(d.visitorId);
        return [newVisitor, ...prev];
      });
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
    } else if (event.type === "visitor_offline") {
      const d = event.data as { visitorId: string };
      if (d.visitorId) {
        const pastTime = new Date(Date.now() - 6 * 60 * 1000).toISOString();
        setVisitors((prev) =>
          prev.map((v) =>
            v.visitorId === d.visitorId ? { ...v, lastSeenAt: pastTime } : v
          )
        );
      }
    } else if (event.type.startsWith("live:")) {
      const d = event.data as { visitorId: string; timestamp?: string };
      if (d.visitorId && d.timestamp) {
        setVisitors((prev) => {
          const existing = prev.find((v) => v.visitorId === d.visitorId);
          if (existing) {
            return prev.map((v) =>
              v.visitorId === d.visitorId ? { ...v, lastSeenAt: d.timestamp! } : v
            );
          }
          const minimal: VisitorDTO = {
            id: `live-${d.visitorId}`,
            projectId,
            visitorId: d.visitorId,
            totalSessions: 1,
            totalPageviews: 0,
            totalEvents: 1,
            totalRevenue: 0,
            tags: [],
            firstSeenAt: d.timestamp!,
            lastSeenAt: d.timestamp!,
          };
          newVisitorIds.current.add(d.visitorId);
          return [minimal, ...prev];
        });
      }
    }
  }, [projectId]));

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
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, city..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <DateRangePicker
          from={filterSeenAfter}
          to={filterSeenBefore}
          onChangeFrom={(v) => { setFilterSeenAfter(v); setPage(1); }}
          onChangeTo={(v) => { setFilterSeenBefore(v); setPage(1); }}
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[460px] p-0" align="end">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="text-sm font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={clearAllFilters}>
                  <RotateCcw className="h-3 w-3" />
                  Clear all
                </Button>
              )}
            </div>
            <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <FilterSelect label="Device" value={filterDevice} onChange={(v) => { setFilterDevice(v); setPage(1); }}
                  options={[["all", "All Devices"], ...(filterOptions?.devices || []).map((d): [string, string] => {
                    const icon = d === "desktop" ? "🖥️" : d === "mobile" ? "📱" : d === "tablet" ? "📲" : "💻";
                    return [d, `${icon} ${d.charAt(0).toUpperCase() + d.slice(1)}`];
                  })]} />
                <FilterSelect label="Browser" value={filterBrowser} onChange={(v) => { setFilterBrowser(v); setPage(1); }}
                  options={[["all", "All Browsers"], ...(filterOptions?.browsers || []).map((b): [string, string] => {
                    const icon: Record<string, string> = { Chrome: "🟢", Firefox: "🦊", Safari: "🧭", Edge: "🔵", Opera: "🔴", Samsung: "🟣" };
                    return [b, `${icon[b] || "🌐"} ${b}`];
                  })]} />
                <FilterSelect label="OS" value={filterOs} onChange={(v) => { setFilterOs(v); setPage(1); }}
                  options={[["all", "All OS"], ...(filterOptions?.os || []).map((o): [string, string] => {
                    const icon: Record<string, string> = { Windows: "🪟", macOS: "🍎", Linux: "🐧", Android: "🤖", iOS: "📱", ChromeOS: "🟢" };
                    return [o, `${icon[o] || "💻"} ${o}`];
                  })]} />
                <FilterSelect label="Identity" value={filterIdentified} onChange={(v) => { setFilterIdentified(v); setPage(1); }}
                  options={[["all", "All Visitors"], ["true", "✅ Identified"], ["false", "👻 Anonymous"]]} />
                <FilterSelect label="Revenue" value={filterRevenue} onChange={(v) => { setFilterRevenue(v); setPage(1); }}
                  options={[["all", "All"], ["paid", "💵 Paid Only"]]} />
                <FilterSelect label="Status" value={filterLive} onChange={(v) => { setFilterLive(v); setPage(1); }}
                  options={[["all", "All Status"], ["live", "🟢 Live Now"]]} />
              </div>

              {(filterOptions?.countries?.length || filterOptions?.languages?.length) ? (
                <div className="border-t pt-3 grid grid-cols-2 gap-2">
                  {(filterOptions?.countries?.length ?? 0) > 0 && (
                    <FilterSelect label="Country" value={filterCountry} onChange={(v) => { setFilterCountry(v); setPage(1); }}
                      options={[["all", "All Countries"], ...(filterOptions?.countries || []).map((c): [string, string] => {
                        const [code, name] = c.split("|");
                        return [code, `${countryFlag(code)} ${name || code}`];
                      })]} />
                  )}
                  {(filterOptions?.languages?.length ?? 0) > 0 && (
                    <FilterSelect label="Language" value={filterLanguage} onChange={(v) => { setFilterLanguage(v); setPage(1); }}
                      options={[["all", "All Languages"], ...(filterOptions?.languages || []).map((l): [string, string] => [l, `🗣️ ${l}`])]} />
                  )}
                  {(filterOptions?.referrers?.length ?? 0) > 0 && (
                    <FilterSelect label="Referrer" value={filterReferrer} onChange={(v) => { setFilterReferrer(v); setPage(1); }}
                      options={[["all", "All Referrers"], ...(filterOptions?.referrers || []).map((r): [string, string] => [r, `🔗 ${r}`])]} />
                  )}
                  {(filterOptions?.tags?.length ?? 0) > 0 && (
                    <FilterSelect label="Tag" value={filterTag} onChange={(v) => { setFilterTag(v); setPage(1); }}
                      options={[["all", "All Tags"], ...(filterOptions?.tags || []).map((t): [string, string] => [t, `🏷️ ${t}`])]} />
                  )}
                </div>
              ) : null}

              {(filterOptions?.utmSources?.length || filterOptions?.utmMediums?.length || filterOptions?.utmCampaigns?.length) ? (
                <div className="border-t pt-3 grid grid-cols-2 gap-2">
                  {(filterOptions?.utmSources?.length ?? 0) > 0 && (
                    <FilterSelect label="UTM Source" value={filterUtmSource} onChange={(v) => { setFilterUtmSource(v); setPage(1); }}
                      options={[["all", "All Sources"], ...(filterOptions?.utmSources || []).map((s): [string, string] => [s, `📡 ${s}`])]} />
                  )}
                  {(filterOptions?.utmMediums?.length ?? 0) > 0 && (
                    <FilterSelect label="UTM Medium" value={filterUtmMedium} onChange={(v) => { setFilterUtmMedium(v); setPage(1); }}
                      options={[["all", "All Mediums"], ...(filterOptions?.utmMediums || []).map((m): [string, string] => [m, `📢 ${m}`])]} />
                  )}
                  {(filterOptions?.utmCampaigns?.length ?? 0) > 0 && (
                    <FilterSelect label="UTM Campaign" value={filterUtmCampaign} onChange={(v) => { setFilterUtmCampaign(v); setPage(1); }}
                      options={[["all", "All Campaigns"], ...(filterOptions?.utmCampaigns || []).map((c): [string, string] => [c, `🎯 ${c}`])]} />
                  )}
                </div>
              ) : null}

            </div>
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Visitor Grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="shadow-none py-0 gap-0">
              <CardContent className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : visitors.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-16 text-center">
              <User className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No visitors found.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Data will appear once your tracking script is installed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {visitors.map((v) => {
              const isNew = newVisitorIds.current.has(v.visitorId);
              return (
                <motion.div
                  key={v.visitorId}
                  initial={isNew ? { opacity: 0, y: -10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                  onAnimationComplete={() => newVisitorIds.current.delete(v.visitorId)}
                >
                  <VisitorRow visitor={v} onClick={() => onSelect(v.visitorId)} />
                </motion.div>
              );
            })}
          </>
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

/* ─── Filter helpers ─── */

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <div className="min-w-0">
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([val, lbl]) => <SelectItem key={val} value={val}>{lbl}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ─── Visitor Row (like the reference design) ─── */

function VisitorRow({ visitor: v, onClick }: { visitor: VisitorDTO; onClick: () => void }) {
  const isLive = Date.now() - new Date(v.lastSeenAt).getTime() < 5 * 60 * 1000;

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/40 group shadow-none py-0 gap-0"
      onClick={onClick}
    >
      <CardContent className="px-4 py-4">
        <div className="flex items-start gap-3">
          <VisitorAvatar visitor={v} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-sm truncate max-w-[140px]">{displayName(v)}</span>
              {isLive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
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
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
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
              {v.browser && <span>{browserIcon(v.browser)}</span>}
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground shrink-0">
            {formatTimeAgo(v.lastSeenAt)}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs">
          <div>
            <span className="font-medium tabular-nums">{v.totalPageviews}</span>
            <span className="text-muted-foreground ml-1">pages</span>
          </div>
          <div>
            <span className="font-medium tabular-nums">{v.totalSessions}</span>
            <span className="text-muted-foreground ml-1">sessions</span>
          </div>
          {v.totalRevenue > 0 && (
            <div className="ml-auto">
              <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatRevenue(v.totalRevenue)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════
   Visitor Detail Panel (Bottom Sheet)
   ═══════════════════════════════════════════ */

export function VisitorDetailPanel({
  projectId,
  visitorId,
  onClose,
}: {
  projectId: string;
  visitorId: string;
  onClose: () => void;
}) {
  type TimelineItem = TimelineEntry & { _uid: number };
  const [visitor, setVisitor] = useState<VisitorDTO | null>(null);
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [timelinePagination, setTimelinePagination] = useState<PaginationDTO | null>(null);
  const [timelinePage, setTimelinePage] = useState(1);
  const [loading, setLoading] = useState(true);
  const nextUid = useRef(0);
  const newTimelineUids = useRef(new Set<number>());

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
      setTimeline(res.timeline.map((e) => ({ ...e, _uid: nextUid.current++ })));
      setTimelinePagination(res.pagination);
    } catch { /* ignore */ }
  }, [projectId, visitorId, timelinePage]);

  useEffect(() => { loadDetail(); }, [loadDetail]);
  useEffect(() => { loadTimeline(); }, [loadTimeline]);

  const prependTimeline = useCallback((entry: TimelineEntry) => {
    const uid = nextUid.current++;
    newTimelineUids.current.add(uid);
    setTimeline((prev) => [{ ...entry, _uid: uid }, ...prev]);
  }, []);

  useSocket(projectId, useCallback((event) => {
    const d = event.data as Record<string, unknown>;
    const evtVisitorId = d.visitorId as string | undefined;
    if (!evtVisitorId || evtVisitorId !== visitorId) return;

    const ts = (d.timestamp as string) || new Date().toISOString();

    if (event.type === "visitor_update") {
      setVisitor((prev) => {
        if (!prev) return prev;
        const patch: Partial<VisitorDTO> = {
          lastSeenAt: ts,
          totalPageviews: prev.totalPageviews + ((d.pageviews as number) || 0),
          totalEvents: prev.totalEvents + ((d.events as number) || 0),
        };
        if (d.email) patch.email = d.email as string;
        if (d.country) patch.country = d.country as string;
        if (d.countryCode) patch.countryCode = d.countryCode as string;
        if (d.region) patch.region = d.region as string;
        if (d.city) patch.city = d.city as string;
        if (d.language) patch.language = d.language as string;
        if (d.device) patch.device = d.device as string;
        if (d.browser) patch.browser = d.browser as string;
        if (d.os) patch.os = d.os as string;
        if (d.referrer) patch.firstReferrer = d.referrer as string;
        if (d.utmSource) patch.firstUtmSource = d.utmSource as string;
        if (d.utmMedium) patch.firstUtmMedium = d.utmMedium as string;
        if (d.utmCampaign) patch.firstUtmCampaign = d.utmCampaign as string;
        return { ...prev, ...patch };
      });
    } else if (event.type === "purchase") {
      const amount = (d.amount as number) || 0;
      setVisitor((prev) => prev ? { ...prev, totalRevenue: prev.totalRevenue + amount } : prev);
      setPurchases((prev) => [{ ...d, timestamp: ts }, ...prev]);
      prependTimeline({ kind: "purchase", timestamp: ts, data: d });
    } else if (event.type === "live:pageview") {
      prependTimeline({
        kind: "pageview",
        timestamp: ts,
        data: { url: d.url, title: d.title, referrer: d.referrer },
      });
    } else if (event.type === "live:pageview_end") {
      setTimeline((prev) => prev.map((e) => {
        if (e.kind === "pageview" && e.data.url === d.url) {
          return { ...e, data: { ...e.data, duration: d.duration, scrollDepth: d.scrollDepth } };
        }
        return e;
      }));
    } else if (event.type === "live:click") {
      prependTimeline({
        kind: "click",
        timestamp: ts,
        data: { url: d.url, properties: { tag: d.tag, text: d.text, href: d.href } },
      });
    } else if (event.type === "live:form_submit") {
      prependTimeline({
        kind: "form_submit",
        timestamp: ts,
        data: { url: d.url, properties: { formId: d.formId, action: d.action, method: d.method } },
      });
    } else if (event.type === "live:identify") {
      setVisitor((prev) => prev ? { ...prev, email: (d.email as string) || prev.email } : prev);
    } else if (event.type === "live:custom") {
      prependTimeline({
        kind: (d.name as string) || "custom",
        timestamp: ts,
        data: { url: d.url, properties: d.properties || {} },
      });
    } else if (event.type === "live:impression") {
      prependTimeline({
        kind: "impression",
        timestamp: ts,
        data: { elementId: d.elementId, variantId: d.variantId, ruleId: d.ruleId, url: d.url },
      });
    } else if (event.type === "visitor_offline") {
      if (d.visitorId === visitorId) {
        const pastTime = new Date(Date.now() - 6 * 60 * 1000).toISOString();
        setVisitor((prev) => prev ? { ...prev, lastSeenAt: pastTime } : prev);
      }
    }
  }, [visitorId]));

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
          {/* Left skeleton */}
          <div className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r p-6 flex flex-col gap-5">
            <div className="flex flex-col items-center md:items-start gap-3">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          </div>
          {/* Right skeleton */}
          <div className="flex-1 p-6 space-y-4 min-h-0">
            <Skeleton className="h-4 w-48" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 rounded-full shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-3 w-12 shrink-0" />
                </div>
              ))}
            </div>
          </div>
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
      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
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
                  <Favicon url={visitor.firstReferrer} size={14} />
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
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
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

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 space-y-1">
              {timeline.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No activity recorded yet.</p>
              ) : (
                <>
                  {timeline.map((entry) => {
                    const isNew = newTimelineUids.current.has(entry._uid);
                    return (
                      <motion.div
                        key={entry._uid}
                        initial={isNew ? { opacity: 0, y: -10 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                        onAnimationComplete={() => newTimelineUids.current.delete(entry._uid)}
                      >
                        <TimelineRow entry={entry} />
                      </motion.div>
                    );
                  })}
                </>
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
  let detailUrl = "";
  let props: Record<string, unknown> | null = null;

  switch (entry.kind) {
    case "pageview":
      icon = <Eye className="h-3.5 w-3.5 text-foreground" />;
      label = "Viewed page";
      detailUrl = (data.url as string) || "";
      detail = detailUrl;
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
      if (cProps?.href) { detailUrl = cProps.href; detail += ` → ${cProps.href}`; }
      break;
    case "form_submit":
      icon = <FileText className="h-3.5 w-3.5 text-purple-500" />;
      label = "Submitted form";
      const fProps = data.properties as Record<string, string> | undefined;
      detail = fProps?.formId || fProps?.action || "";
      if (fProps?.action) detailUrl = fProps.action;
      break;
    case "impression":
      icon = <Sparkles className="h-3.5 w-3.5 text-indigo-500" />;
      label = "Personalization shown";
      detail = `Element: ${data.elementId || "—"}, Variant: ${data.variantId || "—"}`;
      if (data.url) detailUrl = data.url as string;
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
      if (data.url) detailUrl = data.url as string;
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
            <span className="text-xs text-muted-foreground truncate max-w-[400px] inline-flex items-center gap-1">
              {detailUrl && <Favicon url={detailUrl} size={12} />}
              {detail}
            </span>
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
