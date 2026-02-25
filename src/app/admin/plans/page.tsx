"use client";

import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

type Plan = {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  yearlyPrice: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  features: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  async function fetchPlans() {
    try {
      const data = await api.get<Plan[]>("/api/admin/plans");
      setPlans(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPlans();
  }, []);

  async function handleSave(plan: Plan, edits: Partial<Plan>) {
    setSaving((s) => ({ ...s, [plan.id]: true }));
    try {
      await api.patch(`/api/admin/plans/${plan.id}`, {
        name: edits.name,
        monthlyPrice: edits.monthlyPrice,
        yearlyPrice: edits.yearlyPrice,
        features: edits.features,
        active: edits.active,
      });
      toast.success("Plan saved");
      await fetchPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save plan");
    } finally {
      setSaving((s) => ({ ...s, [plan.id]: false }));
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Plans</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSave={handleSave}
            saving={!!saving[plan.id]}
          />
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  onSave,
  saving,
}: {
  plan: Plan;
  onSave: (plan: Plan, edits: Partial<Plan>) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(plan.name);
  const [monthlyPrice, setMonthlyPrice] = useState(plan.monthlyPrice);
  const [yearlyPrice, setYearlyPrice] = useState(plan.yearlyPrice);
  const [features, setFeatures] = useState(plan.features.join("\n"));
  const [active, setActive] = useState(plan.active);

  useEffect(() => {
    setName(plan.name);
    setMonthlyPrice(plan.monthlyPrice);
    setYearlyPrice(plan.yearlyPrice);
    setFeatures(plan.features.join("\n"));
    setActive(plan.active);
  }, [plan]);

  function handleSave() {
    const featureList = features
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
    onSave(plan, {
      name,
      monthlyPrice,
      yearlyPrice,
      features: featureList,
      active,
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Plan name"
            />
          </div>
          <Badge variant={active ? "default" : "secondary"}>
            {active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Monthly price ({formatCents(monthlyPrice)})
          </label>
          <Input
            type="number"
            min={0}
            step={1}
            value={monthlyPrice}
            onChange={(e) => setMonthlyPrice(Number(e.target.value) || 0)}
            placeholder="Cents"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Yearly price ({formatCents(yearlyPrice)})
          </label>
          <Input
            type="number"
            min={0}
            step={1}
            value={yearlyPrice}
            onChange={(e) => setYearlyPrice(Number(e.target.value) || 0)}
            placeholder="Cents"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Features (one per line)</label>
          <Textarea
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder="Feature 1
Feature 2"
            rows={5}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Active</label>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
