"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { api } from "@/lib/api";
import type { ElementConfigDTO } from "@/lib/types/dto";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import {
  Eye,
  Users,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
  Globe,
  BarChart3,
  MapPin,
  RefreshCw,
  FileText,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  X,
  ChevronDown,
  Layers,
} from "lucide-react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

const ISO2_TO_NUMERIC: Record<string, string> = {
  AF:"004",AL:"008",DZ:"012",AO:"024",AG:"028",AR:"032",AM:"051",AU:"036",
  AT:"040",AZ:"031",BS:"044",BH:"048",BD:"050",BB:"052",BY:"112",BE:"056",
  BZ:"084",BJ:"204",BT:"064",BO:"068",BA:"070",BW:"072",BR:"076",BN:"096",
  BG:"100",BF:"854",BI:"108",KH:"116",CM:"120",CA:"124",CF:"140",TD:"148",
  CL:"152",CN:"156",CO:"170",KM:"174",CG:"178",CD:"180",CR:"188",CI:"384",
  HR:"191",CU:"192",CY:"196",CZ:"203",DK:"208",DJ:"262",DM:"212",DO:"214",
  EC:"218",EG:"818",SV:"222",GQ:"226",ER:"232",EE:"233",SZ:"748",ET:"231",
  FJ:"242",FI:"246",FR:"250",GA:"266",GM:"270",GE:"268",DE:"276",GH:"288",
  GR:"300",GD:"308",GT:"320",GN:"324",GW:"624",GY:"328",HT:"332",HN:"340",
  HU:"348",IS:"352",IN:"356",ID:"360",IR:"364",IQ:"368",IE:"372",IL:"376",
  IT:"380",JM:"388",JP:"392",JO:"400",KZ:"398",KE:"404",KI:"296",KP:"408",
  KR:"410",KW:"414",KG:"417",LA:"418",LV:"428",LB:"422",LS:"426",LR:"430",
  LY:"434",LT:"440",LU:"442",MG:"450",MW:"454",MY:"458",MV:"462",ML:"466",
  MT:"470",MR:"478",MU:"480",MX:"484",MD:"498",MN:"496",ME:"499",MA:"504",
  MZ:"508",MM:"104",NA:"516",NP:"524",NL:"528",NZ:"554",NI:"558",NE:"562",
  NG:"566",MK:"807",NO:"578",OM:"512",PK:"586",PA:"591",PG:"598",PY:"600",
  PE:"604",PH:"608",PL:"616",PT:"620",QA:"634",RO:"642",RU:"643",RW:"646",
  SA:"682",SN:"686",RS:"688",SL:"694",SG:"702",SK:"703",SI:"705",SB:"090",
  SO:"706",ZA:"710",SS:"728",ES:"724",LK:"144",SD:"729",SR:"740",SE:"752",
  CH:"756",SY:"760",TW:"158",TJ:"762",TZ:"834",TH:"764",TL:"626",TG:"768",
  TT:"780",TN:"788",TR:"792",TM:"795",UG:"800",UA:"804",AE:"784",GB:"826",
  US:"840",UY:"858",UZ:"860",VU:"548",VE:"862",VN:"704",YE:"887",ZM:"894",
  ZW:"716",PS:"275",XK:"780",PR:"630",GL:"304",EH:"732",NC:"540",FK:"238",
};

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
};

const PIE_COLORS = ["#171717", "#525252", "#a3a3a3", "#737373", "#d4d4d4"];

interface DailyStat { date: string; impressions: number; visitors: number; }
interface ElementStat { elementId: string; impressions: number; }
interface CountryStat { countryCode: string; country: string; impressions: number; uniqueVisitors: number; }
interface DeviceStat { device: string; impressions: number; }
interface PageStat { url: string; impressions: number; uniqueVisitors: number; }
interface RuleStat { ruleId: string; impressions: number; uniqueVisitors: number; }
interface FilterOptions { countries: string[]; devices: string[]; urls: string[]; elements: string[]; rules: string[]; }
interface Filters { country: string; device: string; url: string; elementId: string; ruleId: string; }

const EMPTY_FILTERS: Filters = { country: "", device: "", url: "", elementId: "", ruleId: "" };

