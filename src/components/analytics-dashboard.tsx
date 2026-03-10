"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { useSocket } from "@/lib/use-socket";
import { Favicon } from "@/components/favicon";
import type { ElementConfigDTO } from "@/lib/types/dto";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  AreaChart,
  Area,
} from "recharts";
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  RefreshCw,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  X,
  ChevronDown,
} from "lucide-react";
import { SegiOrb } from "@/components/segi-orb";

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
};

interface Filters { country: string; device: string; url: string; elementId: string; ruleId: string; }

const EMPTY_FILTERS: Filters = { country: "", device: "", url: "", elementId: "", ruleId: "" };

interface OverviewData {
  period: { days: number; since: string };
  totalVisitors: number;
  previousPeriod: { totalVisitors: number; totalSessions: number; totalPageviews: number; totalRevenue: number };
  newVisitors: number;
  returningVisitors: number;
  totalSessions: number;
  totalPageviews: number;
  avgSessionDuration: number;
  bounceRate: number;
  totalRevenue: number;
  totalOrders: number;
  todayVisitors: number;
  liveVisitors: number;
  dailyStats: { date: string; visitors: number; newVisitors: number; returningVisitors: number; sessions: number; pageviews: number }[];
  countryStats: { countryCode: string; visitors: number; revenue: number }[];
  deviceStats: { device: string; visitors: number }[];
  pageStats: { url: string; pageviews: number }[];
  filterOptions?: { countries: string[]; devices: string[]; urls: string[] };
}

interface Props { projectId: string; elements: ElementConfigDTO[]; }

