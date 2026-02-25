"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Check,
  Loader2,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Globe,
  Pencil,
  Users,
  Target,
  Clock,
  Layers,
  MousePointerClick,
  Star,
} from "lucide-react";

interface PlanDTO {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
}

const FAQ_ITEMS = [
  {
    q: "Can I cancel anytime?",
    a: "Yes, absolutely. You can cancel your subscription at any time from the billing portal. You'll keep access to all features until the end of your current billing period.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, and many local payment methods — all processed securely through Stripe.",
  },
  {
    q: "Is there a free trial?",
    a: "We don't offer a free trial, but we have a 14-day money-back guarantee. If Segmentor isn't right for you, just reach out and we'll refund you — no questions asked.",
  },
  {
    q: "Can I switch between monthly and yearly?",
    a: "Absolutely. You can change your billing cycle anytime from the billing portal. We'll automatically prorate the difference so you never overpay.",
  },
  {
    q: "Do I need to write any code?",
    a: "Nope! Segmentor is fully no-code. Just paste a small script tag into your site, then use the visual editor to create personalizations. Works with Framer, Webflow, WordPress, and any HTML site.",
  },
  {
    q: "Will the script slow down my website?",
    a: "Not at all. The Segmentor runtime is less than 5KB gzipped and loads asynchronously. It won't block your page from rendering.",
  },
];

const FEATURES_DETAILED = [
  { icon: Pencil, title: "Visual Editor", desc: "Point-and-click to personalize any element on your site" },
  { icon: Users, title: "Audience Targeting", desc: "Target by device, location, UTM, language, and more" },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Real-time insights into impressions, visitors, and conversions" },
  { icon: Globe, title: "Geo Personalization", desc: "Show different content based on country, region, or city" },
  { icon: Clock, title: "Time-based Rules", desc: "Schedule personalizations for specific hours or days" },
  { icon: Target, title: "UTM Targeting", desc: "Personalize for visitors from specific campaigns or sources" },
  { icon: Layers, title: "Unlimited Projects", desc: "Manage as many websites as you need, all in one place" },
  { icon: MousePointerClick, title: "No-Code Setup", desc: "Copy one script tag — works with any website builder" },
];

const TESTIMONIALS = [
  { name: "Alex R.", role: "Indie Maker", quote: "Segmentor paid for itself in the first week. Conversion on my landing page jumped 30%." },
  { name: "Maria S.", role: "Solopreneur", quote: "I replaced three tools with Segmentor. The visual editor is genuinely magical." },
  { name: "James K.", role: "Freelance Dev", quote: "Setup took 5 minutes. My clients love seeing personalized experiences on their sites." },
];

function BillingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearly, setYearly] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("checkout") === "canceled") {
      toast.error("Checkout was canceled");
    }
  }, [searchParams]);

  useEffect(() => {
    api.get<PlanDTO[]>("/api/billing/plans")
      .then(setPlans)
      .catch(() => toast.error("Failed to load plans"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCheckout(planId: string) {
    if (!user) { router.push("/auth/signin"); return; }
    posthog.capture("checkout_started", { plan_id: planId, interval: yearly ? "year" : "month" });
    setCheckingOut(planId);
    try {
      const data = await api.post<{ url: string }>("/api/billing/checkout", {
        planId, interval: yearly ? "year" : "month",
      });
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setCheckingOut(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const plan = plans[0];
  const savingsPercent = plan
    ? Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <button onClick={() => router.push("/")} className="flex items-center gap-2">
            <img src="/logo.svg" alt="Segmentor" className="h-7" />
          </button>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
                <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/projects")}>
                  Dashboard
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => router.push("/auth/signin")}>
                  Log in
                </Button>
                <Button size="sm" onClick={() => router.push("/auth/signin")}>
                  Sign up
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden pt-20 sm:pt-28 pb-4">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/[0.04] blur-3xl" />
          </div>
          <div className="relative max-w-3xl mx-auto text-center px-6">
            <Badge className="mb-5 bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 px-3 py-1 text-xs font-medium">
              No-Code Personalization for Solopreneurs
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              Simple pricing,{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                powerful results
              </span>
            </h1>
            <p className="text-muted-foreground mt-4 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed">
              One plan with everything you need. No hidden fees, no usage limits, no surprises.
            </p>
          </div>
        </section>

        {/* ─── Pricing Card ─── */}
        {plan && (
          <section className="max-w-lg mx-auto px-6 pt-10 pb-20">
            {/* Toggle */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <span className={`text-sm font-medium ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>
                Monthly
              </span>
              <Switch checked={yearly} onCheckedChange={setYearly} />
              <span className={`text-sm font-medium ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
                Yearly
              </span>
              {savingsPercent > 0 && (
                <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/10">
                  Save {savingsPercent}%
                </Badge>
              )}
            </div>

            <Card className="relative overflow-hidden border-2 border-primary/20 shadow-2xl shadow-primary/5">
              {/* Top accent */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/50" />

              <CardContent className="pt-10 pb-10 px-8">
                {/* Plan header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 mb-4">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                      <Zap className="size-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">{plan.name}</h2>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline justify-center gap-1 mt-2">
                    <span className="text-2xl font-semibold text-muted-foreground">$</span>
                    <span className="text-7xl font-extrabold tracking-tight tabular-nums">
                      {yearly
                        ? (plan.yearlyPrice / 100).toFixed(0)
                        : (plan.monthlyPrice / 100).toFixed(0)}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    {yearly ? (
                      <>
                        per year{" "}
                        <span className="text-xs">
                          (${(plan.yearlyPrice / 100 / 12).toFixed(2)}/mo)
                        </span>
                      </>
                    ) : (
                      "per month"
                    )}
                  </p>
                </div>

                {/* CTA */}
                <Button
                  className="w-full h-12 text-base font-semibold rounded-xl"
                  size="lg"
                  onClick={() => handleCheckout(plan.id)}
                  disabled={!!checkingOut}
                >
                  {checkingOut === plan.id ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Redirecting to checkout...
                    </>
                  ) : (
                    <>
                      Get started now
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground mt-3">
                  14-day money-back guarantee &middot; Cancel anytime
                </p>

                {/* Features */}
                <div className="mt-8 pt-8 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Everything included
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-2.5">
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Check className="size-3 text-primary" />
                        </div>
                        <span className="text-sm">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ─── Feature Grid ─── */}
        <section className="border-t bg-muted/20">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">
                Everything you need to personalize
              </h2>
              <p className="text-muted-foreground mt-2 text-lg">
                All features are included in every plan. No add-ons, no upsells.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES_DETAILED.map((f) => (
                <Card key={f.title} className="border-0 bg-background shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 pb-5 px-5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                      <f.icon className="size-5" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Testimonials ─── */}
        <section className="border-t">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">
                Loved by solopreneurs
              </h2>
              <p className="text-muted-foreground mt-2">
                See what people are saying about Segmentor.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t) => (
                <Card key={t.name} className="border bg-background">
                  <CardContent className="pt-6 pb-5 px-5">
                    <div className="flex gap-0.5 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed mb-4">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Comparison ─── */}
        <section className="border-t bg-muted/20">
          <div className="max-w-2xl mx-auto px-6 py-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight">
                Replace your entire stack
              </h2>
              <p className="text-muted-foreground mt-2">
                Stop paying for multiple tools. Segmentor does it all.
              </p>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {[
                    { feature: "Visual editor", segmentor: true, others: "Optimizely, $300+/mo" },
                    { feature: "Audience targeting", segmentor: true, others: "Google Optimize (sunset)" },
                    { feature: "Geo personalization", segmentor: true, others: "Custom code needed" },
                    { feature: "Analytics dashboard", segmentor: true, others: "Mixpanel, $25+/mo" },
                    { feature: "UTM targeting", segmentor: true, others: "Mutiny, $1000+/mo" },
                    { feature: "No-code setup", segmentor: true, others: "Varies" },
                  ].map((row) => (
                    <div key={row.feature} className="flex items-center px-5 py-3.5">
                      <span className="text-sm flex-1 font-medium">{row.feature}</span>
                      <div className="flex items-center gap-8">
                        <div className="w-24 text-center">
                          <div className="inline-flex size-5 items-center justify-center rounded-full bg-green-500/15">
                            <Check className="size-3 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        <div className="w-36 text-right">
                          <span className="text-xs text-muted-foreground">{row.others}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center px-5 py-2 bg-muted/30 text-[10px] text-muted-foreground font-medium">
                  <span className="flex-1" />
                  <span className="w-24 text-center">Segmentor</span>
                  <span className="w-36 text-right">Alternatives</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="border-t">
          <div className="max-w-2xl mx-auto px-6 py-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight">
                Frequently asked questions
              </h2>
              <p className="text-muted-foreground mt-2">
                Got questions? We&apos;ve got answers.
              </p>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-sm font-medium text-left">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ─── Bottom CTA ─── */}
        <section className="border-t bg-muted/20">
          <div className="max-w-3xl mx-auto px-6 py-20 text-center">
            <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5">
              <Zap className="size-7" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Ready to personalize your site?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg max-w-md mx-auto">
              Join solopreneurs using Segmentor to boost conversions with targeted content.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                className="h-12 px-8 text-base font-semibold rounded-xl"
                onClick={() => { if (plan) handleCheckout(plan.id); }}
                disabled={!!checkingOut || !plan}
              >
                {checkingOut ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 size-4" />
                )}
                Get started for ${plan ? (yearly ? (plan.yearlyPrice / 100).toFixed(0) : (plan.monthlyPrice / 100).toFixed(0)) : "…"}/{yearly ? "yr" : "mo"}
              </Button>
              <p className="text-xs text-muted-foreground">
                No credit card required to sign up &middot; 14-day money-back guarantee
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Segmentor" className="h-5 opacity-50" />
            <span>&copy; {new Date().getFullYear()} Segmentor</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="size-3" />
            <span>Payments secured by Stripe</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingPageInner />
    </Suspense>
  );
}
