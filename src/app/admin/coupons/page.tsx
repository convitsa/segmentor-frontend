"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, XCircle } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  active: boolean;
  couponId: string;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  duration: string | null;
  timesRedeemed: number;
  maxRedemptions: number | null;
  created: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [percentOff, setPercentOff] = useState(10);
  const [amountOff, setAmountOff] = useState(500);
  const [duration, setDuration] = useState("once");
  const [durationInMonths, setDurationInMonths] = useState(3);
  const [maxRedemptions, setMaxRedemptions] = useState<string>("");

  function loadCoupons() {
    setLoading(true);
    api
      .get<{ coupons: Coupon[] }>("/api/admin/coupons")
      .then((res) => setCoupons(res.coupons))
      .catch(() => toast.error("Failed to load coupons"))
      .finally(() => setLoading(false));
  }

  useEffect(loadCoupons, []);

  async function handleCreate() {
    if (!code.trim()) {
      toast.error("Code is required");
      return;
    }
    setCreating(true);
    try {
      await api.post("/api/admin/coupons", {
        code: code.trim(),
        ...(discountType === "percent" ? { percentOff } : { amountOff }),
        duration,
        ...(duration === "repeating" ? { durationInMonths } : {}),
        ...(maxRedemptions ? { maxRedemptions: parseInt(maxRedemptions) } : {}),
      });
      toast.success("Coupon created");
      setShowForm(false);
      setCode("");
      loadCoupons();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create coupon");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!window.confirm("Deactivate this coupon?")) return;
    try {
      await api.post(`/api/admin/coupons/${id}/deactivate`, {});
      toast.success("Coupon deactivated");
      loadCoupons();
    } catch {
      toast.error("Failed to deactivate");
    }
  }

  function formatDiscount(coupon: Coupon): string {
    if (coupon.percentOff) return `${coupon.percentOff}% off`;
    if (coupon.amountOff) return `$${(coupon.amountOff / 100).toFixed(2)} off`;
    return "—";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Coupons</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage Stripe promotion codes</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="size-4 mr-1.5" />
          New Coupon
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Code</label>
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. LAUNCH20" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Discount Type</label>
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage Off</SelectItem>
                    <SelectItem value="amount">Fixed Amount Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  {discountType === "percent" ? "Percent Off" : "Amount Off (cents)"}
                </label>
                <Input
                  type="number"
                  value={discountType === "percent" ? percentOff : amountOff}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 0;
                    discountType === "percent" ? setPercentOff(v) : setAmountOff(v);
                  }}
                  min={1}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Duration</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="repeating">Repeating</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {duration === "repeating" && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Duration (months)</label>
                  <Input type="number" value={durationInMonths} onChange={(e) => setDurationInMonths(parseInt(e.target.value) || 1)} min={1} />
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Max Redemptions</label>
                <Input value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="Unlimited" type="number" min={1} />
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Plus className="size-4 mr-1.5" />}
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">No coupons yet</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-[1fr_1fr_1fr_80px_100px_80px] gap-3 px-4 py-3 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span>Code</span>
                <span>Discount</span>
                <span>Duration</span>
                <span>Used</span>
                <span>Status</span>
                <span />
              </div>
              {coupons.map((coupon) => (
                <div key={coupon.id} className="grid grid-cols-[1fr_1fr_1fr_80px_100px_80px] gap-3 px-4 py-3 border-b last:border-0 items-center text-sm">
                  <span className="font-mono font-medium">{coupon.code}</span>
                  <span>{formatDiscount(coupon)}</span>
                  <span className="text-muted-foreground capitalize">{coupon.duration}</span>
                  <span>{coupon.timesRedeemed}{coupon.maxRedemptions ? `/${coupon.maxRedemptions}` : ""}</span>
                  <span>
                    <Badge variant={coupon.active ? "default" : "secondary"}>
                      {coupon.active ? "Active" : "Inactive"}
                    </Badge>
                  </span>
                  <span>
                    {coupon.active && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDeactivate(coupon.id)}>
                        <XCircle className="size-3.5" />
                      </Button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