interface AnalyticsData {
  period: { days: number; since: string };
  totalImpressions: number;
  uniqueVisitors: number;
  previousPeriod: { totalImpressions: number; uniqueVisitors: number };
  variantStats: { variantId: string; impressions: number; uniqueVisitors: number }[];
  dailyStats: DailyStat[];
  elementStats: ElementStat[];
  countryStats: CountryStat[];
  deviceStats: DeviceStat[];
  pageStats: PageStat[];
  ruleStats: RuleStat[];
  hasFilters: boolean;
  filterOptions: FilterOptions;
}

interface OverviewData {
  period: { days: number; since: string };
  totalVisitors: number;
  previousPeriod: { totalVisitors: number; totalSessions: number };
  newVisitors: number;
  returningVisitors: number;
  totalSessions: number;
  totalPageviews: number;
  avgSessionDuration: number;
  bounceRate: number;
  totalRevenue: number;
  totalOrders: number;
  dailyStats: { date: string; visitors: number; newVisitors: number; returningVisitors: number; sessions: number; pageviews: number }[];
  countryStats: { countryCode: string; visitors: number; revenue: number }[];
  deviceStats: { device: string; visitors: number }[];
  pageStats: { url: string; pageviews: number }[];
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
      <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  }
  const isUp = direction === "up";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isUp ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400"}`}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {pct}%
    </span>
  );
}

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 10,
  border: "1px solid var(--border)",
  backgroundColor: "var(--popover)",
  color: "var(--popover-foreground)",
  boxShadow: "0 4px 20px rgba(0,0,0,.08)",
};

const MAP_THEMES = {
  dark: {
    bg: "#0c1520",
    land: "#162231",
    stroke: "#1e3045",
    hover: "#1e3550",
    hoverActive: "#0bb5e8",
    tooltipBg: "#111d2e",
    tooltipBorder: "#1e3550",
    tooltipText: "#ffffff",
    tooltipSub: "#c5d5e5",
    tooltipMuted: "#6889a5",
    accentRgb: { rH: 9, rL: 22, gH: 185, gL: 50, bH: 232, bL: 80 },
  },
  light: {
    bg: "#f0f6fa",
    land: "#d4e3ee",
    stroke: "#b8cfe0",
    hover: "#c0d6e8",
    hoverActive: "#0780a8",
    tooltipBg: "#ffffff",
    tooltipBorder: "#d4e3ee",
    tooltipText: "#0c1520",
    tooltipSub: "#3d6080",
    tooltipMuted: "#7a9ab5",
    accentRgb: { rH: 9, rL: 180, gH: 141, gL: 210, bH: 185, bL: 240 },
  },
};

