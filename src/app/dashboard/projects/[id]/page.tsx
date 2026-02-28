"use client";

import { useEffect, useState, useCallback, Suspense, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { useProject } from "@/lib/project-context";
import { useConfirm } from "@/components/confirm-dialog";
import type { ProjectDTO, ElementConfigDTO, AudienceDTO } from "@/lib/types/dto";
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
  ExternalLink,
  Pencil,
  Trash2,
  Plus,
  Users,
  Sparkles,
  BarChart3,
  Eye,
  MousePointerClick,
  Globe,
  CheckCircle2,
  Circle,
  ArrowRight,
  Settings,
  Loader2,
  TrendingUp,
  Boxes,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ElementEditor } from "@/components/element-editor";
import { AudienceForm } from "@/components/audience-form";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { VisitorsDashboard } from "@/components/visitors-dashboard";
import { IntegrationsSettings } from "@/components/integrations-settings";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

interface AnalyticsSummary {
  totalImpressions: number;
  uniqueVisitors: number;
  dailyStats: { date: string; impressions: number; visitors: number }[];
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

function ProjectContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const { setCurrentProjectId } = useProject();
  const projectId = params.id as string;
  const section = searchParams.get("section") || "dashboard";

  const [project, setProject] = useState<ProjectDTO | null>(null);
  const [elements, setElements] = useState<ElementConfigDTO[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [audiences, setAudiences] = useState<AudienceDTO[]>([]);
  const [showAudienceForm, setShowAudienceForm] = useState(false);
  const [editingAudience, setEditingAudience] = useState<AudienceDTO | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<"success" | "fail" | null>(null);
  const [scriptVerified, setScriptVerified] = useState(false);

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

  useEffect(() => {
    loadProject();
    loadElements();
    loadAudiences();
    loadAnalyticsSummary();
  }, [loadProject, loadElements, loadAudiences, loadAnalyticsSummary]);

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

  return (
    <div className="space-y-6">
      {/* ========== DASHBOARD ========== */}
      {section === "dashboard" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">{project.siteUrl}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={project.siteUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit site
                </a>
              </Button>
              <Button variant="destructive" size="icon" className="h-8 w-8" onClick={deleteProject}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Getting Started Checklist */}
          {!allChecklistDone && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Getting Started
                </CardTitle>
                <CardDescription>
                  Complete these steps to start personalizing your Framer site
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {checklist.map(item => (
                    <button
                      key={item.key}
                      onClick={() => navigate(item.section)}
                      className="flex items-center gap-3 w-full text-left group"
                    >
                      {item.done ? (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                      )}
                      <span className={`text-sm flex-1 ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {item.label}
                      </span>
                      {!item.done && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-primary transition-colors" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metrics Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-t-2 border-t-primary">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Impressions (7d)</p>
                    <p className="text-2xl font-bold mt-1">{analyticsSummary ? analyticsSummary.totalImpressions.toLocaleString() : "—"}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Eye className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-t-2 border-t-primary">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Visitors (7d)</p>
                    <p className="text-2xl font-bold mt-1">{analyticsSummary ? analyticsSummary.uniqueVisitors.toLocaleString() : "—"}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <MousePointerClick className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-t-2 border-t-primary">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Personalizations</p>
                    <p className="text-2xl font-bold mt-1">{elements.length}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-t-2 border-t-primary">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Rules</p>
                    <p className="text-2xl font-bold mt-1">{totalActiveRules}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mini Traffic Trend */}
          {analyticsSummary && analyticsSummary.dailyStats.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium">Traffic overview</p>
                    <p className="text-xs text-muted-foreground">Impressions &amp; visitors over the last 7 days</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("analytics")}>
                    View details
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
                <div className="h-[140px] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsSummary.dailyStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dashImpressions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#171717" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#171717" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="dashVisitors" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
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
                      <Area type="monotone" dataKey="impressions" name="Impressions" stroke="#171717" strokeWidth={2} fill="url(#dashImpressions)" dot={false} activeDot={{ r: 3, fill: "#171717" }} />
                      <Area type="monotone" dataKey="visitors" name="Visitors" stroke="#10b981" strokeWidth={2} fill="url(#dashVisitors)" dot={false} activeDot={{ r: 3, fill: "#10b981" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#171717" }} />
                    Impressions
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#10b981" }} />
                    Visitors
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("editor")}>
                <Pencil className="mr-2 h-4 w-4" />
                Open editor
              </Button>
              <Button variant="outline" size="sm" onClick={copySnippet}>
                <Copy className="mr-2 h-4 w-4" />
                Copy script
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("analytics")}>
                <BarChart3 className="mr-2 h-4 w-4" />
                View analytics
              </Button>
            </CardContent>
          </Card>
        </>
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
