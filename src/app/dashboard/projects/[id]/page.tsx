"use client";

import { useEffect, useState, useCallback, Suspense, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { useProject } from "@/lib/project-context";
import { useAuth } from "@/lib/auth-context";
import { useConfirm } from "@/components/confirm-dialog";
import { Favicon } from "@/components/favicon";
import type { ProjectDTO, ElementConfigDTO, AudienceDTO, VisitorDTO } from "@/lib/types/dto";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Copy,
  Pencil,
  Trash2,
  Plus,
  Users,
  Sparkles,
  Globe,
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Settings,
  Loader2,
  Boxes,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ElementEditor } from "@/components/element-editor";
import { AudienceForm } from "@/components/audience-form";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { VisitorsDashboard, VisitorDetailPanel } from "@/components/visitors-dashboard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { IntegrationsSettings } from "@/components/integrations-settings";
import { RecordingsDashboard } from "@/components/recordings-dashboard";
import { SegiChatView } from "@/components/segi-chat-view";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

interface AnalyticsSummary {
  totalImpressions: number;
  uniqueVisitors: number;
  dailyStats: { date: string; impressions: number; visitors: number }[];
}

interface OverviewData {
  totalVisitors: number;
  previousPeriod: { totalVisitors: number; totalSessions: number };
  totalPageviews: number;
  totalRevenue: number;
  totalSessions: number;
  dailyStats: { date: string; visitors: number; sessions: number; pageviews: number }[];
}

const CONDITION_TYPE_LABELS: Record<string, string> = {
  always: "Always",
  trafficSource: "Traffic Source",
  device: "Device",
  language: "Language",
  visitorType: "Visitor Type",
  url: "Page URL",
  referrer: "Referrer",
  geo: "Location",
  time: "Time",
};

function countryCodeToFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return `$${n.toLocaleString()}`;
}

