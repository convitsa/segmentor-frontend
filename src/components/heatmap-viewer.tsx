"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { useSocket } from "@/lib/use-socket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SegiOrb } from "@/components/segi-orb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MousePointerClick,
  Move,
  ArrowDownWideNarrow,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  ChevronLeft,
  Eye,
} from "lucide-react";

type HeatmapType = "click" | "move" | "scroll";

interface PageItem {
  url: string;
  total: number;
  clicks: number;
  moves: number;
  scrolls: number;
  lastEvent: string;
}

interface HeatmapPoint {
  x: number;
  y: number;
  weight: number;
}

interface ScrollBand {
  depth: number;
  count: number;
  reach: number;
  dropOff: number;
}

interface Props {
  projectId: string;
  siteUrl?: string;
}

export function HeatmapViewer({ projectId, siteUrl }: Props) {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [heatmapType, setHeatmapType] = useState<HeatmapType>("click");
  const [device, setDevice] = useState("all");
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [scrollBands, setScrollBands] = useState<ScrollBand[]>([]);
  const [scrollTotal, setScrollTotal] = useState(0);
  const [loadingData, setLoadingData] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pageHeight, setPageHeight] = useState(0);

  const loadPages = useCallback(async () => {
    setLoadingPages(true);
    try {
      const data = await api.get<PageItem[]>(`/api/projects/${projectId}/heatmaps/pages`);
      setPages(data);
    } catch {
      setPages([]);
    } finally {
      setLoadingPages(false);
    }
  }, [projectId]);

  useEffect(() => { loadPages(); }, [loadPages]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "segmentor-page-height" && typeof e.data.height === "number") {
        setPageHeight(e.data.height);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useSocket(projectId, useCallback((event) => {
    if (event.type !== "heatmap:new") return;
    const d = event.data as Record<string, unknown>;
    const url = d.url as string;
    const clicks = (d.clicks as number) || 0;
    const moves = (d.moves as number) || 0;
    const scrolls = (d.scrolls as number) || 0;

    setPages((prev) => {
      const idx = prev.findIndex((p) => p.url === url);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          clicks: updated[idx].clicks + clicks,
          moves: updated[idx].moves + moves,
          scrolls: updated[idx].scrolls + scrolls,
          total: updated[idx].total + clicks + moves + scrolls,
          lastEvent: new Date().toISOString(),
        };
        return updated;
      }
      return [{
        url,
        total: clicks + moves + scrolls,
        clicks,
        moves,
        scrolls,
        lastEvent: new Date().toISOString(),
      }, ...prev];
    });
  }, []));

  const pointsRef = useRef<HeatmapPoint[]>([]);
  const bandsRef = useRef<ScrollBand[]>([]);
  const typeRef = useRef<HeatmapType>(heatmapType);
  const heightRef = useRef(0);

  pointsRef.current = points;
  bandsRef.current = scrollBands;
  typeRef.current = heatmapType;
  heightRef.current = pageHeight;

  const redraw = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = container.clientWidth;
    const h = heightRef.current > 0 ? heightRef.current : container.clientHeight;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    const curType = typeRef.current;
    if (curType === "scroll") {
      const bands = bandsRef.current;
      if (!bands.length) return;

      const reachAt = (depth: number): number => {
        if (depth <= 0) return 100;
        for (let i = 0; i < bands.length - 1; i++) {
          if (depth >= bands[i].depth && depth <= bands[i + 1].depth) {
            const t = (depth - bands[i].depth) / (bands[i + 1].depth - bands[i].depth || 1);
            return bands[i].reach + t * (bands[i + 1].reach - bands[i].reach);
          }
        }
        return bands[bands.length - 1].reach;
      };

      const reachToColor = (reach: number): [number, number, number] => {
        const stops: Array<[number, [number, number, number]]> = [
          [100, [220, 50, 47]],
          [80, [255, 140, 0]],
          [60, [255, 200, 0]],
          [40, [180, 220, 0]],
          [20, [0, 200, 120]],
          [0, [0, 180, 200]],
        ];
        for (let i = 0; i < stops.length - 1; i++) {
          const [hi, cHi] = stops[i];
          const [lo, cLo] = stops[i + 1];
          if (reach >= lo && reach <= hi) {
            const t = (reach - lo) / (hi - lo || 1);
            return [
              Math.round(cLo[0] + t * (cHi[0] - cLo[0])),
              Math.round(cLo[1] + t * (cHi[1] - cLo[1])),
              Math.round(cLo[2] + t * (cHi[2] - cLo[2])),
            ];
          }
        }
        return reach >= 100 ? stops[0][1] : stops[stops.length - 1][1];
      };

      const ROWS = Math.min(h, 400);
      for (let row = 0; row < ROWS; row++) {
        const depthPct = (row / ROWS) * 100;
        const reach = reachAt(depthPct);
        const [cr, cg, cb] = reachToColor(reach);
        const y1 = (row / ROWS) * h;
        const rowH = h / ROWS + 1;
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, 0.45)`;
        ctx.fillRect(0, y1, w, rowH);
      }

      const markerDepths: Array<{ label: string; reach: number }> = [
        { label: "75%", reach: 75 },
        { label: "Average fold\n50%", reach: 50 },
        { label: "25%", reach: 25 },
      ];

      for (const marker of markerDepths) {
        let markerY = -1;
        for (let d = 0; d <= 100; d += 0.5) {
          if (reachAt(d) <= marker.reach) {
            markerY = (d / 100) * h;
            break;
          }
        }
        if (markerY < 0) continue;

        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, markerY);
        ctx.lineTo(w, markerY);
        ctx.stroke();
        ctx.setLineDash([]);

        const lines = marker.label.split("\n");
        const pad = 8;
        const lineH = 16;
        const boxW = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2 + 10;
        const boxH = lines.length * lineH + pad * 2;
        const boxX = 8;
        const boxY = markerY - boxH / 2;

        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 6);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px system-ui, sans-serif";
        ctx.textBaseline = "middle";
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], boxX + pad, boxY + pad + i * lineH + lineH / 2);
        }
        ctx.restore();
      }
    } else {
      const pts = pointsRef.current;
      if (!pts.length) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const simpleheat = require("simpleheat");
        const heat = simpleheat(canvas);
        const maxWeight = Math.max(...pts.map((p) => p.weight));
        const data = pts.map((p) => [
          p.x * w,
          p.y * h,
          p.weight / maxWeight,
        ] as [number, number, number]);
        heat.data(data);
        heat.radius(Math.max(20, w / 30), Math.max(30, w / 20));
        heat.max(1);
        heat.draw(0.05);
      } catch (err) {
        console.error("[HeatmapViewer] simpleheat render failed:", err);
      }
    }
  }, []);

  const loadHeatmapData = useCallback(async () => {
    if (!selectedUrl) return;
    setLoadingData(true);
    try {
      const params = new URLSearchParams({
        url: selectedUrl,
        type: heatmapType,
        device,
      });
      const data = await api.get<{ type: string; points?: HeatmapPoint[]; bands?: ScrollBand[]; total?: number }>(
        `/api/projects/${projectId}/heatmaps/data?${params}`,
      );
      setPoints(data.points ?? []);
      setScrollBands(data.bands ?? []);
      setScrollTotal(data.total ?? 0);
    } catch {
      setPoints([]);
      setScrollBands([]);
    } finally {
      setLoadingData(false);
    }
  }, [projectId, selectedUrl, heatmapType, device]);

  useEffect(() => { loadHeatmapData(); }, [loadHeatmapData]);

  useEffect(() => {
    redraw();
  }, [points, scrollBands, heatmapType, pageHeight, selectedUrl, redraw]);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(() => redraw());
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [redraw]);

  const typeIcons = {
    click: <MousePointerClick className="h-4 w-4" />,
    move: <Move className="h-4 w-4" />,
    scroll: <ArrowDownWideNarrow className="h-4 w-4" />,
  };

  const deviceIcons: Record<string, React.ReactNode> = {
    all: <Globe className="h-3.5 w-3.5" />,
    desktop: <Monitor className="h-3.5 w-3.5" />,
    mobile: <Smartphone className="h-3.5 w-3.5" />,
    tablet: <Tablet className="h-3.5 w-3.5" />,
  };

  if (!selectedUrl) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold dark:text-white">Heatmaps</h2>
            <p className="text-sm text-muted-foreground">See where visitors click, move, and scroll on your pages</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadPages} disabled={loadingPages}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingPages ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loadingPages ? (
          <div className="flex items-center justify-center py-20">
            <SegiOrb size={48} thinking />
          </div>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <Eye className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No heatmap data yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Heatmap data will appear here once visitors start interacting with your site.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {pages.map((page) => (
              <button
                key={page.url}
                onClick={() => setSelectedUrl(page.url)}
                className="w-full text-left rounded-xl border dark:border-[#484848] bg-card dark:bg-[#3a3a3a] hover:bg-muted/60 dark:hover:bg-[#444] transition-colors px-5 py-4"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate dark:text-white">{page.url}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <Badge variant="secondary" className="text-[11px]">
                        <MousePointerClick className="h-3 w-3 mr-1" />
                        {page.clicks.toLocaleString()} clicks
                      </Badge>
                      <Badge variant="secondary" className="text-[11px]">
                        <Move className="h-3 w-3 mr-1" />
                        {page.moves.toLocaleString()} moves
                      </Badge>
                      <Badge variant="secondary" className="text-[11px]">
                        <ArrowDownWideNarrow className="h-3 w-3 mr-1" />
                        {page.scrolls.toLocaleString()} scrolls
                      </Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-4">
                    {new Date(page.lastEvent).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const iframeUrl = siteUrl
    ? `${API_URL}/public/heatmap-proxy?url=${encodeURIComponent(siteUrl.replace(/\/$/, "") + selectedUrl)}`
    : null;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 140px)" }}>
      <div className="flex items-center gap-3 px-1 pb-4 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedUrl(null); setPoints([]); setScrollBands([]); setPageHeight(0); }}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <span className="text-sm font-medium truncate dark:text-white flex-1">{selectedUrl}</span>

        <div className="flex items-center gap-2">
          {(["click", "move", "scroll"] as HeatmapType[]).map((t) => (
            <Button
              key={t}
              variant={heatmapType === t ? "default" : "outline"}
              size="sm"
              className="text-xs h-8"
              onClick={() => { setHeatmapType(t); setPoints([]); setScrollBands([]); }}
            >
              {typeIcons[t]}
              <span className="ml-1.5 capitalize">{t}</span>
            </Button>
          ))}

          <Select value={device} onValueChange={setDevice}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(deviceIcons).map(([key, icon]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-1.5">
                    {icon}
                    <span className="capitalize">{key}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        {heatmapType === "scroll" && scrollBands.length > 0 && (
          <div className="w-[220px] shrink-0 border-r dark:border-[#484848] overflow-y-auto bg-card dark:bg-[#2a2a2a]">
            <div className="sticky top-0 z-10 bg-card dark:bg-[#2a2a2a] border-b dark:border-[#484848] px-3 py-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Scroll data</p>
              {scrollTotal > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{scrollTotal.toLocaleString()} total sessions</p>
              )}
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b dark:border-[#484848] text-muted-foreground">
                  <th className="text-left px-3 py-1.5 font-medium">% scrolled</th>
                  <th className="text-right px-3 py-1.5 font-medium"># visitors</th>
                  <th className="text-right px-3 py-1.5 font-medium">% drop off</th>
                </tr>
              </thead>
              <tbody>
                {scrollBands.filter((b) => b.depth > 0).map((band) => (
                  <tr key={band.depth} className="border-b dark:border-[#484848]/50 hover:bg-muted/40 transition-colors">
                    <td className="px-3 py-1.5 font-medium dark:text-white">{band.depth}%</td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      {band.count.toLocaleString()} ({band.reach}%)
                    </td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      {band.dropOff > 0 ? `${band.dropOff.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div ref={containerRef} className="flex-1 min-w-0 relative rounded-xl border dark:border-[#484848] overflow-y-auto overflow-x-hidden bg-white">
          {loadingData && (
            <div className="sticky top-0 left-0 w-full z-30 flex items-center justify-center bg-black/20 backdrop-blur-sm" style={{ height: containerRef.current?.clientHeight || "100%" }}>
              <SegiOrb size={48} thinking />
            </div>
          )}

          {iframeUrl ? (
            <div className="relative" style={{ height: pageHeight > 0 ? pageHeight : "100%", minHeight: "100%" }}>
              <iframe
                ref={iframeRef}
                src={iframeUrl}
                className="absolute top-0 left-0 w-full border-none"
                style={{ height: pageHeight > 0 ? pageHeight : "100%" }}
                sandbox="allow-same-origin allow-scripts"
                scrolling="no"
                loading="lazy"
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full z-20 pointer-events-none"
                style={{
                  mixBlendMode: heatmapType === "scroll" ? undefined : "multiply",
                  height: pageHeight > 0 ? pageHeight : "100%",
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#f5f5f5] dark:bg-[#2a2a2a]">
              <p className="text-sm text-muted-foreground">No site URL configured. Add your site URL in project settings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