function calcDelta(current: number, previous: number): { pct: number; direction: "up" | "down" | "flat" } {
  if (previous === 0 && current === 0) return { pct: 0, direction: "flat" };
  if (previous === 0) return { pct: 100, direction: "up" };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const { pct, direction } = calcDelta(current, previous);
  if (direction === "flat") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-1 rounded-[5px] text-xs dark:text-[#C2C0B6] text-muted-foreground" style={{ backgroundColor: "rgba(43, 153, 105, 0.1)" }}>
        <Minus className="h-3.5 w-3.5" /> 0%
      </span>
    );
  }
  const isUp = direction === "up";
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-1 rounded-[5px] text-xs"
      style={{
        backgroundColor: isUp ? "rgba(43, 153, 105, 0.1)" : "rgba(255, 111, 0, 0.1)",
        color: isUp ? "#14F190" : "#FF6F00",
      }}
    >
      {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {pct}%
    </span>
  );
}

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #484848",
  backgroundColor: "#343434",
  color: "#C2C0B6",
  boxShadow: "0 4px 20px rgba(0,0,0,.15)",
};

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</label>
      <Select value={value || "__all__"} onValueChange={(v) => onValueChange(v === "__all__" ? "" : v)}>
        <SelectTrigger className="h-8 text-xs rounded-lg">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{placeholder}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function OverviewRightPanel({ overviewData }: { overviewData: OverviewData }) {
  const [tab, setTab] = useState<"countries" | "devices">("countries");
  return (
    <div className="rounded-2xl border dark:border-[#484848] bg-transparent overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b dark:border-[#484848] dark:bg-[rgba(255,255,255,0.02)]">
        <div className="flex items-center gap-3">
          <button
            className={`text-xs transition-colors duration-150 ${tab === "countries" ? "dark:text-white text-foreground" : "dark:text-[#C2C0B6] text-muted-foreground dark:hover:text-white hover:text-foreground"}`}
            onClick={() => setTab("countries")}
          >
            Countries
          </button>
          <button
            className={`text-xs transition-colors duration-150 ${tab === "devices" ? "dark:text-white text-foreground" : "dark:text-[#C2C0B6] text-muted-foreground dark:hover:text-white hover:text-foreground"}`}
            onClick={() => setTab("devices")}
          >
            Devices
          </button>
        </div>
        <span className="text-xs dark:text-[#C2C0B6] text-muted-foreground">
          Visitors
        </span>
      </div>
      <div className="divide-y dark:divide-[#484848]">
        {tab === "countries" ? (
          overviewData.countryStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Globe className="h-6 w-6 text-muted-foreground/30 mb-2" />
              <p className="text-xs dark:text-[#C2C0B6] text-muted-foreground">No country data yet</p>
            </div>
          ) : (
            overviewData.countryStats.slice(0, 8).map((cs) => {
              const maxV = overviewData.countryStats[0]?.visitors || 1;
              const pct = Math.round((cs.visitors / maxV) * 100);
              return (
                <div key={cs.countryCode} className="relative px-3 py-2.5 group hover:bg-white/[0.03] transition-colors">
                  <div className="absolute inset-y-0 left-0 dark:bg-white/5 bg-[#FAFAFA] transition-all" style={{ width: `${pct}%` }} />
                  <div className="relative flex items-center justify-between gap-3">
                    <span className="text-xs flex items-center gap-2 dark:text-[#C2C0B6]">
                      <span>{countryFlag(cs.countryCode)}</span>
                      <span className="truncate">{cs.countryCode}</span>
                    </span>
                    <span className="text-xs font-medium tabular-nums shrink-0 dark:text-white">{cs.visitors.toLocaleString()}</span>
                  </div>
                </div>
              );
            })
          )
        ) : (
          overviewData.deviceStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Monitor className="h-6 w-6 text-muted-foreground/30 mb-2" />
              <p className="text-xs dark:text-[#C2C0B6] text-muted-foreground">No device data yet</p>
            </div>
          ) : (
            overviewData.deviceStats.map((d) => {
              const total = overviewData.deviceStats.reduce((s, x) => s + x.visitors, 0);
              const pct = total > 0 ? Math.round((d.visitors / total) * 100) : 0;
              return (
                <div key={d.device} className="relative px-3 py-2.5 group hover:bg-white/[0.03] transition-colors">
                  <div className="absolute inset-y-0 left-0 dark:bg-white/5 bg-[#FAFAFA] transition-all" style={{ width: `${pct}%` }} />
                  <div className="relative flex items-center justify-between gap-3">
                    <span className="text-xs flex items-center gap-2 dark:text-[#C2C0B6]">
                      {DEVICE_ICONS[d.device] || <Monitor className="h-4 w-4" />}
                      <span className="capitalize">{d.device}</span>
                    </span>
                    <span className="text-xs font-medium tabular-nums shrink-0 dark:text-white">{d.visitors.toLocaleString()}</span>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}

export function AnalyticsDashboard({ projectId, elements }: Props) {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [days, setDays] = useState(7);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [filters.country, filters.device, filters.url].filter(Boolean).length;

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (filters.country) params.set("country", filters.country);
      if (filters.device) params.set("device", filters.device);
      if (filters.url) params.set("url", filters.url);
      const result = await api.get<OverviewData>(`/api/projects/${projectId}/analytics/overview?${params.toString()}`);
      setOverviewData(result);
    } catch { /* ignore */ } finally {
      setOverviewLoading(false);
    }
  }, [projectId, days, filters]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const seenVisitors = useRef(new Set<string>());

  useSocket(projectId, useCallback((event) => {
    if (event.type !== "analytics:activity") return;
    const d = event.data as Record<string, unknown>;
    setOverviewData((prev) => {
      if (!prev) return prev;
      const pvs = (d.pageviews as number) || 0;
      const evts = (d.events as number) || 0;
      const vid = d.visitorId as string;
      let newVisitors = 0;
      if (vid && !seenVisitors.current.has(vid)) {
        seenVisitors.current.add(vid);
        newVisitors = 1;
      }
      return {
        ...prev,
        totalPageviews: prev.totalPageviews + pvs,
        totalVisitors: prev.totalVisitors + newVisitors,
        totalSessions: prev.totalSessions + (newVisitors > 0 ? 1 : 0),
      };
    });
  }, []));

  const countryOptions = useMemo(() =>
    (overviewData?.filterOptions?.countries ?? []).map((c) => {
      const emoji = countryFlag(c);
      return { value: c, label: `${emoji ? emoji + " " : ""}${c}` };
    }),
    [overviewData?.filterOptions?.countries]
  );

  const formatDur = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  if (overviewLoading && !overviewData) {
    return (
      <div className="flex items-center justify-center py-20">
        <SegiOrb size={48} thinking />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="h-8 w-[140px] text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-px h-5 bg-border mx-1" />

          <Button
            variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background text-foreground text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={loadOverview} disabled={overviewLoading}>
          <RefreshCw className={`h-3.5 w-3.5 ${overviewLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Filters Panel ── */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FilterSelect
                label="Country"
                value={filters.country}
                onValueChange={(v) => setFilters(prev => ({ ...prev, country: v }))}
                options={countryOptions}
                placeholder="All countries"
              />
              <FilterSelect
                label="Device"
                value={filters.device}
                onValueChange={(v) => setFilters(prev => ({ ...prev, device: v }))}
                options={(overviewData?.filterOptions?.devices ?? []).map(d => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }))}
                placeholder="All devices"
              />
              <FilterSelect
                label="Page"
                value={filters.url}
                onValueChange={(v) => setFilters(prev => ({ ...prev, url: v }))}
                options={(overviewData?.filterOptions?.urls ?? []).map(u => ({ value: u, label: u }))}
                placeholder="All pages"
              />
            </div>

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-dashed">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mr-1">Active:</span>
                {filters.country && (
                  <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 h-6 rounded-full">
                    {countryFlag(filters.country)} {filters.country}
                    <button onClick={() => setFilters(prev => ({ ...prev, country: "" }))} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"><X className="h-3 w-3" /></button>
                  </Badge>
                )}
                {filters.device && (
                  <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 h-6 rounded-full">
                    {filters.device.charAt(0).toUpperCase() + filters.device.slice(1)}
                    <button onClick={() => setFilters(prev => ({ ...prev, device: "" }))} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"><X className="h-3 w-3" /></button>
                  </Badge>
                )}
                {filters.url && (
                  <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 h-6 rounded-full">
                    <Favicon url={filters.url} size={12} />
                    {filters.url}
                    <button onClick={() => setFilters(prev => ({ ...prev, url: "" }))} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"><X className="h-3 w-3" /></button>
                  </Badge>
                )}
                <button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors ml-1"
                >
                  Clear all
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {overviewData ? (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border dark:border-[#484848] bg-transparent p-4 flex flex-col justify-between h-[164px]">
              <div className="flex flex-col gap-2">
                <p className="text-[24px] font-bold leading-normal dark:text-white">{overviewData.totalVisitors.toLocaleString()}</p>
                <p className="text-xs dark:text-[#C2C0B6] text-muted-foreground">Visitors</p>
              </div>
              <div className="flex items-center gap-2">
                <DeltaBadge current={overviewData.totalVisitors} previous={overviewData.previousPeriod.totalVisitors} />
                <span className="text-xs dark:text-[#C2C0B6] text-muted-foreground">vs last week</span>
              </div>
            </div>
            <div className="rounded-2xl border dark:border-[#484848] bg-transparent p-4 flex flex-col justify-between h-[164px]">
              <div className="flex flex-col gap-2">
                <p className="text-[24px] font-bold leading-normal dark:text-white">{overviewData.totalSessions.toLocaleString()}</p>
                <p className="text-xs dark:text-[#C2C0B6] text-muted-foreground">Sessions</p>
              </div>
              <div className="flex items-center gap-2">
                <DeltaBadge current={overviewData.totalSessions} previous={overviewData.previousPeriod.totalSessions} />
                <span className="text-xs dark:text-[#C2C0B6] text-muted-foreground">vs last week</span>
              </div>
            </div>
            <div className="rounded-2xl border dark:border-[#484848] bg-transparent p-4 flex flex-col justify-between h-[164px]">
              <div className="flex flex-col gap-2">
                <p className="text-[24px] font-bold leading-normal dark:text-white">{overviewData.totalPageviews.toLocaleString()}</p>
                <p className="text-xs dark:text-[#C2C0B6] text-muted-foreground">Pageviews</p>
              </div>
              <div className="flex items-center gap-2">
                <DeltaBadge current={overviewData.totalPageviews} previous={overviewData.previousPeriod.totalPageviews} />
                <span className="text-xs dark:text-[#C2C0B6] text-muted-foreground">vs last week</span>
              </div>
            </div>
            <div className="rounded-2xl border dark:border-[#484848] bg-transparent p-4 flex flex-col justify-between h-[164px]">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[24px] font-bold leading-normal dark:text-white">
                    ${(overviewData.totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  {overviewData.totalOrders > 0 && (
                    <span className="text-[10px] dark:text-[#C2C0B6] text-muted-foreground">{overviewData.totalOrders} orders</span>
                  )}
                </div>
                <p className="text-xs dark:text-[#C2C0B6] text-muted-foreground">Revenue</p>
              </div>
              <div className="flex items-center gap-2">
                <DeltaBadge current={overviewData.totalRevenue} previous={overviewData.previousPeriod.totalRevenue} />
                <span className="text-xs dark:text-[#C2C0B6] text-muted-foreground">vs last week</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-2xl border dark:border-[#484848] bg-transparent overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 dark:bg-[rgba(255,255,255,0.02)]">
              <p className="text-xs dark:text-[#C2C0B6] text-muted-foreground">Visitor trend</p>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-1 text-xs dark:text-[#999] text-muted-foreground">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#3ACB68" }} />
                  Visitors
                </div>
                <div className="flex items-center gap-1 text-xs dark:text-[#999] text-muted-foreground">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#FA783E" }} />
                  New
                </div>
              </div>
            </div>
            <div className="h-[300px] px-3 pb-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overviewData.dailyStats} margin={{ top: 16, right: 4, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradOverviewVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3ACB68" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#3ACB68" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#484848" strokeOpacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "#C2C0B6" }}
                    tickFormatter={(v) => `${new Date(v).getDate()}`}
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                  />
                  <YAxis tick={{ fontSize: 12, fill: "#C2C0B6" }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                  <ReTooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  />
                  <Area type="natural" dataKey="visitors" name="Visitors" stroke="#3ACB68" strokeWidth={3} fill="url(#gradOverviewVisitors)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                  <Area type="natural" dataKey="newVisitors" name="New" stroke="#FA783E" strokeWidth={3} fill="none" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Secondary stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border dark:border-[#484848] bg-transparent p-4">
              <div className="text-xs dark:text-[#C2C0B6] text-muted-foreground">Bounce Rate</div>
              <div className="text-[24px] font-bold mt-2 dark:text-white">{overviewData.bounceRate}%</div>
            </div>
            <div className="rounded-2xl border dark:border-[#484848] bg-transparent p-4">
              <div className="text-xs dark:text-[#C2C0B6] text-muted-foreground">Avg Duration</div>
              <div className="text-[24px] font-bold mt-2 dark:text-white">{formatDur(overviewData.avgSessionDuration)}</div>
            </div>
            <div className="rounded-2xl border dark:border-[#484848] bg-transparent p-4">
              <div className="text-xs dark:text-[#C2C0B6] text-muted-foreground">New / Returning</div>
              <div className="text-[24px] font-bold mt-2 dark:text-white">{overviewData.newVisitors} / {overviewData.returningVisitors}</div>
            </div>
          </div>

          {/* Bottom panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border dark:border-[#484848] bg-transparent overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 border-b dark:border-[#484848] dark:bg-[rgba(255,255,255,0.02)]">
                <span className="text-xs dark:text-[#C2C0B6] text-muted-foreground">Top Pages</span>
                <span className="text-xs dark:text-[#C2C0B6] text-muted-foreground">Pageviews</span>
              </div>
              <div className="divide-y dark:divide-[#484848]">
                {overviewData.pageStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <FileText className="h-6 w-6 text-muted-foreground/30 mb-2" />
                    <p className="text-xs dark:text-[#C2C0B6] text-muted-foreground">No pageview data yet</p>
                  </div>
                ) : (
                  overviewData.pageStats.slice(0, 8).map((p) => {
                    const maxPv = overviewData.pageStats[0]?.pageviews || 1;
                    const pct = Math.round((p.pageviews / maxPv) * 100);
                    return (
                      <div key={p.url} className="relative px-3 py-2.5 group hover:bg-white/[0.03] transition-colors">
                        <div className="absolute inset-y-0 left-0 dark:bg-white/5 bg-[#FAFAFA] transition-all" style={{ width: `${pct}%` }} />
                        <div className="relative flex items-center justify-between gap-3">
                          <span className="text-xs truncate flex items-center gap-1.5 dark:text-[#C2C0B6]"><Favicon url={p.url} size={14} />{p.url}</span>
                          <span className="text-xs font-medium tabular-nums shrink-0 dark:text-white">{p.pageviews.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <OverviewRightPanel overviewData={overviewData} />
          </div>
        </>
      ) : overviewLoading ? (
        <div className="flex items-center justify-center py-12">
          <SegiOrb size={40} thinking />
        </div>
      ) : null}
    </div>
  );
}
