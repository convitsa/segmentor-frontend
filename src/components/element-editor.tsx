"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useConfirm } from "@/components/confirm-dialog";
import type { ElementConfigDTO, VariantDTO, RuleDTO, Condition, AudienceDTO } from "@/lib/types/dto";
import { VariantForm } from "./variant-form";
import { RuleForm } from "./rule-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";

const FIELD_LABELS: Record<string, string> = {
  text: "Text Content",
  visible: "Visibility",
  href: "Link URL",
  className: "CSS Class",
  style: "Style",
  attribute: "Attribute",
};

const CONDITION_TYPE_LABELS: Record<string, string> = {
  always: "Always",
  utm: "Traffic Source",
  device: "Device",
  language: "Language",
  newReturning: "Visitor Type",
  url: "Page URL",
  referrer: "Referrer",
  geo: "Location",
  time: "Time",
};

const COMPARATOR_LABELS: Record<string, string> = {
  equals: "is",
  contains: "contains",
  startsWith: "starts with",
  endsWith: "ends with",
  greaterThan: "is after",
  lessThan: "is before",
  between: "is between",
};

function describeCondition(c: Condition): string {
  const typeName = CONDITION_TYPE_LABELS[c.type] || c.type;
  if (c.type === "always") return "Applies to all visitors";
  const comp = COMPARATOR_LABELS[c.comparator || "equals"] || c.comparator || "is";
  const val = c.value || "—";

  if (c.type === "utm") {
    const keyLabel: Record<string, string> = { source: "Source", medium: "Medium", campaign: "Campaign", term: "Term", content: "Content" };
    return `${typeName} ${keyLabel[c.key || ""] || c.key} ${comp} "${val}"`;
  }
  if (c.type === "geo") {
    const keyLabel: Record<string, string> = { country: "Country", countryCode: "Country Code", region: "Region", city: "City" };
    return `${keyLabel[c.key || ""] || "Location"} ${comp} "${val}"`;
  }
  if (c.type === "time") {
    const keyLabel: Record<string, string> = { hour: "Hour", dayOfWeek: "Day", timeRange: "Time" };
    const k = keyLabel[c.key || ""] || "Time";
    if (c.key === "timeRange") return `${k} is between ${val}`;
    return `${k} ${comp} ${val}`;
  }
  return `${typeName} ${comp} "${val}"`;
}

interface Props {
  element: ElementConfigDTO;
  audiences?: AudienceDTO[];
  onUpdate: () => void;
}

