"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { useConfirm } from "@/components/confirm-dialog";
import type { ProjectDTO, ElementConfigDTO, VariantMutation, AudienceDTO } from "@/lib/types/dto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  MousePointerClick,
  Crosshair,
  Save,
  Type,
  Eye,
  LinkIcon,
  Palette,
  Image,
  X,
  Plus,
  Trash2,
  Filter,
  Pencil,
  AlertTriangle,
  Upload,
  RefreshCcw,
  Hand,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { getOptionsForCondition } from "@/lib/condition-options";
import { ConditionValueSelect } from "@/components/condition-value-select";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ComputedStyle {
  color: string;
  backgroundColor: string;
  fontSize: string;
  fontWeight: string;
  fontFamily: string;
  lineHeight: string;
  letterSpacing: string;
  textAlign: string;
  textDecoration: string;
  padding: string;
  margin: string;
  borderRadius: string;
  display: string;
  opacity: string;
}

interface PickEvent {
  type: "SEGMENTOR_PICK";
  selector: string;
  tag: string;
  text: string;
  href: string;
  src: string;
  alt: string;
  computedStyle: ComputedStyle;
  rect: { top: number; left: number; width: number; height: number };
}

interface MutationDraft {
  field: string;
  value: string;
  key?: string;
}

interface ConditionDraft {
  id: string;
  type: string;
  key?: string;
  comparator?: string;
  value?: string;
}

const CONDITION_TYPES = [
  { value: "always", label: "Always" },
  { value: "utm", label: "Traffic Source" },
  { value: "device", label: "Device" },
  { value: "language", label: "Language" },
  { value: "newReturning", label: "Visitor Type" },
  { value: "url", label: "Page URL" },
  { value: "referrer", label: "Referrer" },
  { value: "geo", label: "Location" },
  { value: "time", label: "Time" },
];

const STRING_COMPARATORS = [
  { value: "equals", label: "is" },
  { value: "contains", label: "contains" },
  { value: "startsWith", label: "starts with" },
  { value: "endsWith", label: "ends with" },
];

const TIME_COMPARATORS = [
  { value: "equals", label: "is" },
  { value: "greaterThan", label: "is after" },
  { value: "lessThan", label: "is before" },
  { value: "between", label: "is between" },
];

const CHANGE_LABELS: Record<string, string> = {
  text: "Text Content",
  visible: "Visibility",
  href: "Link URL",
  className: "CSS Class",
  style: "Style",
  attribute: "Attribute",
  color: "Text Color",
  backgroundColor: "Background",
  fontSize: "Font Size",
  fontWeight: "Font Weight",
  opacity: "Opacity",
  borderRadius: "Border Radius",
};

