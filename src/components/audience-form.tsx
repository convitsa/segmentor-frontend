"use client";

import { useState } from "react";
import { nanoid } from "@/lib/nanoid";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { AudienceDTO, Condition } from "@/lib/types/dto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { getOptionsForCondition } from "@/lib/condition-options";
import { ConditionValueSelect } from "@/components/condition-value-select";

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

const COMPARATORS = [
  { value: "equals", label: "is" },
  { value: "contains", label: "contains" },
  { value: "startsWith", label: "starts with" },
  { value: "endsWith", label: "ends with" },
];

interface Props {
  projectId: string;
  audience?: AudienceDTO;
  onDone: () => void;
  onCancel: () => void;
}

interface ConditionDraft {
  id: string;
  type: string;
  key?: string;
  comparator?: string;
  value?: string;
}

export function AudienceForm({ projectId, audience, onDone, onCancel }: Props) {
  const isEditing = !!audience;
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(audience?.name || "");
  const [logic, setLogic] = useState<"AND" | "OR">(audience?.logic || "AND");
  const [conditions, setConditions] = useState<ConditionDraft[]>(
    audience?.conditions.map(c => ({ ...c })) || [{ id: nanoid(), type: "utm", key: "source", comparator: "equals", value: "" }]
  );

  function updateCondition(id: string, upd: Partial<ConditionDraft>) {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, ...upd } : c));
  }

  async function handleSubmit() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        conditions: conditions.map(c => ({
          id: c.id,
          type: c.type,
          key: c.key,
          comparator: c.comparator,
          value: c.value,
        })),
        logic,
      };
      if (isEditing) {
        await api.patch(`/api/audiences/${audience.id}`, payload);
        toast.success("Audience updated!");
      } else {
        await api.post(`/api/projects/${projectId}/audiences`, payload);
        toast.success("Audience created!");
      }
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{isEditing ? "Edit Audience" : "New Audience"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm">Audience Name</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. US Mobile Users"
            className="mt-1"
          />
        </div>

        {conditions.length > 1 && (
          <Select value={logic} onValueChange={v => setLogic(v as "AND" | "OR")}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">All conditions match</SelectItem>
              <SelectItem value="OR">Any condition matches</SelectItem>
            </SelectContent>
          </Select>
        )}

        <div className="space-y-2">
          {conditions.map(cond => {
            const isAlways = cond.type === "always";
            const showKey = cond.type === "utm" || cond.type === "geo" || cond.type === "time";
            return (
              <div key={cond.id} className="flex gap-1.5 items-center bg-muted/50 rounded-lg p-2">
                <Select
                  value={cond.type}
                  onValueChange={val => {
                    const upd: Partial<ConditionDraft> = { type: val };
                    if (val === "geo") upd.key = "country";
                    else if (val === "utm") upd.key = "source";
                    else if (val === "time") upd.key = "hour";
                    else upd.key = undefined;
                    if (val !== "always") upd.comparator = "equals";
                    updateCondition(cond.id, upd);
                  }}
                >
                  <SelectTrigger className="h-7 w-[110px] text-xs shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>

                {showKey && (
                  <Select
                    value={cond.key || "source"}
                    onValueChange={val => updateCondition(cond.id, { key: val })}
                  >
                    <SelectTrigger className="h-7 w-[100px] text-xs shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {cond.type === "utm"
                        ? ["Source", "Medium", "Campaign", "Term", "Content"].map(k => (
                            <SelectItem key={k.toLowerCase()} value={k.toLowerCase()}>{k}</SelectItem>
                          ))
                        : cond.type === "geo"
                          ? [{ v: "country", l: "Country" }, { v: "countryCode", l: "Code" }, { v: "region", l: "Region" }, { v: "city", l: "City" }].map(k => (
                              <SelectItem key={k.v} value={k.v}>{k.l}</SelectItem>
                            ))
                          : [{ v: "hour", l: "Hour" }, { v: "dayOfWeek", l: "Day" }, { v: "timeRange", l: "Time Range" }].map(k => (
                              <SelectItem key={k.v} value={k.v}>{k.l}</SelectItem>
                            ))
                      }
                    </SelectContent>
                  </Select>
                )}

                {!isAlways && (
                  <Select
                    value={cond.comparator || "equals"}
                    onValueChange={val => updateCondition(cond.id, { comparator: val })}
                  >
                    <SelectTrigger className="h-7 w-[90px] text-xs shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMPARATORS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}

                {!isAlways && (() => {
                  const selectOptions = getOptionsForCondition(cond.type, cond.key);
                  if (selectOptions) {
                    return (
                      <ConditionValueSelect
                        options={selectOptions}
                        value={cond.value || ""}
                        onChange={(val) => updateCondition(cond.id, { value: val })}
                        placeholder="Select..."
                        className="flex-1 min-w-[80px]"
                        compact
                      />
                    );
                  }
                  return (
                    <Input
                      value={cond.value || ""}
                      onChange={e => updateCondition(cond.id, { value: e.target.value })}
                      placeholder="value"
                      className="h-7 text-xs flex-1 min-w-[80px]"
                    />
                  );
                })()}

                {isAlways && <span className="text-xs text-muted-foreground flex-1">All visitors</span>}

                <Button
                  type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                  onClick={() => setConditions(prev => prev.filter(c => c.id !== cond.id))}
                  disabled={conditions.length <= 1}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
          <Button
            type="button" variant="outline" size="sm" className="h-7 text-xs"
            onClick={() => setConditions(prev => [...prev, { id: nanoid(), type: "utm", key: "source", comparator: "equals", value: "" }])}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Condition
          </Button>
        </div>

        <div className="flex gap-2">
          <Button size="sm" disabled={loading} onClick={handleSubmit}>
            {loading ? "Saving…" : isEditing ? "Save Changes" : "Create Audience"}
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