function WorldMap({ countryStats, isDark }: { countryStats: CountryStat[]; isDark: boolean }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [tooltipContent, setTooltipContent] = useState<{
    name: string; impressions: number; visitors: number;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const t = isDark ? MAP_THEMES.dark : MAP_THEMES.light;

  const dataMap = useMemo(() => {
    const m = new Map<string, CountryStat>();
    countryStats.forEach(cs => {
      const iso2 = cs.countryCode.toUpperCase();
      const numericCode = ISO2_TO_NUMERIC[iso2];
      if (numericCode) m.set(numericCode, cs);
      m.set(iso2, cs);
    });
    return m;
  }, [countryStats]);

  const maxImpressions = useMemo(
    () => Math.max(1, ...countryStats.map(c => c.impressions)),
    [countryStats]
  );

  function getColor(code: string): string {
    const stat = dataMap.get(code);
    if (!stat) return t.land;
    const ratio = stat.impressions / maxImpressions;
    const p = Math.max(0.2, Math.pow(ratio, 0.4));
    const { rH, rL, gH, gL, bH, bL } = t.accentRgb;
    const r = Math.round(rH * p + rL * (1 - p));
    const g = Math.round(gH * p + gL * (1 - p));
    const b = Math.round(bH * p + bL * (1 - p));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div ref={mapRef} className="relative" onMouseMove={handleMouseMove}>
      <ComposableMap
        projectionConfig={{ rotate: [-10, 0, 0], scale: 155 }}
        className="w-full h-auto"
        style={{ background: t.bg, borderRadius: "0 0 12px 12px" }}
        height={400}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const code = geo.properties.ISO_A2 || geo.id;
              const stat = dataMap.get(code);
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={getColor(code)}
                  stroke={t.stroke}
                  strokeWidth={0.4}
                  onMouseEnter={() => {
                    const name = geo.properties.name || code;
                    setTooltipContent({ name, impressions: stat?.impressions ?? 0, visitors: stat?.uniqueVisitors ?? 0 });
                  }}
                  onMouseLeave={() => setTooltipContent(null)}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: stat ? t.hoverActive : t.hover, outline: "none", cursor: "pointer" },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {tooltipContent && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{ left: tooltipPos.x, top: tooltipPos.y - 10, transform: "translate(-50%, -100%)" }}
        >
          <div
            className="text-xs px-3.5 py-2.5 rounded-xl shadow-2xl whitespace-nowrap backdrop-blur-sm"
            style={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, color: t.tooltipText }}
          >
            <p className="font-semibold text-sm">{tooltipContent.name}</p>
            {tooltipContent.impressions > 0 ? (
              <div className="flex gap-4 mt-1.5" style={{ color: t.tooltipSub }}>
                <span className="flex items-center gap-1"><Eye className="h-3 w-3 opacity-60" />{tooltipContent.impressions.toLocaleString()}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3 opacity-60" />{tooltipContent.visitors.toLocaleString()}</span>
              </div>
            ) : (
              <p className="mt-0.5" style={{ color: t.tooltipMuted }}>No traffic</p>
            )}
          </div>
          <div
            className="w-2 h-2 rotate-45 mx-auto -mt-1"
            style={{ background: t.tooltipBg, borderBottom: `1px solid ${t.tooltipBorder}`, borderRight: `1px solid ${t.tooltipBorder}` }}
          />
        </div>
      )}
    </div>
  );
}

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
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b">
        <div className="flex items-center gap-0">
          <button
            className={`text-sm font-semibold pb-0 mr-4 transition-colors ${tab === "countries" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("countries")}
          >
            Countries
          </button>
          <button
            className={`text-sm font-semibold pb-0 transition-colors ${tab === "devices" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("devices")}
          >
            Devices
          </button>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {tab === "countries" ? "Visitors" : "Visitors"}
        </span>
      </div>
      <div className="divide-y">
        {tab === "countries" ? (
          overviewData.countryStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Globe className="h-6 w-6 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No country data yet</p>
            </div>
          ) : (
            overviewData.countryStats.slice(0, 8).map((cs) => {
              const maxV = overviewData.countryStats[0]?.visitors || 1;
              const pct = Math.round((cs.visitors / maxV) * 100);
              return (
                <div key={cs.countryCode} className="relative px-5 py-3 group hover:bg-muted/30 transition-colors">
                  <div className="absolute inset-y-0 left-0 bg-violet-500/8 transition-all" style={{ width: `${pct}%` }} />
                  <div className="relative flex items-center justify-between gap-3">
                    <span className="text-sm flex items-center gap-2">
                      <span>{countryFlag(cs.countryCode)}</span>
                      <span className="truncate">{cs.countryCode}</span>
                    </span>
                    <span className="text-sm font-medium tabular-nums shrink-0">{cs.visitors.toLocaleString()}</span>
                  </div>
                </div>
              );
            })
          )
        ) : (
          overviewData.deviceStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Monitor className="h-6 w-6 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No device data yet</p>
            </div>
          ) : (
            overviewData.deviceStats.map((d) => {
              const total = overviewData.deviceStats.reduce((s, x) => s + x.visitors, 0);
              const pct = total > 0 ? Math.round((d.visitors / total) * 100) : 0;
              return (
                <div key={d.device} className="relative px-5 py-3 group hover:bg-muted/30 transition-colors">
                  <div className="absolute inset-y-0 left-0 bg-amber-500/8 transition-all" style={{ width: `${pct}%` }} />
                  <div className="relative flex items-center justify-between gap-3">
                    <span className="text-sm flex items-center gap-2">
                      {DEVICE_ICONS[d.device] || <Monitor className="h-4 w-4" />}
                      <span className="capitalize">{d.device}</span>
                    </span>
                    <span className="text-sm font-medium tabular-nums shrink-0">{d.visitors.toLocaleString()}</span>
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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [activeTab, setActiveTab] = useState<"overview" | "personalization">("overview");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const elementLabel = (id: string) =>
    elements.find(e => e.id === id)?.label || id.slice(-6);

  const ruleDescription = (ruleId: string): string => {
    for (const el of elements) {
      const rule = el.rules.find(r => r.id === ruleId);
      if (rule) return rule.description || `Rule on ${el.label}`;
    }
    return ruleId.slice(-6);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (filters.country) params.set("country", filters.country);
      if (filters.device) params.set("device", filters.device);
      if (filters.url) params.set("url", filters.url);
      if (filters.elementId) params.set("elementId", filters.elementId);
      if (filters.ruleId) params.set("ruleId", filters.ruleId);
      const result = await api.get<AnalyticsData>(`/api/projects/${projectId}/analytics?${params.toString()}`);
      setData(result);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [projectId, days, filters]);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const result = await api.get<OverviewData>(`/api/projects/${projectId}/analytics/overview?days=${days}`);
      setOverviewData(result);
    } catch { /* ignore */ } finally {
      setOverviewLoading(false);
    }
  }, [projectId, days]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadOverview(); }, [loadOverview]);

  const avgPerDay = data && data.dailyStats.length > 0
    ? Math.round(data.totalImpressions / data.dailyStats.length)
    : 0;

  const topCountry = data?.countryStats?.[0];
  const topPage = data?.pageStats?.[0];
  const totalDeviceImps = useMemo(
    () => data?.deviceStats?.reduce((s, d) => s + d.impressions, 0) ?? 0,
    [data?.deviceStats]
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
          <BarChart3 className="h-9 w-9 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Waiting for your first visitor</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Once you install the script and visitors interact with your personalizations, analytics will appear here.
        </p>
        <Button variant="outline" size="sm" onClick={() => window.location.search = "?section=setup"}>
          Go to Setup
        </Button>
      </div>
    );
  }

  const deviceData = (data.deviceStats || []).map(d => ({
    name: d.device.charAt(0).toUpperCase() + d.device.slice(1),
    value: d.impressions,
  }));

  const countryOptions = data.filterOptions.countries.map((c) => {
    const cs = data.countryStats.find(s => s.countryCode === c);
    const name = cs?.country && cs.country.length > 2 ? cs.country : c;
    const emoji = countryFlag(c);
    return { value: c, label: `${emoji ? emoji + " " : ""}${name}` };
  });

  const formatDur = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div className="space-y-5">
      {/* ── Tab Selector ── */}
      <div className="flex items-center gap-4 border-b pb-0">
        <button
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "overview" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "personalization" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("personalization")}
        >
          Personalization
        </button>
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === "overview" && (
        <div className="space-y-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-5">
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
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={loadOverview} disabled={overviewLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${overviewLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {overviewData ? (
            <>
              {/* Stat cards — single bordered container with dividers */}
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="size-2 rounded-full bg-[#171717]" />
                      Visitors
                    </div>
                    <div className="text-3xl font-bold mt-1.5 tracking-tight">{overviewData.totalVisitors.toLocaleString()}</div>
                    <DeltaBadge current={overviewData.totalVisitors} previous={overviewData.previousPeriod.totalVisitors} />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="size-2 rounded-full bg-violet-500" />
                      Sessions
                    </div>
                    <div className="text-3xl font-bold mt-1.5 tracking-tight">{overviewData.totalSessions.toLocaleString()}</div>
                    <DeltaBadge current={overviewData.totalSessions} previous={overviewData.previousPeriod.totalSessions} />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="size-2 rounded-full bg-amber-500" />
                      Pageviews
                    </div>
                    <div className="text-3xl font-bold mt-1.5 tracking-tight">{overviewData.totalPageviews.toLocaleString()}</div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        Revenue
                      </div>
                      {overviewData.totalOrders > 0 && (
                        <Badge variant="secondary" className="text-[10px] font-mono h-5 px-1.5">
                          {overviewData.totalOrders} orders
                        </Badge>
                      )}
                    </div>
                    <div className="text-3xl font-bold mt-1.5 tracking-tight">
                      ${(overviewData.totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Area chart */}
              <div className="rounded-xl border bg-card mt-0 overflow-hidden">
                <div className="p-4 pb-0">
                  <div className="flex items-center justify-end gap-4">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="size-2 rounded-full bg-[#171717]" /> Visitors
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="size-2 rounded-full bg-[#10b981]" /> New
                    </div>
                  </div>
                </div>
                <div className="h-[300px] px-2 pb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overviewData.dailyStats} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradOverviewVisitors" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#171717" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#171717" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return `${d.toLocaleString("en", { month: "short" })} ${d.getDate()}`;
                        }}
                        axisLine={false}
                        tickLine={false}
                        dy={8}
                        stroke={isDark ? "#475569" : "#94a3b8"}
                      />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={36} allowDecimals={false} stroke={isDark ? "#475569" : "#94a3b8"} />
                      <ReTooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      />
                      <Area type="monotone" dataKey="visitors" name="Visitors" stroke="#171717" strokeWidth={2} fill="url(#gradOverviewVisitors)" dot={false} activeDot={{ r: 4, fill: "#171717", strokeWidth: 2, stroke: isDark ? "#0c1520" : "#fff" }} />
                      <Area type="monotone" dataKey="newVisitors" name="New" stroke="#10b981" strokeWidth={1.5} fill="none" dot={false} activeDot={{ r: 3, fill: "#10b981", strokeWidth: 2, stroke: isDark ? "#0c1520" : "#fff" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Secondary stats row */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="rounded-xl border bg-card p-4">
                  <div className="text-xs text-muted-foreground">Bounce Rate</div>
                  <div className="text-xl font-bold mt-1">{overviewData.bounceRate}%</div>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <div className="text-xs text-muted-foreground">Avg Duration</div>
                  <div className="text-xl font-bold mt-1">{formatDur(overviewData.avgSessionDuration)}</div>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <div className="text-xs text-muted-foreground">New / Returning</div>
                  <div className="text-xl font-bold mt-1">{overviewData.newVisitors} / {overviewData.returningVisitors}</div>
                </div>
              </div>

              {/* Bottom panels — two side-by-side with tabs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Top Pages */}
                <div className="rounded-xl border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b">
                    <span className="text-sm font-semibold">Top Pages</span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pageviews</span>
                  </div>
                  <div className="divide-y">
                    {overviewData.pageStats.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <FileText className="h-6 w-6 text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground">No pageview data yet</p>
                      </div>
                    ) : (
                      overviewData.pageStats.slice(0, 8).map((p) => {
                        const maxPv = overviewData.pageStats[0]?.pageviews || 1;
                        const pct = Math.round((p.pageviews / maxPv) * 100);
                        return (
                          <div key={p.url} className="relative px-5 py-3 group hover:bg-muted/30 transition-colors">
                            <div className="absolute inset-y-0 left-0 bg-[#171717]/8 transition-all" style={{ width: `${pct}%` }} />
                            <div className="relative flex items-center justify-between gap-3">
                              <span className="text-sm truncate">{p.url}</span>
                              <span className="text-sm font-medium tabular-nums shrink-0">{p.pageviews.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Countries + Devices */}
                <OverviewRightPanel overviewData={overviewData} />
              </div>
            </>
          ) : overviewLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : null}
        </div>
      )}

      {/* ── Personalization Tab (existing analytics) ── */}
      {activeTab === "personalization" && (<div className="space-y-5">
      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0 justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            {[
              { d: 7, label: "7D" },
              { d: 14, label: "14D" },
              { d: 30, label: "30D" },
            ].map(({ d, label }) => (
              <button
                key={d}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${days === d ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setDays(d)}
              >
                {label}
              </button>
            ))}
          </div>

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

        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={loading}
          className="h-8 text-xs text-muted-foreground gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Filters Panel ── */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                options={data.filterOptions.devices.map(d => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }))}
                placeholder="All devices"
              />
              <FilterSelect
                label="Page"
                value={filters.url}
                onValueChange={(v) => setFilters(prev => ({ ...prev, url: v }))}
                options={data.filterOptions.urls.map(u => ({ value: u, label: u }))}
                placeholder="All pages"
              />
              <FilterSelect
                label="Element"
                value={filters.elementId}
                onValueChange={(v) => setFilters(prev => ({ ...prev, elementId: v }))}
                options={data.filterOptions.elements.map(id => ({ value: id, label: elementLabel(id) }))}
                placeholder="All elements"
              />
              <FilterSelect
                label="Rule"
                value={filters.ruleId}
                onValueChange={(v) => setFilters(prev => ({ ...prev, ruleId: v }))}
                options={data.filterOptions.rules.map(id => ({ value: id, label: ruleDescription(id) }))}
                placeholder="All rules"
              />
            </div>

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-dashed">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mr-1">Active:</span>
                {filters.country && (
                  <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 h-6 rounded-full">
                    {countryFlag(filters.country)} {(() => { const cs = data?.countryStats.find(s => s.countryCode === filters.country); return cs?.country && cs.country.length > 2 ? cs.country : filters.country; })()}
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
                    {filters.url}
                    <button onClick={() => setFilters(prev => ({ ...prev, url: "" }))} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"><X className="h-3 w-3" /></button>
                  </Badge>
                )}
                {filters.elementId && (
                  <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 h-6 rounded-full">
                    {elementLabel(filters.elementId)}
                    <button onClick={() => setFilters(prev => ({ ...prev, elementId: "" }))} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"><X className="h-3 w-3" /></button>
                  </Badge>
                )}
                {filters.ruleId && (
                  <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 h-6 rounded-full">
                    {ruleDescription(filters.ruleId)}
                    <button onClick={() => setFilters(prev => ({ ...prev, ruleId: "" }))} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"><X className="h-3 w-3" /></button>
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

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="group hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Impressions</p>
                <p className="text-3xl font-bold tracking-tight">{data.totalImpressions.toLocaleString()}</p>
                <div className="flex items-center gap-2">
                  <DeltaBadge current={data.totalImpressions} previous={data.previousPeriod.totalImpressions} />
                  <span className="text-[10px] text-muted-foreground">vs prev {days}d</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500 dark:text-sky-400 shrink-0">
                <Eye className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">~{avgPerDay}/day avg</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Unique Visitors</p>
                <p className="text-3xl font-bold tracking-tight">{data.uniqueVisitors.toLocaleString()}</p>
                <div className="flex items-center gap-2">
                  <DeltaBadge current={data.uniqueVisitors} previous={data.previousPeriod.uniqueVisitors} />
                  <span className="text-[10px] text-muted-foreground">vs prev {days}d</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Top Country</p>
                <p className="text-2xl font-bold tracking-tight truncate">
                  {topCountry ? `${countryFlag(topCountry.countryCode)} ${topCountry.country}` : "—"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 dark:text-violet-400 shrink-0">
                <Globe className="h-5 w-5" />
              </div>
            </div>
            {topCountry && <p className="text-[11px] text-muted-foreground mt-2">{topCountry.impressions.toLocaleString()} impressions &middot; {topCountry.uniqueVisitors} visitors</p>}
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Top Page</p>
                <p className="text-lg font-bold tracking-tight truncate font-mono">
                  {topPage ? topPage.url : "—"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 dark:text-amber-400 shrink-0">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            {topPage && <p className="text-[11px] text-muted-foreground mt-2">{topPage.impressions.toLocaleString()} impressions &middot; {topPage.uniqueVisitors} visitors</p>}
          </CardContent>
        </Card>
      </div>

      {/* ── World Map ── */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-0 pt-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Geographic Distribution</CardTitle>
            </div>
            {data.countryStats?.length > 0 && (
              <Badge variant="outline" className="text-[10px] font-medium">
                {data.countryStats.length} {data.countryStats.length === 1 ? "country" : "countries"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-2">
          <WorldMap countryStats={data.countryStats ?? []} isDark={isDark} />
        </CardContent>
      </Card>

      {/* ── Daily Trend + Devices ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0 pt-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">Daily Trend</CardTitle>
                </div>
                <CardDescription className="text-xs mt-1">Impressions & visitors over the last {days} days</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-[#171717]" /> Impressions
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-[#10b981]" /> Visitors
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-2 px-2">
            {data.dailyStats.length > 0 ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailyStats} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradImpressions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#171717" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#171717" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradVisitors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={v => { const d = new Date(v); return `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`; }}
                      axisLine={false}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                    <ReTooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelFormatter={v => new Date(v).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    />
                    <Area type="monotone" dataKey="impressions" name="Impressions" stroke="#171717" strokeWidth={2} fill="url(#gradImpressions)" dot={false} activeDot={{ r: 4, fill: "#171717", strokeWidth: 2, stroke: "#fff" }} />
                    <Area type="monotone" dataKey="visitors" name="Visitors" stroke="#10b981" strokeWidth={2} fill="url(#gradVisitors)" dot={false} activeDot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No trend data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0 pt-4 px-5">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Devices</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {deviceData.length > 0 ? (
              <div className="space-y-5">
                <div className="h-[150px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        dataKey="value"
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {deviceData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <ReTooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-lg font-bold">{totalDeviceImps.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {deviceData.map((d, i) => {
                    const pct = totalDeviceImps > 0 ? Math.round((d.value / totalDeviceImps) * 100) : 0;
                    return (
                      <div key={d.name} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${PIE_COLORS[i % PIE_COLORS.length]}15` }}>
                          <span style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>
                            {DEVICE_ICONS[d.name.toLowerCase()] || null}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{d.name}</span>
                            <span className="text-muted-foreground tabular-nums text-xs">{d.value.toLocaleString()} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted mt-1.5 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Monitor className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No device data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Top Pages + Top Rules ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-0 pt-4 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Top Pages</CardTitle>
              </div>
              {data.pageStats.length > 0 && (
                <span className="text-[10px] text-muted-foreground">{data.pageStats.length} pages</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            {data.pageStats.length > 0 ? (
              <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
                {data.pageStats.map((ps, idx) => {
                  const maxPageImps = data.pageStats[0].impressions;
                  const pct = maxPageImps > 0 ? Math.round((ps.impressions / maxPageImps) * 100) : 0;
                  return (
                    <div key={ps.url} className="group rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">{idx + 1}</span>
                          <span className="truncate text-sm font-mono">{ps.url}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          <span className="text-muted-foreground">{ps.uniqueVisitors} <span className="hidden sm:inline">visitors</span></span>
                          <span className="font-semibold tabular-nums">{ps.impressions.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="h-1 rounded-full bg-muted/80 mt-2 overflow-hidden ml-7.5">
                        <div className="h-full rounded-full bg-sky-500/50 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No page data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0 pt-4 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Top Rules</CardTitle>
              </div>
              {data.ruleStats.length > 0 && (
                <span className="text-[10px] text-muted-foreground">{data.ruleStats.length} rules</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            {data.ruleStats.length > 0 ? (
              <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
                {data.ruleStats.map((rs, idx) => {
                  const maxRuleImps = data.ruleStats[0].impressions;
                  const pct = maxRuleImps > 0 ? Math.round((rs.impressions / maxRuleImps) * 100) : 0;
                  return (
                    <div key={rs.ruleId} className="group rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">{idx + 1}</span>
                          <span className="truncate text-sm">{ruleDescription(rs.ruleId)}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          <span className="text-muted-foreground">{rs.uniqueVisitors} <span className="hidden sm:inline">visitors</span></span>
                          <span className="font-semibold tabular-nums">{rs.impressions.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="h-1 rounded-full bg-muted/80 mt-2 overflow-hidden ml-7.5">
                        <div className="h-full rounded-full bg-violet-500/50 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Target className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No rule data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Impressions by Element ── */}
      <Card>
        <CardHeader className="pb-0 pt-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Impressions by Element</CardTitle>
            </div>
            {data.elementStats.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{data.elementStats.length} elements</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {data.elementStats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {data.elementStats
                .sort((a, b) => b.impressions - a.impressions)
                .map((es, idx) => {
                  const maxElImps = data.elementStats[0].impressions;
                  const pct = maxElImps > 0 ? Math.round((es.impressions / maxElImps) * 100) : 0;
                  const sharePct = data.totalImpressions > 0 ? Math.round((es.impressions / data.totalImpressions) * 100) : 0;
                  return (
                    <div key={es.elementId} className="group rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">{idx + 1}</span>
                          <span className="truncate text-sm font-medium">{elementLabel(es.elementId)}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground">{sharePct}%</span>
                          <span className="text-xs font-semibold tabular-nums">{es.impressions.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="h-1 rounded-full bg-muted/80 mt-2 overflow-hidden ml-7.5">
                        <div className="h-full rounded-full bg-emerald-500/50 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Layers className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No element data yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
      )}

    </div>
  );
}