export function ElementEditor({ element, audiences = [], onUpdate }: Props) {
  const confirm = useConfirm();

  const [editingElement, setEditingElement] = useState(false);
  const [editLabel, setEditLabel] = useState(element.label);
  const [savingElement, setSavingElement] = useState(false);

  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<VariantDTO | null>(null);

  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleDTO | null>(null);

  function startEditElement() {
    setEditLabel(element.label);
    setEditingElement(true);
  }

  async function saveElement() {
    if (!editLabel.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setSavingElement(true);
    try {
      await api.patch(`/api/elements/${element.id}`, { label: editLabel.trim() });
      toast.success("Element renamed");
      setEditingElement(false);
      onUpdate();
    } catch {
      toast.error("Failed to update element");
    } finally {
      setSavingElement(false);
    }
  }

  function startEditVariant(v: VariantDTO) {
    setEditingVariant(v);
    setShowVariantForm(true);
  }

  async function deleteVariant(variantId: string) {
    const ok = await confirm({
      title: "Delete Variant",
      description: "This variant and all its changes will be permanently removed.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/variants/${variantId}`);
      toast.success("Variant deleted");
      onUpdate();
    } catch {
      toast.error("Failed to delete variant");
    }
  }

  function startEditRule(r: RuleDTO) {
    setEditingRule(r);
    setShowRuleForm(true);
  }

  async function toggleRuleEnabled(r: RuleDTO) {
    try {
      await api.patch(`/api/rules/${r.id}`, { enabled: !r.enabled });
      toast.success(r.enabled ? "Rule disabled" : "Rule enabled");
      onUpdate();
    } catch {
      toast.error("Failed to update rule");
    }
  }

  async function deleteRule(ruleId: string) {
    const ok = await confirm({
      title: "Delete Rule",
      description: "This rule and its conditions will be permanently removed.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/rules/${ruleId}`);
      toast.success("Rule deleted");
      onUpdate();
    } catch {
      toast.error("Failed to delete rule");
    }
  }

  return (
    <Card>
      <CardHeader>
        {editingElement ? (
          <div className="flex items-center gap-2">
            <Input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="Element name"
              className="h-8 text-sm font-semibold"
              onKeyDown={(e) => { if (e.key === "Enter") saveElement(); }}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={saveElement} disabled={savingElement}>
              <Check className="h-4 w-4 text-primary" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setEditingElement(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{element.label}</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={startEditElement}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="variants">
          <TabsList>
            <TabsTrigger value="variants">Variants ({element.variants.length})</TabsTrigger>
            <TabsTrigger value="rules">Rules ({element.rules.length})</TabsTrigger>
          </TabsList>

          {/* ─── VARIANTS TAB ─── */}
          <TabsContent value="variants" className="space-y-4 mt-4">
            {element.variants.map((v) => (
              <Card key={v.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{v.name}</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditVariant(v)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteVariant(v.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {v.mutations.map((m, i) => (
                      <div key={i} className="text-xs bg-muted px-2 py-1 rounded flex gap-2 items-center">
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {FIELD_LABELS[m.field] || m.field}
                        </Badge>
                        <span className="truncate text-muted-foreground">
                          {m.field === "visible"
                            ? m.value === "false" ? "Hidden" : "Visible"
                            : m.field === "attribute" && m.attributeName
                              ? `${m.attributeName} = "${m.value}"`
                              : m.value}
                        </span>
                      </div>
                    ))}
                    {v.mutations.length === 0 && (
                      <p className="text-xs text-muted-foreground">No changes defined</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {showVariantForm ? (
              <VariantForm
                elementId={element.id}
                variant={editingVariant ?? undefined}
                onDone={() => { setShowVariantForm(false); setEditingVariant(null); onUpdate(); }}
                onCancel={() => { setShowVariantForm(false); setEditingVariant(null); }}
              />
            ) : (
              <Button variant="outline" size="sm" onClick={() => { setEditingVariant(null); setShowVariantForm(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Variant
              </Button>
            )}
          </TabsContent>

          {/* ─── RULES TAB ─── */}
          <TabsContent value="rules" className="space-y-4 mt-4">
            {element.rules.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{r.description || "Untitled Rule"}</p>
                      <Badge
                        variant={r.enabled ? "default" : "secondary"}
                        className="cursor-pointer select-none"
                        onClick={() => toggleRuleEnabled(r)}
                      >
                        {r.enabled ? "Active" : "Disabled"}
                      </Badge>
                      {r.logic === "OR" && (
                        <Badge variant="outline">Any condition</Badge>
                      )}
                      {r.splits && r.splits.length > 0 && (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
                          A/B Test
                        </Badge>
                      )}
                      {(r.startDate || r.endDate) && (
                        <Badge variant="outline" className="text-[10px]">
                          {r.startDate && r.endDate
                            ? `${new Date(r.startDate).toLocaleDateString()} – ${new Date(r.endDate).toLocaleDateString()}`
                            : r.startDate
                              ? `From ${new Date(r.startDate).toLocaleDateString()}`
                              : `Until ${new Date(r.endDate!).toLocaleDateString()}`}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditRule(r)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRule(r.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {r.conditions.map((c, i) => (
                      <p key={i} className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {describeCondition(c)}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {r.splits && r.splits.length > 0 ? (
                      <>Splits: {r.splits.map(s => {
                        const vName = element.variants.find(v => v.id === s.variantId)?.name || "Unknown";
                        return `${vName} (${s.weight}%)`;
                      }).join(", ")}</>
                    ) : (
                      <>Shows variant:{" "}
                        <span className="font-medium text-foreground">
                          {element.variants.find((v) => v.id === r.variantId)?.name || "Unknown"}
                        </span>
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}

            {element.variants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add at least one variant before creating rules.</p>
            ) : showRuleForm ? (
              <RuleForm
                elementId={element.id}
                variants={element.variants}
                audiences={audiences}
                rule={editingRule ?? undefined}
                onDone={() => { setShowRuleForm(false); setEditingRule(null); onUpdate(); }}
                onCancel={() => { setShowRuleForm(false); setEditingRule(null); }}
              />
            ) : (
              <Button variant="outline" size="sm" onClick={() => { setEditingRule(null); setShowRuleForm(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