let _cid = 0;
function condId() { return "__c" + (++_cid); }

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const confirm = useConfirm();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDTO | null>(null);
  const [elements, setElements] = useState<ElementConfigDTO[]>([]);
  const [audiences, setAudiences] = useState<AudienceDTO[]>([]);
  const [pickData, setPickData] = useState<PickEvent | null>(null);
  const [pickMode, setPickMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [variantName, setVariantName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [conditions, setConditions] = useState<ConditionDraft[]>([
    { id: condId(), type: "always" },
  ]);
  const [ruleLogic, setRuleLogic] = useState<"AND" | "OR">("AND");
  const [rulePriority, setRulePriority] = useState(0);
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleStartDate, setRuleStartDate] = useState("");
  const [ruleEndDate, setRuleEndDate] = useState("");
  const [useAudience, setUseAudience] = useState(false);
  const [selectedAudienceId, setSelectedAudienceId] = useState("");
  const [selectedElement, setSelectedElement] = useState<ElementConfigDTO | null>(null);
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const [iframeError, setIframeError] = useState(false);
  const [inspectMode, setInspectMode] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<{ selector: string; display: string; breadcrumb: string[] } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadIdRef = useRef(0);
  const iframeReadyRef = useRef(false);
  const programmaticSelectRef = useRef<{ element: ElementConfigDTO; variantIdx: number } | null>(null);
  const pendingIframeApplyRef = useRef<{ el: ElementConfigDTO; variantIndex: number; loadId: number } | null>(null);

  const [mutations, setMutations] = useState<MutationDraft[]>([]);

  const [editText, setEditText] = useState("");
  const [editHref, setEditHref] = useState("");
  const [editVisible, setEditVisible] = useState(true);
  const [editColor, setEditColor] = useState("");
  const [editBgColor, setEditBgColor] = useState("");
  const [editFontSize, setEditFontSize] = useState("");
  const [editFontWeight, setEditFontWeight] = useState("");
  const [editOpacity, setEditOpacity] = useState("");
  const [editBorderRadius, setEditBorderRadius] = useState("");
  const [editSrc, setEditSrc] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutationsRef = useRef(mutations);
  mutationsRef.current = mutations;

  const iframeSrc = project ? `${API_URL}/public/proxy?projectKey=${project.publicKey}` : "";

  // --- Data loading ---

  const loadProject = useCallback(async () => {
    try {
      const p = await api.get<ProjectDTO>(`/api/projects/${projectId}`);
      setProject(p);
    } catch {
      toast.error("Failed to load project");
      router.push("/dashboard/projects");
    }
  }, [projectId, router]);

  const loadElements = useCallback(async () => {
    try {
      const els = await api.get<ElementConfigDTO[]>(`/api/projects/${projectId}/elements`);
      setElements(els);
      setSelectedElement(prev => {
        if (!prev) return null;
        const refreshed = els.find(e => e.id === prev.id);
        if (!refreshed) {
          setActiveVariantIdx(0);
          setEditingVariantId(null);
          setEditingRuleId(null);
          return null;
        }
        setActiveVariantIdx(idx => Math.min(idx, Math.max(0, refreshed.variants.length - 1)));
        return refreshed;
      });
    } catch {
      toast.error("Failed to load elements");
    }
  }, [projectId]);

  const loadAudiences = useCallback(async () => {
    try {
      const list = await api.get<AudienceDTO[]>(`/api/projects/${projectId}/audiences`);
      setAudiences(list);
    } catch {
      toast.error("Failed to load audiences");
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
    loadElements();
    loadAudiences();
  }, [loadProject, loadElements, loadAudiences]);

  // --- Unsaved changes protection ---

  async function confirmDiscardIfNeeded(): Promise<boolean> {
    if (mutationsRef.current.length === 0) return true;
    return confirm({
      title: "Unsaved changes",
      description: "You have unsaved changes that will be lost. Continue?",
      confirmLabel: "Discard",
      cancelLabel: "Cancel",
      destructive: true,
    });
  }

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (mutationsRef.current.length > 0) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // --- Keyboard shortcuts ---

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (pickData) handleDeselect();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (pickData) openSaveDialog();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickData, mutations]);

  // --- Iframe messages ---

  const pickModeRef = useRef(pickMode);
  pickModeRef.current = pickMode;

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== "object") return;
      const data = event.data;

      if (data.type === "SEGMENTOR_READY") {
        iframeReadyRef.current = true;
        setIframeError(false);

        const pending = pendingIframeApplyRef.current;
        if (pending && pending.loadId === loadIdRef.current) {
          pendingIframeApplyRef.current = null;
          const win = iframeRef.current?.contentWindow;
          if (win) {
            win.postMessage({ type: "SEGMENTOR_SELECT", selector: pending.el.selector }, "*");
            const variant = pending.el.variants[pending.variantIndex];
            if (variant) {
              for (const m of variant.mutations) {
                const mut: Record<string, string> = { field: m.field, value: m.value };
                if (m.attributeName) mut.key = m.attributeName;
                win.postMessage({ type: "SEGMENTOR_APPLY", selector: pending.el.selector, mutation: mut }, "*");
              }
            }
          }
        }
      }

      if (data.type === "SEGMENTOR_PICK" && pickModeRef.current) {
        const prog = programmaticSelectRef.current;
        if (prog) programmaticSelectRef.current = null;

        setPickData(data as PickEvent);

        if (!prog) {
          setMutations([]);
          setEditingVariantId(null);
          setEditingRuleId(null);
          setConditions([{ id: condId(), type: "always" }]);
          setRuleLogic("AND");
          setUseAudience(false);
          setSelectedAudienceId("");
          setSelectedElement(null);
        }

        const cs = data.computedStyle || {};
        let text = data.text || "";
        let href = data.href || "";
        let visible = true;
        let color = rgbToHex(cs.color) || "#000000";
        let bgColor = rgbToHex(cs.backgroundColor) || "#ffffff";
        let fontSize = parseFloat(cs.fontSize) ? cs.fontSize : "16px";
        let fontWeight = cs.fontWeight || "400";
        let opacity = cs.opacity || "1";
        let borderRadius = parseFloat(cs.borderRadius) ? cs.borderRadius : "0px";
        let src = data.src || "";

        if (prog) {
          const variant = prog.element.variants[prog.variantIdx];
          if (variant) {
            const existingMutations: MutationDraft[] = variant.mutations.map(m => ({
              field: m.field,
              value: m.value,
              ...(m.attributeName ? { key: m.attributeName } : {}),
            }));
            setMutations(existingMutations);

            for (const m of variant.mutations) {
              if (m.field === "text") text = m.value;
              else if (m.field === "href") href = m.value;
              else if (m.field === "src") src = m.value;
              else if (m.field === "visible") visible = m.value !== "false";
              else if (m.field === "style") {
                try {
                  const s = JSON.parse(m.value);
                  if (s.color) color = s.color;
                  if (s.backgroundColor) bgColor = s.backgroundColor;
                  if (s.fontSize) fontSize = s.fontSize;
                  if (s.fontWeight) fontWeight = s.fontWeight;
                  if (s.opacity) opacity = s.opacity;
                  if (s.borderRadius) borderRadius = s.borderRadius;
                } catch {}
              }
            }
          }
        }

        setEditText(text);
        setEditHref(href);
        setEditVisible(visible);
        setEditColor(color);
        setEditBgColor(bgColor);
        setEditFontSize(fontSize);
        setEditFontWeight(fontWeight);
        setEditOpacity(opacity);
        setEditBorderRadius(borderRadius);
        setEditSrc(src);
      }

      if (data.type === "SEGMENTOR_HOVER") {
        setHoverInfo({
          selector: data.selector || "",
          display: data.display || "",
          breadcrumb: data.breadcrumb || [],
        });
      }

      if (data.type === "SEGMENTOR_REVERTED") {
        setMutations([]);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // --- Utilities ---

  function rgbToHex(rgb: string): string {
    if (!rgb || rgb === "transparent" || rgb.startsWith("#")) return rgb || "";
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return "";
    const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
    return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");
  }

  function sendMutation(mutation: MutationDraft) {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({
      type: "SEGMENTOR_APPLY",
      selector: pickData?.selector,
      mutation,
    }, "*");
    setMutations(prev => {
      if (mutation.field === "style") {
        try {
          const newKey = Object.keys(JSON.parse(mutation.value))[0];
          return [
            ...prev.filter(m => {
              if (m.field !== "style") return true;
              try { return Object.keys(JSON.parse(m.value))[0] !== newKey; }
              catch { return true; }
            }),
            mutation,
          ];
        } catch { /* fall through */ }
      }
      const filtered = prev.filter(m => m.field !== mutation.field);
      return [...filtered, mutation];
    });
  }

  function handleTextChange(value: string) {
    setEditText(value);
    sendMutation({ field: "text", value });
  }
  function handleHrefChange(value: string) {
    setEditHref(value);
    sendMutation({ field: "href", value });
  }
  function handleVisibilityChange(visible: boolean) {
    setEditVisible(visible);
    sendMutation({ field: "visible", value: visible ? "true" : "false" });
  }
  function handleStyleChange(prop: string, value: string) {
    if (prop === "color") setEditColor(value);
    else if (prop === "backgroundColor") setEditBgColor(value);
    else if (prop === "fontSize") setEditFontSize(value);
    else if (prop === "fontWeight") setEditFontWeight(value);
    else if (prop === "opacity") setEditOpacity(value);
    else if (prop === "borderRadius") setEditBorderRadius(value);
    sendMutation({ field: "style", value: JSON.stringify({ [prop]: value }) });
  }

  function handleSrcChange(value: string) {
    setEditSrc(value);
    sendMutation({ field: "src", value });
  }

  async function handleImageUpload(file: File) {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      toast.error("Invalid file type. Use JPEG, PNG, GIF, WebP, or SVG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB.");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = typeof window !== "undefined" ? localStorage.getItem("segmentor_token") : null;
      const res = await fetch(`${API_URL}/api/uploads/image`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json() as { url: string };
      handleSrcChange(data.url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  // --- Undo ---

  function handleUndo() {
    if (selectedElement && editingVariantId) {
      applyVariantToIframe(selectedElement, activeVariantIdx);
    } else {
      iframeRef.current?.contentWindow?.postMessage({ type: "SEGMENTOR_REVERT" }, "*");
      setMutations([]);
    }
  }

  // --- Inspect / interact mode ---

  function toggleInspectMode() {
    const next = !inspectMode;
    setInspectMode(next);
    iframeRef.current?.contentWindow?.postMessage(
      { type: "SEGMENTOR_SET_MODE", mode: next ? "inspect" : "interact" },
      "*"
    );
    if (!next) setHoverInfo(null);
  }

  function navigateAncestor(direction: "up" | "down") {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "SEGMENTOR_ANCESTOR", direction },
      "*"
    );
  }

  // --- Deselect ---

  async function handleDeselect() {
    if (!(await confirmDiscardIfNeeded())) return;
    if (iframeRef.current) iframeRef.current.src = iframeSrc;
    setPickData(null);
    setMutations([]);
    setSelectedElement(null);
    setActiveVariantIdx(0);
    setEditingVariantId(null);
    setEditingRuleId(null);
  }

  // --- Save dialog ---

  function openSaveDialog() {
    if (editingVariantId) {
      saveExistingVariant();
      return;
    }
    setVariantName("");
    setRulePriority(0);
    setRuleDescription("");
    setRuleStartDate("");
    setRuleEndDate("");
    setShowSaveDialog(true);
  }

  // --- Validation ---

  function validateBeforeSave(): string | null {
    const existingElement = elements.find(e => e.selector === pickData?.selector);
    if (existingElement && !editingVariantId) {
      const dup = existingElement.variants.find(v => v.name.toLowerCase() === variantName.trim().toLowerCase());
      if (dup) return `A variant named "${variantName.trim()}" already exists on this element.`;
    }
    for (const c of conditions) {
      if (c.type !== "always" && !c.value?.trim()) {
        return "All conditions must have a value. Remove empty conditions or set them to \"Always\".";
      }
    }
    if (ruleStartDate && ruleEndDate && new Date(ruleEndDate) <= new Date(ruleStartDate)) {
      return "End date must be after start date.";
    }
    if (useAudience && !selectedAudienceId) {
      return "Please select an audience or switch to custom conditions.";
    }
    return null;
  }

  // --- Conditions ---

  function updateCondition(id: string, update: Partial<ConditionDraft>) {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, ...update } : c));
  }
  function addCondition() {
    setConditions(prev => [...prev, { id: condId(), type: "utm", key: "source", comparator: "equals", value: "" }]);
  }
  function removeCondition(id: string) {
    setConditions(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev);
  }

  // --- Build mutations array for API ---

  function buildVariantMutations(): VariantMutation[] {
    return mutations.map(m => {
      if (m.field === "style") {
        try {
          const parsed = JSON.parse(m.value);
          const key = Object.keys(parsed)[0];
          return { field: "style" as const, value: JSON.stringify(parsed), attributeName: key };
        } catch { return { field: m.field as VariantMutation["field"], value: m.value }; }
      }
      return { field: m.field as VariantMutation["field"], value: m.value };
    });
  }

  function buildConditions() {
    return conditions.map(c => ({ id: c.id, type: c.type, key: c.key, comparator: c.comparator, value: c.value }));
  }

  // --- CREATE: Save new variant + rule ---

  async function saveNewVariant() {
    if (!pickData || !variantName.trim()) return;
    const err = validateBeforeSave();
    if (err) { toast.error(err); return; }

    setSaving(true);
    try {
      let element = elements.find(e => e.selector === pickData.selector);
      if (!element) {
        element = await api.post<ElementConfigDTO>(`/api/projects/${projectId}/elements`, {
          label: pickData.text?.substring(0, 50) || pickData.tag,
          selector: pickData.selector,
        });
      }

      const variant = await api.post<{ id: string }>(`/api/elements/${element.id}/variants`, {
        name: variantName.trim(),
        mutations: buildVariantMutations(),
      });

      await api.post(`/api/elements/${element.id}/rules`, {
        description: ruleDescription || variantName.trim(),
        conditions: buildConditions(),
        logic: ruleLogic,
        variantId: variant.id,
        priority: rulePriority,
        enabled: true,
        startDate: ruleStartDate ? new Date(ruleStartDate).toISOString() : null,
        endDate: ruleEndDate ? new Date(ruleEndDate).toISOString() : null,
        audienceId: useAudience && selectedAudienceId ? selectedAudienceId : null,
      });

      posthog.capture("element_saved", { project_id: projectId, is_new: true });
      toast.success("Variant & rule saved!");
      setShowSaveDialog(false);
      setMutations([]);
      await loadElements();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  // --- UPDATE: Save edits to existing variant + rule ---

  async function saveExistingVariant() {
    if (!editingVariantId) return;
    setSaving(true);
    try {
      await api.patch(`/api/variants/${editingVariantId}`, {
        mutations: buildVariantMutations(),
      });

      if (editingRuleId) {
        await api.patch(`/api/rules/${editingRuleId}`, {
          conditions: buildConditions(),
          logic: ruleLogic,
          audienceId: useAudience && selectedAudienceId ? selectedAudienceId : null,
        });
      }

      posthog.capture("element_saved", { project_id: projectId, is_new: false });
      toast.success("Changes saved!");
      setMutations([]);
      await loadElements();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  // --- UPDATE: Rename element label ---

  async function saveElementLabel(elId: string) {
    if (!editingLabelValue.trim()) {
      setEditingLabel(null);
      return;
    }
    try {
      await api.patch(`/api/elements/${elId}`, { label: editingLabelValue.trim() });
      await loadElements();
      toast.success("Element renamed");
    } catch {
      toast.error("Failed to rename element");
    }
    setEditingLabel(null);
  }

  // --- UPDATE: Rename variant ---

  async function renameVariant(variantId: string, newName: string) {
    if (!newName.trim()) return;
    try {
      await api.patch(`/api/variants/${variantId}`, { name: newName.trim() });
      await loadElements();
      toast.success("Variant renamed");
    } catch {
      toast.error("Failed to rename variant");
    }
  }

  // --- DELETE: Delete variant ---

  async function deleteVariant(variantId: string, variantName: string) {
    const yes = await confirm({
      title: "Delete variant",
      description: `Delete "${variantName}"? Its associated rules will also be removed.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!yes) return;

    setDeleting(true);
    try {
      await api.delete(`/api/variants/${variantId}`);
      toast.success("Variant deleted");
      setEditingVariantId(null);
      setEditingRuleId(null);
      setMutations([]);
      await loadElements();
    } catch {
      toast.error("Failed to delete variant");
    } finally {
      setDeleting(false);
    }
  }

  // --- DELETE: Delete element ---

  async function deleteElement(elId: string, label: string) {
    const yes = await confirm({
      title: "Delete element",
      description: `Delete "${label}" and all its variants and rules? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!yes) return;

    setDeleting(true);
    try {
      await api.delete(`/api/elements/${elId}`);
      toast.success("Element deleted");
      if (selectedElement?.id === elId) {
        setSelectedElement(null);
        setPickData(null);
        setMutations([]);
        setEditingVariantId(null);
        setEditingRuleId(null);
        if (iframeRef.current) iframeRef.current.src = iframeSrc;
      }
      await loadElements();
    } catch {
      toast.error("Failed to delete element");
    } finally {
      setDeleting(false);
    }
  }

  // --- Iframe: apply variant ---

  function applyVariantToIframe(el: ElementConfigDTO, variantIndex: number) {
    if (!iframeRef.current) return;
    const thisLoadId = ++loadIdRef.current;

    iframeReadyRef.current = false;
    pendingIframeApplyRef.current = { el, variantIndex, loadId: thisLoadId };
    iframeRef.current.src = iframeSrc;
    setMutations([]);
    setIframeError(false);
  }

  async function selectExistingElement(el: ElementConfigDTO, variantIndex = 0) {
    if (!(await confirmDiscardIfNeeded())) return;

    setSelectedElement(el);
    setActiveVariantIdx(variantIndex);

    const variant = el.variants[variantIndex];
    if (variant) {
      setEditingVariantId(variant.id);
      const rule = el.rules.find(r => r.variantId === variant.id);
      if (rule) {
        setEditingRuleId(rule.id);
        setConditions(rule.conditions.map(c => ({ id: c.id || condId(), type: c.type, key: c.key, comparator: c.comparator, value: c.value })));
        setRuleLogic(rule.logic);
        if (rule.audienceId) {
          setUseAudience(true);
          setSelectedAudienceId(rule.audienceId);
        } else {
          setUseAudience(false);
          setSelectedAudienceId("");
        }
      } else {
        setEditingRuleId(null);
        setConditions([{ id: condId(), type: "always" }]);
        setRuleLogic("AND");
        setUseAudience(false);
        setSelectedAudienceId("");
      }
    } else {
      setEditingVariantId(null);
      setEditingRuleId(null);
      setConditions([{ id: condId(), type: "always" }]);
      setRuleLogic("AND");
      setUseAudience(false);
      setSelectedAudienceId("");
    }

    programmaticSelectRef.current = { element: el, variantIdx: variantIndex };
    applyVariantToIframe(el, variantIndex);
  }

  async function switchVariant(idx: number) {
    if (!selectedElement) return;
    if (!(await confirmDiscardIfNeeded())) return;
    setActiveVariantIdx(idx);

    const variant = selectedElement.variants[idx];
    if (variant) {
      setEditingVariantId(variant.id);
      const rule = selectedElement.rules.find(r => r.variantId === variant.id);
      if (rule) {
        setEditingRuleId(rule.id);
        setConditions(rule.conditions.map(c => ({ id: c.id || condId(), type: c.type, key: c.key, comparator: c.comparator, value: c.value })));
        setRuleLogic(rule.logic);
      } else {
        setEditingRuleId(null);
        setConditions([{ id: condId(), type: "always" }]);
        setRuleLogic("AND");
      }
    }

    programmaticSelectRef.current = { element: selectedElement, variantIdx: idx };
    applyVariantToIframe(selectedElement, idx);
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const hasLink = pickData && (pickData.tag === "a" || pickData.href);
  const hasImage = pickData && (pickData.tag === "img" || pickData.src);
  const isEditing = !!editingVariantId;
  const busy = saving || deleting;

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Toolbar */}
      <div className="h-12 border-b flex items-center justify-between px-4 bg-background z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/projects/${projectId}`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <span className="font-medium text-sm">{project.name}</span>
          <Badge variant={pickMode ? "default" : "secondary"} className="text-xs">
            <Crosshair className="mr-1 h-3 w-3" />
            {pickMode ? "Pick Mode" : "View Mode"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {pickData && (
            <>
              <Button size="sm" variant="outline" onClick={() => navigateAncestor("up")} title="Select parent element">
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigateAncestor("down")} title="Select child element">
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
            </>
          )}
          {pickData && (
            <Button size="sm" onClick={openSaveDialog} disabled={busy}>
              <Save className="mr-1 h-4 w-4" />
              {isEditing ? "Update" : mutations.length > 0 ? "Save Variant" : "Save Rule"}
            </Button>
          )}
          <Button
            variant={inspectMode ? "outline" : "secondary"}
            size="sm"
            onClick={toggleInspectMode}
            title={inspectMode ? "Switch to interact mode" : "Switch to inspect mode"}
          >
            {inspectMode ? <Hand className="mr-1 h-4 w-4" /> : <Crosshair className="mr-1 h-4 w-4" />}
            {inspectMode ? "Interact" : "Inspect"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPickMode(!pickMode)}>
            {pickMode ? "Disable Picker" : "Enable Picker"}
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: saved elements */}
        <div className="w-56 border-r bg-background overflow-y-auto p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Elements</p>
            <Badge variant="secondary" className="text-[10px]">{elements.length}</Badge>
          </div>
          {elements.length === 0 ? (
            <div className="text-center py-6">
              <MousePointerClick className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Pick elements in the preview to start personalizing</p>
            </div>
          ) : (
            elements.map((el) => {
              const isSelected = selectedElement?.id === el.id;
              const isLabelEditing = editingLabel === el.id;
              return (
                <Card
                  key={el.id}
                  className={`transition-colors ${isSelected ? "border-primary" : "hover:border-primary/50"}`}
                >
                  <CardContent className="p-2">
                    {/* Element label */}
                    <div className="flex items-center gap-1 group">
                      {isLabelEditing ? (
                        <form
                          className="flex items-center gap-1 flex-1"
                          onSubmit={(e) => { e.preventDefault(); saveElementLabel(el.id); }}
                        >
                          <Input
                            value={editingLabelValue}
                            onChange={(e) => setEditingLabelValue(e.target.value)}
                            className="h-5 text-xs px-1 flex-1"
                            autoFocus
                            onBlur={() => saveElementLabel(el.id)}
                            onKeyDown={(e) => { if (e.key === "Escape") setEditingLabel(null); }}
                          />
                        </form>
                      ) : (
                        <>
                          <p
                            className="font-medium text-xs truncate flex-1 cursor-pointer"
                            onClick={() => selectExistingElement(el, 0)}
                          >
                            {el.label}
                          </p>
                          <button
                            className="h-4 w-4 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity shrink-0"
                            onClick={(e) => { e.stopPropagation(); setEditingLabel(el.id); setEditingLabelValue(el.label); }}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            className="h-4 w-4 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                            onClick={(e) => { e.stopPropagation(); deleteElement(el.id, el.label); }}
                            disabled={busy}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Variants */}
                    {el.variants.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {el.variants.map((v, idx) => (
                          <div key={v.id} className="flex items-center group/v">
                            <button
                              className={`text-[9px] px-1.5 py-0.5 rounded-l transition-colors ${isSelected && activeVariantIdx === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                              onClick={(e) => { e.stopPropagation(); selectExistingElement(el, idx); }}
                            >
                              {v.name}
                            </button>
                            <button
                              className={`text-[9px] px-0.5 py-0.5 rounded-r opacity-0 group-hover/v:opacity-100 transition-opacity ${isSelected && activeVariantIdx === idx ? "bg-primary/80 text-primary-foreground hover:bg-destructive" : "bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"}`}
                              onClick={(e) => { e.stopPropagation(); deleteVariant(v.id, v.name); }}
                              disabled={busy}
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-muted-foreground mt-1">No variants yet</p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Center: iframe */}
        <div className="flex-1 bg-muted relative flex flex-col">
          {/* Hover info bar */}
          {inspectMode && hoverInfo && !pickData && (
            <div className="h-7 px-3 flex items-center gap-2 bg-background border-b text-xs text-muted-foreground shrink-0 overflow-hidden">
              <Crosshair className="h-3 w-3 shrink-0 text-primary" />
              <span className="font-mono truncate">{hoverInfo.display}</span>
              {hoverInfo.breadcrumb.length > 0 && (
                <span className="text-muted-foreground/50 truncate ml-auto">
                  {hoverInfo.breadcrumb.slice(-4).join(" › ")}
                </span>
              )}
            </div>
          )}
          <div className="flex-1 relative">
          {iframeError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted z-10">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Failed to load site preview</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setIframeError(false); if (iframeRef.current) iframeRef.current.src = iframeSrc; }}>
                Retry
              </Button>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            className="w-full h-full border-0"
            allow="clipboard-write"
            onError={() => setIframeError(true)}
          />
          </div>
        </div>

        {/* Right sidebar: property panel */}
        {pickData && (
          <div className="w-80 border-l bg-background flex flex-col">
            {/* Panel header */}
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="min-w-0 flex items-center gap-2">
                <p className="text-sm font-medium truncate">
                  {pickData.text?.substring(0, 40) || pickData.tag.toUpperCase()}
                </p>
                {isEditing && (
                  <Badge variant="outline" className="text-[10px] shrink-0">Editing</Badge>
                )}
                {mutations.length > 0 && (
                  <Badge className="text-[10px] bg-primary shrink-0">
                    {mutations.length} change{mutations.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleDeselect}>
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Variant switcher */}
            {selectedElement && selectedElement.variants.length > 0 && (
              <div className="px-3 py-2 border-b flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10px] text-muted-foreground shrink-0">Variant:</span>
                {selectedElement.variants.map((v, idx) => (
                  <button
                    key={v.id}
                    className={`text-[10px] px-2 py-1 rounded-md transition-colors whitespace-nowrap ${activeVariantIdx === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    onClick={() => switchVariant(idx)}
                    disabled={busy}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            )}

            {/* Properties */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                {/* Text Content */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Type className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-xs font-semibold">Text Content</Label>
                  </div>
                  <textarea
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px] resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={editText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Element text…"
                  />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Variables: {"{"}{"{"}<span className="font-medium">geo.city</span>{"}"}{"}"}
                    {" "}{"{"}{"{"}<span className="font-medium">geo.country</span>{"}"}{"}"}
                    {" "}{"{"}{"{"}<span className="font-medium">utm.source</span>{"}"}{"}"}
                    {" "}{"{"}{"{"}<span className="font-medium">device</span>{"}"}{"}"}
                    {" "}{"{"}{"{"}<span className="font-medium">language</span>{"}"}{"}"}
                  </p>
                </div>

                <Separator />

                {/* Visibility */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-xs font-semibold">Visibility</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editVisible} onCheckedChange={handleVisibilityChange} />
                    <span className="text-xs text-muted-foreground">{editVisible ? "Visible" : "Hidden"}</span>
                  </div>
                </div>

                {hasLink && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <Label className="text-xs font-semibold">Link URL</Label>
                      </div>
                      <Input value={editHref} onChange={(e) => handleHrefChange(e.target.value)} placeholder="https://…" className="text-xs h-8" />
                    </div>
                  </>
                )}

                {hasImage && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Image className="h-3.5 w-3.5 text-muted-foreground" />
                        <Label className="text-xs font-semibold">Image</Label>
                      </div>

                      {/* Preview */}
                      <div className="relative group rounded-lg border bg-muted/30 overflow-hidden">
                        {editSrc ? (
                          <img
                            src={editSrc}
                            alt="Preview"
                            className="w-full h-32 object-contain bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjBmMGYwIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4=')]"
                          />
                        ) : (
                          <div className="w-full h-32 flex flex-col items-center justify-center text-muted-foreground">
                            <Image className="size-8 mb-1 opacity-30" />
                            <span className="text-[10px]">No image</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 text-[10px]"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                          >
                            {uploadingImage ? (
                              <RefreshCcw className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Upload className="mr-1 h-3 w-3" />
                            )}
                            {uploadingImage ? "Uploading…" : "Upload"}
                          </Button>
                        </div>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                          e.target.value = "";
                        }}
                      />

                      {/* URL input */}
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Image URL</Label>
                        <Input
                          value={editSrc}
                          onChange={(e) => handleSrcChange(e.target.value)}
                          placeholder="https://…/image.png"
                          className="text-xs h-8 font-mono"
                        />
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Style */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-xs font-semibold">Style</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Color</Label>
                      <div className="flex gap-1">
                        <input type="color" value={editColor} onChange={(e) => handleStyleChange("color", e.target.value)} className="h-8 w-8 rounded border cursor-pointer shrink-0" />
                        <Input value={editColor} onChange={(e) => handleStyleChange("color", e.target.value)} className="text-[10px] h-8 font-mono" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Background</Label>
                      <div className="flex gap-1">
                        <input type="color" value={editBgColor} onChange={(e) => handleStyleChange("backgroundColor", e.target.value)} className="h-8 w-8 rounded border cursor-pointer shrink-0" />
                        <Input value={editBgColor} onChange={(e) => handleStyleChange("backgroundColor", e.target.value)} className="text-[10px] h-8 font-mono" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Font Size</Label>
                      <Input value={editFontSize} onChange={(e) => handleStyleChange("fontSize", e.target.value)} placeholder="16px" className="text-xs h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Font Weight</Label>
                      <select value={editFontWeight} onChange={(e) => handleStyleChange("fontWeight", e.target.value)} className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs h-8">
                        <option value="100">Thin (100)</option>
                        <option value="200">Extra Light (200)</option>
                        <option value="300">Light (300)</option>
                        <option value="400">Normal (400)</option>
                        <option value="500">Medium (500)</option>
                        <option value="600">Semi Bold (600)</option>
                        <option value="700">Bold (700)</option>
                        <option value="800">Extra Bold (800)</option>
                        <option value="900">Black (900)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Opacity</Label>
                      <Input type="range" min="0" max="1" step="0.05" value={editOpacity} onChange={(e) => handleStyleChange("opacity", e.target.value)} className="h-8" />
                      <p className="text-[10px] text-center text-muted-foreground">{editOpacity}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Border Radius</Label>
                      <Input value={editBorderRadius} onChange={(e) => handleStyleChange("borderRadius", e.target.value)} placeholder="8px" className="text-xs h-8" />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Conditions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label className="text-xs font-semibold">Show when</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {conditions.length > 1 && (
                        <Select value={ruleLogic} onValueChange={(v) => setRuleLogic(v as "AND" | "OR")}>
                          <SelectTrigger className="h-6 w-[70px] text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">All match</SelectItem>
                            <SelectItem value="OR">Any match</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={addCondition}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {conditions.map((cond) => {
                      const isAlways = cond.type === "always";
                      const showKey = cond.type === "utm" || cond.type === "geo" || cond.type === "time";
                      const isTime = cond.type === "time";
                      const isTimeRange = isTime && cond.key === "timeRange";
                      const isDayOfWeek = isTime && cond.key === "dayOfWeek";
                      const activeComps = isTime && !isDayOfWeek ? TIME_COMPARATORS : STRING_COMPARATORS;
                      const hideComparator = isAlways || isTimeRange;
                      const selectOptions = !isAlways ? getOptionsForCondition(cond.type, cond.key) : null;
                      return (
                        <div key={cond.id} className="space-y-1.5 rounded-lg bg-muted/50 p-2">
                          <div className="flex items-center gap-1">
                            <Select
                              value={cond.type}
                              onValueChange={(val) => {
                                const update: Partial<ConditionDraft> = { type: val, value: "" };
                                if (val === "geo") { update.key = "country"; update.comparator = "equals"; }
                                else if (val === "utm") { update.key = "source"; update.comparator = "equals"; }
                                else if (val === "time") { update.key = "hour"; update.comparator = "between"; }
                                else update.key = undefined;
                                if (val === "always") { update.comparator = undefined; update.value = undefined; }
                                else if (!update.comparator && !cond.comparator) update.comparator = "equals";
                                updateCondition(cond.id, update);
                              }}
                            >
                              <SelectTrigger className="h-6 text-[10px] flex-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {CONDITION_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                              </SelectContent>
                            </Select>
                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => removeCondition(cond.id)} disabled={conditions.length <= 1}>
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>

                          {showKey && (
                            <Select
                              value={cond.key || (cond.type === "utm" ? "source" : cond.type === "time" ? "hour" : "country")}
                              onValueChange={(val) => {
                                const upd: Partial<ConditionDraft> = { key: val, value: "" };
                                if (val === "timeRange") upd.comparator = "between";
                                else if (val === "dayOfWeek") upd.comparator = "equals";
                                updateCondition(cond.id, upd);
                              }}
                            >
                              <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {cond.type === "utm"
                                  ? [{ v: "source", l: "Source" }, { v: "medium", l: "Medium" }, { v: "campaign", l: "Campaign" }, { v: "term", l: "Term" }, { v: "content", l: "Content" }].map(k => (<SelectItem key={k.v} value={k.v}>{k.l}</SelectItem>))
                                  : cond.type === "time"
                                    ? [{ v: "hour", l: "Hour (0-23)" }, { v: "dayOfWeek", l: "Day of Week" }, { v: "timeRange", l: "Time Range" }].map(k => (<SelectItem key={k.v} value={k.v}>{k.l}</SelectItem>))
                                    : [{ v: "country", l: "Country" }, { v: "countryCode", l: "Code" }, { v: "region", l: "Region" }, { v: "city", l: "City" }].map(k => (<SelectItem key={k.v} value={k.v}>{k.l}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          )}

                          {!isAlways && (
                            <div className="flex gap-1">
                              {!hideComparator && (
                                <Select value={cond.comparator || "equals"} onValueChange={(val) => updateCondition(cond.id, { comparator: val })}>
                                  <SelectTrigger className="h-6 w-[80px] text-[10px] shrink-0"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {activeComps.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                                  </SelectContent>
                                </Select>
                              )}
                              {selectOptions ? (
                                <ConditionValueSelect options={selectOptions} value={cond.value || ""} onChange={(val) => updateCondition(cond.id, { value: val })} placeholder="Select..." className="flex-1 min-w-0" compact />
                              ) : (
                                <Input
                                  value={cond.value || ""}
                                  onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                                  placeholder={isTimeRange ? "09:00-17:00" : isTime && cond.key === "hour" ? "e.g. 8 or 6-12" : cond.type === "geo" ? (cond.key === "city" ? "e.g. Baku" : "e.g. California") : "value"}
                                  className="h-6 text-[10px] flex-1 min-w-0"
                                />
                              )}
                            </div>
                          )}

                          {isAlways && <p className="text-[10px] text-muted-foreground">All visitors will see this</p>}
                        </div>
                      );
                    })}
                  </div>

                  {audiences.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Switch checked={useAudience} onCheckedChange={setUseAudience} className="scale-[0.7] origin-left" />
                        <span className="text-[10px] text-muted-foreground">Use saved audience instead</span>
                      </div>
                      {useAudience && (
                        <Select value={selectedAudienceId} onValueChange={setSelectedAudienceId}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Pick an audience" /></SelectTrigger>
                          <SelectContent>
                            {audiences.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Pending changes */}
                {mutations.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Pending Changes</Label>
                    {mutations.map((m, i) => (
                      <div key={i} className="flex items-center justify-between bg-muted rounded px-2 py-1">
                        <span className="text-[10px] font-mono">{CHANGE_LABELS[m.field] || m.field}</span>
                        <span className="text-[10px] text-muted-foreground truncate ml-2 max-w-[140px]">
                          {m.value.length > 30 ? m.value.substring(0, 30) + "…" : m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1" onClick={openSaveDialog} disabled={busy}>
                    <Save className="mr-1 h-3 w-3" />
                    {isEditing ? "Update" : mutations.length > 0 ? "Save Variant" : "Save Rule"}
                  </Button>
                  {mutations.length > 0 && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleUndo}
                        disabled={busy}
                        title="Revert changes"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Placeholder when nothing selected */}
        {!pickData && (
          <div className="w-80 border-l bg-background flex items-center justify-center p-6">
            <div className="text-center">
              <MousePointerClick className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Click an element to start editing</p>
              <p className="text-xs text-muted-foreground mt-1">Select any element in the preview to see its properties</p>
              <p className="text-[10px] text-muted-foreground mt-3">
                <kbd className="px-1 py-0.5 rounded bg-muted text-[9px]">Esc</kbd> to deselect &middot;
                <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] ml-1">⌘S</kbd> to save
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Save dialog — only for NEW variants */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{mutations.length > 0 ? "Save Variant" : "Save Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Name</Label>
              <Input
                placeholder="e.g. LinkedIn Visitors, German Users"
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                className="mt-1"
                autoFocus
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              {mutations.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Changes:</span>
                  <div className="flex flex-wrap gap-1">
                    {mutations.map((m, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{CHANGE_LABELS[m.field] || m.field}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Conditions:</span>
                <span className="text-xs">
                  {conditions.length === 1 && conditions[0].type === "always"
                    ? "All visitors"
                    : `${conditions.length} condition${conditions.length > 1 ? "s" : ""} (${ruleLogic})`}
                </span>
              </div>
              {mutations.length === 0 && (
                <p className="text-[10px] text-muted-foreground">No visual changes — this will only control when this element is shown.</p>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Description (optional)</Label>
                <Input value={ruleDescription} onChange={(e) => setRuleDescription(e.target.value)} placeholder="e.g. Show for LinkedIn visitors" className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Input type="number" value={rulePriority} onChange={(e) => setRulePriority(parseInt(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Active from (optional)</Label>
                <Input type="datetime-local" value={ruleStartDate} onChange={(e) => setRuleStartDate(e.target.value)} className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Active until (optional)</Label>
                <Input type="datetime-local" value={ruleEndDate} onChange={(e) => setRuleEndDate(e.target.value)} className="mt-1 h-8 text-xs" />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={saveNewVariant} disabled={!variantName.trim() || saving} className="flex-1">
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
