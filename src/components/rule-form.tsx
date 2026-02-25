"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { nanoid } from "@/lib/nanoid";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { VariantDTO, RuleDTO, AudienceDTO } from "@/lib/types/dto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";
import { getOptionsForCondition } from "@/lib/condition-options";
import { ConditionValueSelect } from "@/components/condition-value-select";

const CONDITION_TYPES = [
  "always",
  "utm",
  "device",
  "language",
  "newReturning",
  "url",
  "referrer",
  "geo",
  "time",
] as const;

const CONDITION_LABELS: Record<string, string> = {
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

const COMPARATORS = ["equals", "contains", "startsWith", "endsWith", "greaterThan", "lessThan", "between"] as const;

const COMPARATOR_LABELS: Record<string, string> = {
  equals: "is",
  contains: "contains",
  startsWith: "starts with",
  endsWith: "ends with",
  greaterThan: "is after",
  lessThan: "is before",
  between: "is between",
};

const TIME_COMPARATORS = ["equals", "greaterThan", "lessThan", "between"] as const;
const STRING_COMPARATORS = ["equals", "contains", "startsWith", "endsWith"] as const;

const conditionSchema = z.object({
  id: z.string(),
  type: z.enum(CONDITION_TYPES),
  key: z.string().optional(),
  comparator: z.enum(COMPARATORS).optional(),
  value: z.string().optional(),
});

const schema = z.object({
  description: z.string().optional(),
  conditions: z.array(conditionSchema).min(1, "At least one condition required"),
  logic: z.enum(["AND", "OR"]),
  variantId: z.string().min(1, "Select a variant"),
  priority: z.coerce.number().int(),
  enabled: z.boolean(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  elementId: string;
  variants: VariantDTO[];
  audiences?: AudienceDTO[];
  rule?: RuleDTO;
  onDone: () => void;
  onCancel: () => void;
}

export function RuleForm({ elementId, variants, audiences = [], rule, onDone, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!rule;
  const [useAudience, setUseAudience] = useState(!!rule?.audienceId);
  const [selectedAudienceId, setSelectedAudienceId] = useState(rule?.audienceId || "");
  const [isABTest, setIsABTest] = useState(!!rule?.splits?.length);
  const [splits, setSplits] = useState<{ variantId: string; weight: number }[]>(
    rule?.splits?.length ? rule.splits : []
  );

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: rule
      ? {
          description: rule.description || "",
          startDate: rule.startDate ? rule.startDate.slice(0, 16) : "",
          endDate: rule.endDate ? rule.endDate.slice(0, 16) : "",
          conditions: rule.conditions.map((c) => ({
            id: c.id || nanoid(),
            type: c.type,
            key: c.key,
            comparator: c.comparator,
            value: c.value,
          })),
          logic: rule.logic,
          variantId: rule.variantId,
          priority: rule.priority,
          enabled: rule.enabled,
        }
      : {
          description: "",
          startDate: "",
          endDate: "",
          conditions: [
            { id: nanoid(), type: "utm", key: "source", comparator: "equals", value: "" },
          ],
          logic: "AND",
          variantId: variants[0]?.id ?? "",
          priority: 0,
          enabled: true,
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const payload = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        audienceId: useAudience && selectedAudienceId ? selectedAudienceId : null,
        splits: isABTest && splits.length >= 2 ? splits : null,
      };
      if (isEditing) {
        await api.patch(`/api/rules/${rule.id}`, payload);
        toast.success("Rule updated!");
      } else {
        await api.post(`/api/elements/${elementId}/rules`, payload);
        toast.success("Rule created!");
      }
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Failed to ${isEditing ? "update" : "create"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{isEditing ? "Edit Rule" : "New Rule"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. LinkedIn visitors from US"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex items-center gap-3 mb-2">
              <Button
                type="button" variant={!isABTest ? "default" : "outline"} size="sm"
                onClick={() => setIsABTest(false)}
              >
                Single Variant
              </Button>
              <Button
                type="button" variant={isABTest ? "default" : "outline"} size="sm"
                onClick={() => {
                  setIsABTest(true);
                  if (splits.length < 2) {
                    setSplits(variants.slice(0, 2).map((v, i) => ({ variantId: v.id, weight: i === 0 ? 50 : 50 })));
                  }
                }}
                disabled={variants.length < 2}
              >
                A/B Test
              </Button>
            </div>

            {isABTest ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Traffic Split</p>
                {splits.map((s, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select
                      value={s.variantId}
                      onValueChange={val => {
                        const next = [...splits];
                        next[idx] = { ...next[idx], variantId: val };
                        setSplits(next);
                      }}
                    >
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {variants.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" min={0} max={100}
                      value={s.weight}
                      onChange={e => {
                        const next = [...splits];
                        next[idx] = { ...next[idx], weight: parseInt(e.target.value) || 0 };
                        setSplits(next);
                      }}
                      className="w-20"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                    {splits.length > 2 && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setSplits(splits.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => setSplits([...splits, { variantId: variants[0]?.id || "", weight: 0 }])}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Split
                  </Button>
                  <span className={`text-xs ${splits.reduce((s, x) => s + x.weight, 0) === 100 ? "text-primary" : "text-destructive"}`}>
                    Total: {splits.reduce((s, x) => s + x.weight, 0)}%
                  </span>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="variantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Variant</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select variant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {variants.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Match mode</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AND">All conditions match</SelectItem>
                        <SelectItem value="OR">Any condition matches</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 pt-7">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Enabled</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Active from (optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Active until (optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {audiences.length > 0 && (
              <div className="flex items-center gap-3">
                <Button
                  type="button" variant={useAudience ? "default" : "outline"} size="sm"
                  onClick={() => setUseAudience(true)}
                >
                  Saved Audience
                </Button>
                <Button
                  type="button" variant={!useAudience ? "default" : "outline"} size="sm"
                  onClick={() => setUseAudience(false)}
                >
                  Custom Conditions
                </Button>
              </div>
            )}

            {useAudience && audiences.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Audience</p>
                <Select value={selectedAudienceId} onValueChange={setSelectedAudienceId}>
                  <SelectTrigger><SelectValue placeholder="Select an audience" /></SelectTrigger>
                  <SelectContent>
                    {audiences.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium">Conditions</p>
              {fields.map((f, idx) => {
                const condType = form.watch(`conditions.${idx}.type`);
                const condKey = form.watch(`conditions.${idx}.key`);
                const isAlways = condType === "always";
                const showUtmKey = condType === "utm";
                const showGeoKey = condType === "geo";
                const isTime = condType === "time";
                const isTimeRange = isTime && condKey === "timeRange";
                const isDayOfWeek = isTime && condKey === "dayOfWeek";
                const activeComparators = isTime && !isDayOfWeek
                  ? TIME_COMPARATORS
                  : STRING_COMPARATORS;
                return (
                  <div key={f.id} className="flex gap-2 items-end">
                    <FormField
                      control={form.control}
                      name={`conditions.${idx}.type`}
                      render={({ field }) => (
                        <FormItem className="w-36">
                          <FormLabel className="sr-only">Type</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(val) => {
                              field.onChange(val);
                              if (val === "geo") {
                                form.setValue(`conditions.${idx}.key`, "country");
                                form.setValue(`conditions.${idx}.comparator`, "equals");
                              } else if (val === "utm") {
                                form.setValue(`conditions.${idx}.key`, "source");
                                form.setValue(`conditions.${idx}.comparator`, "equals");
                              } else if (val === "time") {
                                form.setValue(`conditions.${idx}.key`, "hour");
                                form.setValue(`conditions.${idx}.comparator`, "between");
                              } else {
                                form.setValue(`conditions.${idx}.key`, undefined);
                                form.setValue(`conditions.${idx}.comparator`, "equals");
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CONDITION_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {CONDITION_LABELS[t] || t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    {showUtmKey && (
                      <FormField
                        control={form.control}
                        name={`conditions.${idx}.key`}
                        render={({ field }) => (
                          <FormItem className="w-28">
                            <FormLabel className="sr-only">Key</FormLabel>
                            <Select
                              value={field.value || "source"}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {[
                                  { v: "source", l: "Source" },
                                  { v: "medium", l: "Medium" },
                                  { v: "campaign", l: "Campaign" },
                                  { v: "term", l: "Term" },
                                  { v: "content", l: "Content" },
                                ].map(
                                  (k) => (
                                    <SelectItem key={k.v} value={k.v}>
                                      {k.l}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    )}
                    {showGeoKey && (
                      <FormField
                        control={form.control}
                        name={`conditions.${idx}.key`}
                        render={({ field }) => (
                          <FormItem className="w-32">
                            <FormLabel className="sr-only">Geo Field</FormLabel>
                            <Select
                              value={field.value || "country"}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="country">Country</SelectItem>
                                <SelectItem value="countryCode">Country Code</SelectItem>
                                <SelectItem value="region">Region</SelectItem>
                                <SelectItem value="city">City</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    )}
                    {isTime && (
                      <FormField
                        control={form.control}
                        name={`conditions.${idx}.key`}
                        render={({ field }) => (
                          <FormItem className="w-32">
                            <FormLabel className="sr-only">Time Field</FormLabel>
                            <Select
                              value={field.value || "hour"}
                              onValueChange={(val) => {
                                field.onChange(val);
                                if (val === "timeRange") form.setValue(`conditions.${idx}.comparator`, "between");
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="hour">Hour (0-23)</SelectItem>
                                <SelectItem value="dayOfWeek">Day of Week</SelectItem>
                                <SelectItem value="timeRange">Time Range</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    )}
                    {!isAlways && !isTimeRange && (
                      <FormField
                        control={form.control}
                        name={`conditions.${idx}.comparator`}
                        render={({ field }) => (
                          <FormItem className="w-32">
                            <FormLabel className="sr-only">Comparator</FormLabel>
                            <Select
                              value={field.value || "equals"}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {activeComparators.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {COMPARATOR_LABELS[c] || c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    )}
                    {!isAlways && (() => {
                      const selectOptions = getOptionsForCondition(condType, condKey);
                      if (selectOptions) {
                        return (
                          <FormField
                            control={form.control}
                            name={`conditions.${idx}.value`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel className="sr-only">Value</FormLabel>
                                <FormControl>
                                  <ConditionValueSelect
                                    options={selectOptions}
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    placeholder="Select value..."
                                    className="w-full"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        );
                      }
                      return (
                        <FormField
                          control={form.control}
                          name={`conditions.${idx}.value`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="sr-only">Value</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={
                                    isTimeRange
                                      ? "e.g. 09:00-17:00"
                                      : isTime && condKey === "hour"
                                        ? "e.g. 8 or 6-12"
                                        : condType === "geo"
                                          ? condKey === "city"
                                            ? "e.g. Baku, Berlin"
                                            : "e.g. California, Bavaria"
                                          : "Value"
                                  }
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      );
                    })()}
                    {isAlways && (
                      <p className="flex-1 text-sm text-muted-foreground self-center">
                        Applies to all visitors
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(idx)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    id: nanoid(),
                    type: "utm",
                    key: "source",
                    comparator: "equals",
                    value: "",
                  })
                }
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Condition
              </Button>
            </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>
                {loading
                  ? isEditing ? "Saving…" : "Creating…"
                  : isEditing ? "Save Changes" : "Create Rule"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