function percentChange(current: number, previous: number): { value: number; positive: boolean } {
  if (previous === 0) return { value: current > 0 ? 100 : 0, positive: current > 0 };
  const change = Math.round(((current - previous) / previous) * 100);
  return { value: Math.abs(change), positive: change >= 0 };
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

const AVATAR_STYLES = ["adventurer", "adventurer-neutral", "avataaars", "big-ears", "big-smile", "lorelei", "notionists", "open-peeps", "personas", "thumbs"] as const;
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function visitorAvatarUrl(v: { email?: string | null; visitorId: string }, size = 80): string {
  const seed = v.email || v.visitorId;
  const style = AVATAR_STYLES[hashSeed(seed) % AVATAR_STYLES.length];
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

function StatCard({ value, label, change }: {
  value: string;
  label: string;
  change: { value: number; positive: boolean } | null;
}) {
  const isPositive = change?.positive !== false;

  return (
    <div className="rounded-2xl border border-border bg-transparent p-5 flex flex-col justify-between min-h-[150px]">
      <div>
        <p className="text-3xl font-bold tracking-tight dark:text-white">{value}</p>
        <p className="text-sm text-muted-foreground mt-1.5">{label}</p>
      </div>
      <div className="flex items-center gap-2.5 mt-auto pt-4">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-xs font-semibold"
          style={{
            backgroundColor: isPositive ? "rgba(43, 153, 105, 0.1)" : "rgba(255, 111, 0, 0.1)",
            color: isPositive ? "#14F190" : "#FF6F00",
          }}
        >
          {isPositive ? (
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.5} />
          )}
          {change ? `${change.value}%` : "—"}
        </span>
        <span className="text-xs text-muted-foreground">vs last week</span>
      </div>
    </div>
  );
}

function ProjectContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const { setCurrentProjectId } = useProject();
  const { user } = useAuth();
  const projectId = params.id as string;
  const section = searchParams.get("section") || "dashboard";
  const chatConversationId = searchParams.get("conversationId") || null;

  const [project, setProject] = useState<ProjectDTO | null>(null);
  const [elements, setElements] = useState<ElementConfigDTO[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [audiences, setAudiences] = useState<AudienceDTO[]>([]);
  const [showAudienceForm, setShowAudienceForm] = useState(false);
  const [editingAudience, setEditingAudience] = useState<AudienceDTO | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [latestVisitors, setLatestVisitors] = useState<VisitorDTO[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<"success" | "fail" | null>(null);
  const [scriptVerified, setScriptVerified] = useState(false);
  const [chatTitle, setChatTitle] = useState<string>("");
  const [visitorSheetOpen, setVisitorSheetOpen] = useState(false);
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);

  function openVisitorDetail(visitorId: string) {
    setSelectedVisitorId(visitorId);
    setVisitorSheetOpen(true);
  }

  function closeVisitorDetail() {
    setVisitorSheetOpen(false);
    setTimeout(() => setSelectedVisitorId(null), 300);
  }

  useEffect(() => {
    const saved = localStorage.getItem(`segmentor_script_verified_${projectId}`);
    if (saved === "true") setScriptVerified(true);
  }, [projectId]);

  useEffect(() => {
    setCurrentProjectId(projectId);
  }, [projectId, setCurrentProjectId]);

  const loadProject = useCallback(async () => {
    try {
      const p = await api.get<ProjectDTO>(`/api/projects/${projectId}`);
      setProject(p);
    } catch {
      toast.error("Failed to load project");
      router.push("/dashboard");
    }
  }, [projectId, router]);

  const loadElements = useCallback(async () => {
    try {
      const els = await api.get<ElementConfigDTO[]>(
        `/api/projects/${projectId}/elements`
      );
      setElements(els);
    } catch {
      toast.error("Failed to load elements");
    }
  }, [projectId]);

  const loadAudiences = useCallback(async () => {
    try {
      const list = await api.get<AudienceDTO[]>(`/api/projects/${projectId}/audiences`);
      setAudiences(list);
    } catch { /* ignore */ }
  }, [projectId]);

  const loadAnalyticsSummary = useCallback(async () => {
    try {
      const result = await api.get<AnalyticsSummary>(`/api/projects/${projectId}/analytics?days=7`);
      setAnalyticsSummary(result);
    } catch { /* ignore */ }
  }, [projectId]);

  const loadOverviewData = useCallback(async () => {
    try {
      const result = await api.get<OverviewData>(`/api/projects/${projectId}/analytics/overview?days=7`);
      setOverviewData(result);
    } catch { /* ignore */ }
  }, [projectId]);

  const loadLatestVisitors = useCallback(async () => {
    try {
      const result = await api.get<{ visitors: VisitorDTO[] }>(`/api/projects/${projectId}/visitors?limit=7&sortBy=lastSeenAt&sortOrder=desc`);
      setLatestVisitors(result.visitors || []);
    } catch { /* ignore */ }
  }, [projectId]);

  useEffect(() => {
    loadProject();
    loadElements();
    loadAudiences();
    loadAnalyticsSummary();
    loadOverviewData();
    loadLatestVisitors();
  }, [loadProject, loadElements, loadAudiences, loadAnalyticsSummary, loadOverviewData, loadLatestVisitors]);

  async function deleteProject() {
    const ok = await confirm({
      title: "Delete Project",
      description: "This will permanently delete the project and all its elements, variants, and rules. This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/projects/${projectId}`);
      toast.success("Project deleted");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to delete project");
    }
  }

  async function deleteElement(elementId: string) {
    const ok = await confirm({
      title: "Delete Personalization",
      description: "This will delete the personalization element and all its variants and rules.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/elements/${elementId}`);
      toast.success("Personalization deleted");
      if (selectedElementId === elementId) setSelectedElementId(null);
      loadElements();
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function deleteAudience(audienceId: string) {
    const ok = await confirm({
      title: "Delete Audience",
      description: "This audience will be permanently removed. Rules using it will need to be updated.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/audiences/${audienceId}`);
      toast.success("Audience deleted");
      loadAudiences();
    } catch {
      toast.error("Failed to delete audience");
    }
  }

  function getSnippet() {
    if (!project) return "";
    return `<!-- Segmentor: hide page until personalization is applied -->\n<style id="segmentor-hide">html{opacity:0!important}</style>\n<script src="${SITE_URL}/runtime.js?projectKey=${project.publicKey}" data-api="${API_URL}"></script>`;
  }

  function copySnippet() {
    if (!project) return;
    navigator.clipboard.writeText(getSnippet());
    toast.success("Snippet copied!");
  }

  async function verifyInstallation() {
    if (!project) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      await fetch(`${SITE_URL}/runtime.js?projectKey=${project.publicKey}`, { method: "HEAD", mode: "no-cors" });
      setVerifyResult("success");
      setScriptVerified(true);
      localStorage.setItem(`segmentor_script_verified_${projectId}`, "true");
    } catch {
      setVerifyResult("fail");
    } finally {
      setVerifying(false);
    }
  }

  const totalActiveRules = useMemo(() =>
    elements.reduce((sum, el) => sum + el.rules.filter(r => r.enabled).length, 0),
    [elements]
  );

  const checklist = useMemo(() => {
    const items = [
      { key: "setup", label: "Install the script on your Framer site", done: scriptVerified, section: "setup" },
      { key: "element", label: "Pick your first element in the editor", done: elements.length > 0, section: "editor" },
      { key: "audience", label: "Create your first audience", done: audiences.length > 0, section: "audiences" },
      { key: "rule", label: "Publish your first personalization rule", done: totalActiveRules > 0, section: "personalizations" },
    ];
    return items;
  }, [elements, audiences, totalActiveRules, scriptVerified]);

  const allChecklistDone = checklist.every(c => c.done);

  const chartData = useMemo(() => {
    if (!overviewData?.dailyStats || !analyticsSummary?.dailyStats) return [];
    const impressionMap = new Map(analyticsSummary.dailyStats.map(d => [d.date, d.impressions]));
    return overviewData.dailyStats.map(d => ({
      date: d.date,
      visitors: d.visitors,
      impressions: impressionMap.get(d.date) || 0,
    }));
  }, [overviewData, analyticsSummary]);

  function audienceRuleCount(audienceId: string): number {
    return elements.reduce((sum, el) =>
      sum + el.rules.filter(r => r.audienceId === audienceId).length, 0
    );
  }

  function formatConditionSummary(audience: AudienceDTO): string {
    if (audience.conditions.length === 0) return "No conditions";
    const parts = audience.conditions.slice(0, 3).map(c => {
      const typeLabel = CONDITION_TYPE_LABELS[c.type] || c.type;
      if (c.type === "always") return "Always match";
      return `${typeLabel} ${c.comparator} "${c.value}"`;
    });
    const joiner = audience.logic === "OR" ? " or " : " and ";
    let result = parts.join(joiner);
    if (audience.conditions.length > 3) {
      result += ` +${audience.conditions.length - 3} more`;
    }
    return result;
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedElement = elements.find((e) => e.id === selectedElementId) ?? null;

  function navigate(s: string) {
    posthog.capture("page_section_viewed", { section: s, project_id: projectId });
    if (s === "editor") {
      router.push(`/dashboard/projects/${projectId}/editor`);
    } else {
      router.push(`/dashboard/projects/${projectId}?section=${s}`);
    }
  }

  const userName = user?.name || user?.email?.split("@")[0] || "there";
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  const todayVisitors = overviewData?.totalVisitors ?? 0;

  const visitorsChange = overviewData
    ? percentChange(overviewData.totalVisitors, overviewData.previousPeriod.totalVisitors)
    : null;
  const sessionsChange = overviewData
    ? percentChange(overviewData.totalSessions, overviewData.previousPeriod.totalSessions)
    : null;

  return (
    <div className={section === "chat" ? "h-full" : "space-y-6"}>
      {/* ========== DASHBOARD ========== */}
      {section === "dashboard" && (
        <>
          {/* Greeting Card */}
          <div className="rounded-2xl p-6 dark:bg-[#484848] bg-muted/60">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold dark:text-white">Hey, {userName}</h1>
                <p className="text-m  mt-1.5 text-base">
                  It&apos;s {dateStr} and{" "}
                  <span className="inline-flex items-center gap-1 align-middle px-2 py-0.5 rounded-md dark:bg-[#415549] bg-black/10">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#14F190" }} />
                    <span className="font-semibold text-sm" style={{ color: "#14F190" }}>{formatNumber(todayVisitors)}</span>
                  </span>{" "}
                  visitors on your website today.
                </p>
              </div>
              <button
                onClick={() => navigate("chat")}
                className="btn-gradient-animate shrink-0 h-13 px-8 rounded-full text-[15px] font-semibold text-white flex items-center gap-2.5 transition-all cursor-pointer"
                style={{ background: "linear-gradient(90deg, #C0CC4C 0%, #F4925A 25%, #D0B659 50%, #76CB69 75%, #C0CC4C 100%)", backgroundSize: "200% 200%" }}
              >
                <Sparkles className="h-4 w-4" />
                Ask AI for more
              </button>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              value={analyticsSummary ? formatNumber(analyticsSummary.totalImpressions) : "—"}
              label="Impressions"
              change={sessionsChange}
            />
            <StatCard
              value={overviewData ? formatNumber(overviewData.totalVisitors) : "—"}
              label="Visitors"
              change={visitorsChange}
            />
            <StatCard
              value={overviewData ? formatNumber(overviewData.totalPageviews) : "—"}
              label="Pageviews"
              change={sessionsChange}
            />
            <StatCard
              value={overviewData ? formatCurrency(overviewData.totalRevenue) : "—"}
              label="Revenue"
              change={visitorsChange}
            />
          </div>

          {/* Bottom Row: Latest Visitors + Traffic Overview */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Latest Visitors */}
            <div className="rounded-2xl border border-border bg-transparent overflow-hidden ">
              <div className="flex items-center justify-between pt-3 pb-2 w-full dark:bg-[#383838] pl-2">
                <p className="text-sm font-semibold dark:text-white pl-1">Latest visitors</p>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-primary" onClick={() => navigate("visitors")}>
                  View all
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
              <div className="divide-y dark:divide-[#484848] divide-border/50 px-4">
                  {latestVisitors.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No visitors yet</p>
                  ) : (
                    latestVisitors.map((v) => {
                      const displayName = v.name || v.email || v.visitorId.slice(0, 12);
                      const flag = countryCodeToFlag(v.countryCode);
                      const location = v.city || v.country || "";
                      return (
                        <div key={v.id} className="flex items-center p-4 cursor-pointer hover:bg-muted/40 transition-colors rounded-lg" onClick={() => openVisitorDetail(v.visitorId)}>
                          <img
                            src={visitorAvatarUrl(v, 80)}
                            alt=""
                            className="h-10 w-10 rounded-full shrink-0 bg-muted object-cover "
                            loading="lazy"
                          />
                          <span className="text-sm font-medium truncate dark:text-white w-[120px] shrink-0 ml-4">
                            {displayName}
                          </span>
                          <span className="text-sm text-muted-foreground truncate w-[120px] shrink-0 ml-4">
                            {location} {flag}
                          </span>
                          <span className="text-sm text-muted-foreground shrink-0 ml-4">
                            {v.browser || "—"}
                          </span>
                          <span className="text-sm text-muted-foreground shrink-0 ml-auto text-right">
                            {timeAgo(v.lastSeenAt)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
            </div>

            {/* Traffic Overview Chart */}
            <div className="rounded-2xl border border-border bg-transparent flex flex-col overflow-hidden ">
              <div className="flex items-center justify-between px-2 pt-2  w-full dark:bg-[#383838]">
                <p className="text-sm font-semibold dark:text-white pt-2 pb-3 pl-1">Traffic overview</p>
                <span className="text-xs text-muted-foreground">Last 7 days</span>
              </div>
              <div className="flex-1 flex flex-col">
                {chartData.length > 0 ? (
                  <>
                    <div className="flex-1 min-h-[280px] pt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                          <CartesianGrid stroke="var(--border)" strokeOpacity={0.3} vertical={false} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                            tickFormatter={(v) => `${new Date(v).getDate()}`}
                            axisLine={false}
                            tickLine={false}
                            dy={8}
                          />
                          <YAxis hide />
                          <ReTooltip
                            contentStyle={{
                              fontSize: 12,
                              borderRadius: 8,
                              border: "1px solid var(--border)",
                              backgroundColor: "var(--popover)",
                              color: "var(--popover-foreground)",
                            }}
                            labelFormatter={(v) => new Date(v).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                          />
                          <Line type="natural" dataKey="impressions" name="Impressions" stroke="#3ACB68" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                          <Line type="natural" dataKey="visitors" name="Visitors" stroke="#FA783E" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-6 py-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#3ACB68" }} />
                        Impressions
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#FA783E" }} />
                        Visitors
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center flex-1 min-h-[280px] text-sm text-muted-foreground">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========== CHAT ========== */}
      {section === "chat" && (
        <SegiChatView
          projectId={projectId}
          conversationId={chatConversationId}
          onConversationCreated={(id) => {
            router.replace(`/dashboard/projects/${projectId}?section=chat&conversationId=${id}`);
            window.dispatchEvent(new CustomEvent("segi-conversations-updated"));
          }}
          onTitleUpdate={setChatTitle}
        />
      )}

      {/* ========== PERSONALIZATIONS ========== */}
      {section === "personalizations" && (
        <>
          {elements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold mb-2">No personalizations yet</h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Use the Visual Editor to select elements on your Framer site and create personalized variants for different audiences.
              </p>
              <Button asChild>
                <Link href={`/dashboard/projects/${projectId}/editor`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Open Editor
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-2">
                {elements.map((el) => {
                  const activeRules = el.rules.filter(r => r.enabled).length;
                  return (
                    <Card
                      key={el.id}
                      className={`cursor-pointer transition-colors ${
                        selectedElementId === el.id
                          ? "border-primary"
                          : "hover:border-muted-foreground/30"
                      }`}
                      onClick={() => setSelectedElementId(el.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="font-medium text-sm truncate">{el.label}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteElement(el.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">
                            {el.variants.length} {el.variants.length === 1 ? "variant" : "variants"}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {activeRules} active {activeRules === 1 ? "rule" : "rules"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="lg:col-span-2">
                {selectedElement ? (
                  <ElementEditor
                    element={selectedElement}
                    audiences={audiences}
                    onUpdate={loadElements}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <Boxes className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Select a personalization to edit its variants and rules
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== AUDIENCES ========== */}
      {section === "audiences" && (
        <div className="space-y-4">
          {audiences.length === 0 && !showAudienceForm ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Create your first audience</h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Audiences let you target specific groups of visitors — by device, location, language, traffic source, and more.
              </p>
              <Button onClick={() => { setEditingAudience(null); setShowAudienceForm(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Create Audience
              </Button>
            </div>
          ) : (
            <>
              {audiences.map(a => {
                const rulesUsing = audienceRuleCount(a.id);
                return (
                  <Card key={a.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary shrink-0" />
                            <p className="font-medium text-sm">{a.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground truncate pl-6">
                            {formatConditionSummary(a)}
                          </p>
                          <div className="flex items-center gap-2 pl-6">
                            <Badge variant="outline" className="text-[10px]">
                              {a.conditions.length} condition{a.conditions.length !== 1 ? "s" : ""}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {a.logic === "OR" ? "Any match" : "All match"}
                            </Badge>
                            <Badge variant={rulesUsing > 0 ? "secondary" : "outline"} className="text-[10px]">
                              Used in {rulesUsing} {rulesUsing === 1 ? "rule" : "rules"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingAudience(a); setShowAudienceForm(true); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteAudience(a.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {showAudienceForm ? (
                <AudienceForm
                  projectId={projectId}
                  audience={editingAudience ?? undefined}
                  onDone={() => { setShowAudienceForm(false); setEditingAudience(null); loadAudiences(); }}
                  onCancel={() => { setShowAudienceForm(false); setEditingAudience(null); }}
                />
              ) : (
                <Button variant="outline" size="sm" onClick={() => { setEditingAudience(null); setShowAudienceForm(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Audience
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* ========== VISITORS ========== */}
      {section === "visitors" && (
        <VisitorsDashboard projectId={projectId} />
      )}

      {/* ========== ANALYTICS ========== */}
      {section === "analytics" && (
        <AnalyticsDashboard projectId={projectId} elements={elements} />
      )}

      {/* ========== RECORDINGS ========== */}
      {section === "recordings" && (
        <RecordingsDashboard projectId={projectId} />
      )}

      {/* ========== INTEGRATIONS ========== */}
      {section === "integrations" && (
        <IntegrationsSettings projectId={projectId} />
      )}

      {/* ========== SETUP ========== */}
      {section === "setup" && (
        <div className="space-y-6">
          {/* Step 1 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <div>
                  <CardTitle className="text-base">Copy the script snippet</CardTitle>
                  <CardDescription>
                    Your unique Segmentor script — paste this into your Framer site
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap break-all">
                  {getSnippet()}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={copySnippet}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Settings className="h-3.5 w-3.5" />
                <span>Public key: <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[11px]">{project.publicKey}</code></span>
              </div>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <div>
                  <CardTitle className="text-base">Add it to your Framer site</CardTitle>
                  <CardDescription>
                    Paste the snippet into your Framer project&apos;s custom code section
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                  <li>Open your project in <strong className="text-foreground">Framer</strong></li>
                  <li>Click the <strong className="text-foreground">gear icon</strong> (Site Settings) in the top-right corner</li>
                  <li>Go to the <strong className="text-foreground">General</strong> tab and scroll down to <strong className="text-foreground">&ldquo;Custom Code&rdquo;</strong></li>
                  <li>Paste the script snippet into the <strong className="text-foreground">&ldquo;End of &lt;head&gt; tag&rdquo;</strong> section</li>
                  <li>Click <strong className="text-foreground">Save</strong> and <strong className="text-foreground">Publish</strong> your site</li>
                </ol>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Tip:</strong> The script loads asynchronously and won&apos;t affect your site&apos;s loading speed. Personalizations are applied instantly once the page renders.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </div>
                <div>
                  <CardTitle className="text-base">Verify installation</CardTitle>
                  <CardDescription>
                    Test that the Segmentor runtime is reachable for your project
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={verifyInstallation}
                  disabled={verifying}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing…
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </Button>
                {verifyResult === "success" && (
                  <span className="flex items-center gap-1.5 text-sm text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    Runtime is reachable
                  </span>
                )}
                {verifyResult === "fail" && (
                  <span className="flex items-center gap-1.5 text-sm text-destructive">
                    <Circle className="h-4 w-4" />
                    Could not reach runtime — check your backend is running
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Sheet open={visitorSheetOpen} onOpenChange={(open) => { if (!open) closeVisitorDetail(); }}>
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
              onClose={closeVisitorDetail}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    }>
      <ProjectContent />
    </Suspense>
  );
}
