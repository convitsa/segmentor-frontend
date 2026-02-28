"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CreditCard,
  Calendar,
  ArrowUpRight,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  Shield,
  Receipt,
  Clock,
  Zap,
  RefreshCcw,
  ExternalLink,
  HelpCircle,
} from "lucide-react";

interface SubPlan {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
}

interface SubData {
  id: string;
  status: string;
  interval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: SubPlan | null;
}

interface SubResponse {
  subscription: SubData | null;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20" },
    trialing: { label: "Trial", className: "bg-primary/10 text-primary dark:text-primary border-primary/20" },
    past_due: { label: "Past Due", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20" },
    canceled: { label: "Canceled", className: "bg-muted text-muted-foreground border-border" },
  };
  const info = map[status] || { label: status, className: "" };
  return <Badge variant="outline" className={info.className}>{info.label}</Badge>;
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const BILLING_FAQ = [
  { q: "How do I update my payment method?", a: "Click \"Manage Billing\" to open the Stripe Customer Portal where you can update your card, switch payment methods, and more." },
  { q: "How do I cancel my subscription?", a: "You can cancel anytime from the Stripe Customer Portal. You'll keep access to all features until the end of your current billing period." },
  { q: "Can I switch between monthly and yearly?", a: "Yes! Open the billing portal and you can change your plan interval. We'll prorate the difference automatically." },
  { q: "Where can I find my invoices?", a: "All invoices are available in the Stripe Customer Portal. They're also emailed to you after each successful payment." },
];

export default function DashboardBillingPage() {
  const router = useRouter();
  const [sub, setSub] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    try {
      const data = await api.get<SubResponse>("/api/billing/subscription");
      setSub(data.subscription);
    } catch {
      toast.error("Failed to load subscription");
    } finally {
      setLoading(false);
    }
  }

  async function openPortal() {
    posthog.capture("billing_portal_opened");
    setPortalLoading(true);
    try {
      const data = await api.post<{ url: string }>("/api/billing/portal", {});
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5">
              <Zap className="size-7" />
            </div>
            <h3 className="text-xl font-bold">No active subscription</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
              Subscribe to Segmentor Pro to unlock the visual editor,
              audience targeting, analytics, and more.
            </p>
            <Button onClick={() => router.push("/billing")} className="mt-6 h-11 px-6 rounded-xl" size="lg">
              <Sparkles className="mr-2 size-4" />
              View Plans &amp; Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const price = sub.interval === "year" ? sub.plan?.yearlyPrice : sub.plan?.monthlyPrice;
  const displayPrice = price ? `$${(price / 100).toFixed(0)}` : "—";
  const daysLeft = daysUntil(sub.currentPeriodEnd);
  const totalDays = Math.ceil(
    (new Date(sub.currentPeriodEnd).getTime() - new Date(sub.currentPeriodStart).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const progressPercent = totalDays > 0 ? Math.round(((totalDays - daysLeft) / totalDays) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Cancellation banner */}
      {sub.cancelAtPeriodEnd && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Cancellation scheduled</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your subscription ends on {formatDate(sub.currentPeriodEnd)}. You&apos;ll keep access until then.
            </p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0" onClick={openPortal} disabled={portalLoading}>
            Reactivate
          </Button>
        </div>
      )}

      {/* ─── Main plan card ─── */}
      <Card className="overflow-hidden border-2 border-primary/15">
        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row">
            {/* Left: Plan info */}
            <div className="flex-1 p-6 lg:p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                    <Zap className="size-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{sub.plan?.name || "Pro"} Plan</h2>
                      <StatusBadge status={sub.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Billed {sub.interval}ly
                    </p>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-extrabold tracking-tight">{displayPrice}</span>
                <span className="text-lg text-muted-foreground">/{sub.interval === "year" ? "yr" : "mo"}</span>
              </div>

              {/* Billing period progress */}
              <div className="rounded-xl border bg-muted/20 p-4 space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="size-3.5" />
                    Current period
                  </div>
                  <Badge variant="secondary" className="text-xs tabular-nums">
                    {daysLeft.toLocaleString()} day{daysLeft !== 1 ? "s" : ""} left
                  </Badge>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                    style={{ width: `${Math.max(progressPercent, 2)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDate(sub.currentPeriodStart)}</span>
                  <span>{formatDate(sub.currentPeriodEnd)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={openPortal} disabled={portalLoading} className="rounded-xl">
                  {portalLoading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-2 size-4" />
                  )}
                  Manage Billing
                </Button>
                <Button variant="outline" onClick={openPortal} disabled={portalLoading} className="rounded-xl">
                  <CreditCard className="mr-2 size-4" />
                  Update Payment
                </Button>
                <Button variant="outline" onClick={openPortal} disabled={portalLoading} className="rounded-xl">
                  <Receipt className="mr-2 size-4" />
                  Invoices
                </Button>
              </div>
            </div>

            {/* Right: Quick stats */}
            <div className="border-t lg:border-t-0 lg:border-l bg-muted/10 p-6 lg:p-8 lg:w-72 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Overview</p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <Receipt className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="text-lg font-bold">{displayPrice}<span className="text-xs text-muted-foreground font-normal">/{sub.interval === "year" ? "yr" : "mo"}</span></p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-green-500/10">
                    <RefreshCcw className="size-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Billing cycle</p>
                    <p className="text-lg font-bold capitalize">{sub.interval}ly</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10">
                    <Calendar className="size-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {sub.cancelAtPeriodEnd ? "Expires" : "Renews"}
                    </p>
                    <p className="text-lg font-bold">{formatDate(sub.currentPeriodEnd).replace(`, ${new Date(sub.currentPeriodEnd).getFullYear()}`, "")}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <span>Secured by Stripe</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Features + FAQ row ─── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Features */}
        {sub.plan?.features && sub.plan.features.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">What&apos;s included</CardTitle>
                  <CardDescription className="text-xs">
                    Everything in your {sub.plan.name} plan
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {sub.plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3.5 py-2.5">
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-green-500/15">
                      <Check className="size-3 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm">{f}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* FAQ */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-muted">
                <HelpCircle className="size-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Billing FAQ</CardTitle>
                <CardDescription className="text-xs">
                  Common questions about billing
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {BILLING_FAQ.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-b-0">
                  <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-3">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
