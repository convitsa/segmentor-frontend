"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { VariantDTO } from "@/lib/types/dto";
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
import { Trash2, Plus } from "lucide-react";

const FIELDS = ["text", "visible", "href", "src", "className", "style", "attribute"] as const;

const FIELD_LABELS: Record<string, string> = {
  text: "Text Content",
  visible: "Visibility",
  href: "Link URL",
  src: "Image/Source URL",
  className: "CSS Class",
  style: "Style",
  attribute: "Custom Attribute",
};

const mutationSchema = z.object({
  field: z.enum(FIELDS),
  value: z.string().min(1, "Value is required"),
  attributeName: z.string().optional(),
});

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  mutations: z.array(mutationSchema).min(1, "At least one mutation required"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  elementId: string;
  variant?: VariantDTO;
  onDone: () => void;
  onCancel: () => void;
}

export function VariantForm({ elementId, variant, onDone, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!variant;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: variant
      ? {
          name: variant.name,
          mutations: variant.mutations.map((m) => ({
            field: m.field,
            value: m.value,
            attributeName: m.attributeName || "",
          })),
        }
      : {
          name: "",
          mutations: [{ field: "text", value: "", attributeName: "" }],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "mutations",
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const mutations = data.mutations.map((m) => ({
        field: m.field,
        value: m.value,
        ...(m.field === "attribute" && m.attributeName
          ? { attributeName: m.attributeName }
          : {}),
      }));

      if (isEditing) {
        await api.patch(`/api/variants/${variant.id}`, {
          name: data.name,
          mutations,
        });
        toast.success("Variant updated!");
      } else {
        await api.post(`/api/elements/${elementId}/variants`, {
          name: data.name,
          mutations,
        });
        toast.success("Variant created!");
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
        <CardTitle className="text-sm">{isEditing ? "Edit Variant" : "New Variant"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variant Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. LinkedIn visitors" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <p className="text-sm font-medium">Changes</p>
              {fields.map((f, idx) => (
                <div key={f.id} className="flex gap-2 items-end">
                  <FormField
                    control={form.control}
                    name={`mutations.${idx}.field`}
                    render={({ field }) => (
                      <FormItem className="w-36">
                        <FormLabel className="sr-only">Field</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FIELDS.map((f) => (
                              <SelectItem key={f} value={f}>
                                {FIELD_LABELS[f] || f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  {form.watch(`mutations.${idx}.field`) === "attribute" && (
                    <FormField
                      control={form.control}
                      name={`mutations.${idx}.attributeName`}
                      render={({ field }) => (
                        <FormItem className="w-32">
                          <FormLabel className="sr-only">Attr Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Attribute name" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name={`mutations.${idx}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="sr-only">Value</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={form.watch(`mutations.${idx}.field`) === "text" ? "e.g. Hello {{geo.city}}!" : "Value"}
                            {...field}
                          />
                        </FormControl>
                        {form.watch(`mutations.${idx}.field`) === "text" && (
                          <p className="text-[10px] text-muted-foreground">
                            Use {"{{"}geo.city{"}}"},  {"{{"}utm.source{"}}"} etc. for dynamic content
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ field: "text", value: "", attributeName: "" })
                }
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Change
              </Button>
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>
                {loading
                  ? isEditing ? "Saving…" : "Creating…"
                  : isEditing ? "Save Changes" : "Create Variant"}
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
