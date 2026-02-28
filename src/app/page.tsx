"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight, Menu, X, Check, MousePointerClick, Globe, Clock,
  Users, Code, Eye, Smartphone, Tag, Heart, MessageSquare, Copy,
  DollarSign, Activity, FlaskConical, Paintbrush, BarChart3,
  Layers, Zap, Shield, CreditCard,
} from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
  : "";

const ACTION_CHIPS_ROW1 = ["Swap hero for returning visitors", "Show local currency", "Greet by city name", "Hide banner on mobile", "A/B test two headlines", "Redirect by country"];
const ACTION_CHIPS_ROW2 = ["Schedule weekend offer", "UTM-based landing copy", "Change CTA for Twitter traffic", "Time-sensitive countdown", "Language-based pricing", "Show social proof to new visitors"];

const TESTIMONIALS = [
  { name: "Ulvin Omarov", role: "Founder, Design Studio", handle: "@ulvinomarov", quote: "We replaced our analytics tool, A/B testing platform, and half-baked personalization plugin with one Segmentor script. The visual editor alone saved us 10+ hours a week — and conversions went up 30%.", date: "2:15 PM Jan 12, 2026", likes: 247 },
  { name: "Shaig Allahyarli", role: "Indie Hacker", handle: "@shaigallahyarli", quote: "Revenue attribution that actually works. I connected Polar.sh in two minutes, and now I can see exactly which visitor journey led to each purchase. Three tools consolidated into one dashboard.", date: "9:30 AM Feb 3, 2026", likes: 183 },
  { name: "Aslan Mammadli", role: "Co-founder at Enverson.ai", handle: "@aslanmammadli", quote: "The visitor timeline is incredible — every pageview, click, scroll depth, and conversion mapped to a single profile. Anonymous visitors get fun names like 'gentle fox' so we can track journeys before they even sign up.", date: "4:45 PM Jan 28, 2026", likes: 89 },
];

const FAQ_ITEMS = [
  { q: "What is Segmentor?", a: "Segmentor is an all-in-one platform for visitor analytics, content personalization, A/B testing, and revenue attribution. Install one script tag on any website to track every visitor's journey, personalize content with a visual editor, run split tests, and automatically link purchases back to the visitors who made them." },
  { q: "How does visitor tracking work?", a: "Segmentor's lightweight runtime script automatically captures pageviews, clicks, scroll depth, form submissions, and sessions. Each visitor gets a unique ID stored in a first-party cookie, giving you a full timeline of their journey across multiple sessions — even before they identify themselves." },
  { q: "Do I need to write any code?", a: "Not a single line. Paste one script tag into your site header, and everything works — visitor tracking, the visual editor for personalization, A/B testing with weighted splits, and revenue attribution via Polar.sh checkout link detection. For advanced use cases, you can optionally call segmentor.track() or segmentor.identify() from your own code." },
  { q: "How does the visual editor work?", a: "Open the editor from your dashboard, and your live site loads in an iframe. Click any element to select it, then change its text, visibility, link, image, or style. Set targeting conditions (geo, device, UTM, time, language, new vs returning) and Segmentor shows the right version to the right visitors — no deploy needed." },
  { q: "How does A/B testing work?", a: "When creating a personalization rule, toggle 'A/B Test' mode and add multiple variants with traffic weight percentages. Segmentor uses deterministic hashing so each visitor always sees the same variant. Results are tracked in the analytics dashboard with impression counts per variant." },
  { q: "How does revenue attribution work?", a: "Segmentor automatically detects Polar.sh checkout links on your site and appends a visitor reference ID. When a purchase happens, the Polar webhook links it back to the exact visitor who clicked — showing the full journey from first pageview to purchase in their profile. No manual tagging needed." },
  { q: "What websites does it work with?", a: "Any website that supports a script tag — Framer, Webflow, WordPress, Shopify, Next.js, Astro, plain HTML, and more. If you can add a script tag to the head, Segmentor works. It also handles single-page apps with automatic navigation detection." },
  { q: "What payment providers do you support?", a: "Polar.sh is fully supported today with automatic checkout link tagging and webhook-based attribution. Stripe, Gumroad, Lemon Squeezy, and Paddle integrations are coming soon." },
  { q: "Can I try it for free?", a: "Yes! Sign up and explore all features. When you're ready to go live, plans start at $9/month with a 14-day money-back guarantee. No credit card required to start." },
];

const FOOTER_LINKS = {
  Product: [{ label: "Features", href: "#features" }, { label: "Pricing", href: "#pricing" }, { label: "Documentation", href: "/docs" }],
  Company: [{ label: "About", href: "/about" }, { label: "Contact", href: "/contact" }],
  Legal: [{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }],
};

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

function AnimatedSection({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (<motion.section ref={ref} id={id} initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger} className={`w-full px-5 sm:px-6 lg:px-8 ${className}`}><div className="mx-auto max-w-[1080px]">{children}</div></motion.section>);
}

function Navbar() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const fn = () => setScrolled(window.scrollY > 10); window.addEventListener("scroll", fn, { passive: true }); return () => window.removeEventListener("scroll", fn); }, []);
  const navLinks = [{ label: "Features", href: "#features" }, { label: "How It Works", href: "#how-it-works" }, { label: "Pricing", href: "#pricing" }, { label: "FAQ", href: "#faq" }];
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/90 backdrop-blur-xl border-b border-border/40 shadow-sm shadow-black/[0.03]" : "bg-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-[1080px] items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 shrink-0"><img src="/logo.svg" alt="Segmentor" className="h-6" /></Link>
        <nav className="hidden md:flex items-center gap-1">{navLinks.map((l) => (<a key={l.href} href={l.href} className="px-3.5 py-2 text-[14px] text-muted-foreground hover:text-foreground transition-colors rounded-lg">{l.label}</a>))}</nav>
        <div className="hidden md:flex items-center gap-3">
          {user ? (<Button asChild size="sm" className="rounded-full h-9 px-5 text-[14px]"><a href={`${APP_URL}/dashboard/projects`}>Dashboard</a></Button>) : (<>
            <Button asChild variant="ghost" size="sm" className="rounded-full h-9 px-4 text-[14px]"><a href={`${APP_URL}/auth/signin`}>Log in</a></Button>
            <Button asChild size="sm" className="rounded-full h-9 px-5 text-[14px] bg-foreground text-background hover:bg-foreground/90"><a href={`${APP_URL}/auth/signup`}>Get started</a></Button></>)}
        </div>
        <button className="md:hidden p-2 -mr-2" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
      </div>
      <AnimatePresence>{mobileOpen && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="md:hidden overflow-hidden border-t border-border/40 bg-background/95 backdrop-blur-xl">
          <div className="flex flex-col gap-1 p-5">
            {navLinks.map((l) => (<a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-[15px] text-muted-foreground hover:text-foreground rounded-lg">{l.label}</a>))}
            <div className="flex gap-3 mt-4 pt-4 border-t border-border/40">
              {user ? (<Button asChild size="sm" className="flex-1 rounded-full"><a href={`${APP_URL}/dashboard/projects`}>Dashboard</a></Button>) : (<>
                <Button asChild variant="ghost" size="sm" className="flex-1 rounded-full"><a href={`${APP_URL}/auth/signin`}>Log in</a></Button>
                <Button asChild size="sm" className="flex-1 rounded-full bg-foreground text-background hover:bg-foreground/90"><a href={`${APP_URL}/auth/signup`}>Get started</a></Button></>)}
            </div>
          </div>
        </motion.div>
      )}</AnimatePresence>
    </header>
  );
}

function Hero() {
  return (
    <section className="w-full px-5 sm:px-6 lg:px-8 pt-32 pb-6 sm:pt-40 sm:pb-10">
      <div className="mx-auto max-w-[1080px]">
        <div className="flex flex-col items-center text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.5 }} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 bg-card text-sm font-medium text-muted-foreground shadow-sm">
              <Zap className="size-3.5 text-amber-500" /> Now with A/B testing &amp; audience segments
            </span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }} className="text-[36px] sm:text-[52px] lg:text-[64px] font-bold tracking-[-0.03em] leading-[1.08] max-w-4xl">
            Every visitor has a story. <span className="text-[#171717]">Now you can read it.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }} className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Visitor analytics, content personalization, A/B testing, and revenue attribution &mdash; all from one script tag. No code required.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }} className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="h-12 px-7 text-[15px] rounded-full font-semibold"><a href={`${APP_URL}/auth/signup`}>Start tracking for free <ArrowRight className="ml-2 size-4" /></a></Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-7 text-[15px] rounded-full"><a href="#how-it-works">See how it works</a></Button>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.7 }} className="mt-16 w-full max-w-4xl">
            <div className="rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/[0.06] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/15">
                <div className="flex gap-1.5"><div className="size-2.5 rounded-full bg-red-400/60" /><div className="size-2.5 rounded-full bg-amber-400/60" /><div className="size-2.5 rounded-full bg-green-400/60" /></div>
                <div className="flex-1 mx-8 h-6 rounded-md bg-muted/30 flex items-center justify-center"><span className="text-[10px] text-muted-foreground">segmentor.io/dashboard</span></div>
              </div>
              <div className="p-5 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                  {[{ label: "Visitors", value: "3,847", color: "text-foreground" }, { label: "Live Now", value: "24", color: "text-green-500" }, { label: "Identified", value: "1,206", color: "text-foreground" }, { label: "Customers", value: "89", color: "text-foreground" }, { label: "Revenue", value: "$12,430", color: "text-[#171717]" }].map((s) => (
                    <div key={s.label} className="rounded-lg border border-border/30 bg-muted/10 px-3 py-2.5"><p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p><p className={`text-lg font-bold ${s.color}`}>{s.value}</p></div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[{ name: "gentle fox", loc: "San Francisco, US", pages: 12, live: true }, { name: "sarah@acme.co", loc: "London, GB", pages: 23, revenue: "$149" }, { name: "bold falcon", loc: "Berlin, DE", pages: 5, live: true }, { name: "kai@startup.io", loc: "Tokyo, JP", pages: 31, revenue: "$79" }].map((v) => (
                    <div key={v.name} className="flex items-center gap-3 rounded-lg border border-border/30 bg-card px-3.5 py-2.5">
                      <div className="size-8 rounded-full bg-muted/50 shrink-0" />
                      <div className="flex-1 min-w-0"><span className="text-xs font-medium text-foreground">{v.name}</span>{v.live && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-green-400" />}<p className="text-[10px] text-muted-foreground">{v.loc}</p></div>
                      <span className="text-[10px] text-muted-foreground">{v.pages} pages</span>
                      {v.revenue && <span className="text-[10px] font-medium text-[#171717]">{v.revenue}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function OneScript() {
  return (
    <AnimatedSection className="py-16 sm:py-20">
      <motion.div variants={fadeUp} className="flex flex-col items-center gap-6">
        <p className="text-sm font-medium text-muted-foreground tracking-wide">One script. Any website. Five minutes.</p>
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10 items-center opacity-50">
          {["Framer", "Webflow", "WordPress", "Next.js", "Shopify", "Astro", "HTML"].map((p) => (<span key={p} className="text-sm sm:text-base font-semibold text-foreground">{p}</span>))}
        </div>
        <div className="mt-4 w-full max-w-xl">
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-muted/10">
              <Code className="size-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Add to your site&apos;s &lt;head&gt;</span>
            </div>
            <div className="p-4">
              <code className="text-xs sm:text-sm font-mono text-muted-foreground break-all">
                <span className="text-muted-foreground/50">&lt;</span><span className="text-[#171717]">script</span>{" "}
                <span className="text-amber-600 dark:text-amber-400">src</span><span className="text-muted-foreground/50">=</span>
                <span className="text-green-600 dark:text-green-400">&quot;segmentor.io/runtime.js?projectKey=...&quot;</span>
                <span className="text-muted-foreground/50">&gt;&lt;/</span><span className="text-[#171717]">script</span><span className="text-muted-foreground/50">&gt;</span>
              </code>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center max-w-md">Handles SPAs automatically. Detects route changes via pushState/popstate. Works with SSR and static sites alike.</p>
      </motion.div>
    </AnimatedSection>
  );
}

function ThreePillars() {
  const pillars = [
    { icon: Eye, title: "Track", subtitle: "Every click, scroll, and session", description: "Automatic pageview, click, scroll depth, form submission, and session tracking. See live visitors in real time, explore full visitor timelines, and identify users by email — all without writing code.", features: ["Pageviews & scroll depth", "Click & form tracking", "Live visitors (real-time)", "Full visitor timeline", "Anonymous friendly names"], color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", borderColor: "border-emerald-500/20" },
    { icon: Paintbrush, title: "Personalize", subtitle: "Visual editor meets smart targeting", description: "Click any element on your live site to change text, images, links, or styles. Target by location, device, UTM, time of day, language, or visitor type. Save audience segments and reuse them across rules.", features: ["Visual editor on live site", "Geo, device & UTM targeting", "Saved audience segments", "Template variables", "A/B testing with splits"], color: "bg-[#171717]/10 text-[#171717]", borderColor: "border-[#171717]/20" },
    { icon: DollarSign, title: "Monetize", subtitle: "Attribute every dollar automatically", description: "Segmentor detects Polar.sh checkout links and tags them with the visitor's ID. When a purchase, subscription, or refund happens, it's linked to their full journey — zero config required.", features: ["Automatic link tagging", "Purchase & subscription tracking", "Revenue per visitor profile", "Refund tracking", "Stripe, Gumroad, Paddle (soon)"], color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", borderColor: "border-amber-500/20" },
  ];
  return (
    <AnimatedSection id="features" className="py-20 sm:py-28">
      <motion.div variants={fadeUp} className="text-center mb-12">
        <p className="text-sm font-medium text-muted-foreground mb-3 tracking-wide">Three tools in one script</p>
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">Track. Personalize. Monetize.</h2>
        <p className="mt-4 text-[15px] text-muted-foreground max-w-2xl mx-auto">Stop juggling analytics, personalization, and revenue tools. Segmentor replaces all three with a single lightweight script and one unified dashboard.</p>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {pillars.map((p) => (
          <motion.div key={p.title} variants={fadeUp} className={`rounded-2xl border ${p.borderColor} bg-card p-7 sm:p-8 flex flex-col`}>
            <div className={`flex size-11 items-center justify-center rounded-xl ${p.color} mb-5`}><p.icon className="size-5" /></div>
            <h3 className="text-xl font-bold mb-1">{p.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{p.subtitle}</p>
            <p className="text-[14px] text-muted-foreground leading-relaxed flex-1">{p.description}</p>
            <ul className="mt-5 pt-5 border-t border-border/30 space-y-2.5">
              {p.features.map((f) => (<li key={f} className="flex items-center gap-2"><Check className="size-3.5 text-[#171717] shrink-0" /><span className="text-sm">{f}</span></li>))}
            </ul>
          </motion.div>
        ))}
      </div>
    </AnimatedSection>
  );
}

function HowItWorks() {
  return (
    <AnimatedSection id="how-it-works" className="py-20 sm:py-28">
      <motion.div variants={fadeUp} className="text-center mb-10">
        <p className="text-sm font-medium text-muted-foreground mb-3 tracking-wide">How it works</p>
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">Three steps. Five minutes. Done.</h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {[
          { step: "1", title: "Install the script", description: "Paste one script tag into your site's <head>. Works with any platform — Framer, Webflow, WordPress, Shopify, Next.js, or plain HTML.", icon: Code },
          { step: "2", title: "Personalize visually", description: "Open the visual editor, click any element on your live site, and change its content. Set targeting rules — the right visitors see the right version.", icon: Paintbrush },
          { step: "3", title: "Watch the data flow", description: "Visitor analytics, A/B test results, and revenue attribution appear in your dashboard instantly. Every pageview, click, and purchase — tracked.", icon: BarChart3 },
        ].map((s) => (
          <motion.div key={s.step} variants={fadeUp} className="rounded-2xl border border-border/50 bg-card p-7 sm:p-8 text-center flex flex-col items-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#171717] text-white text-sm font-bold mb-5">{s.step}</div>
            <h3 className="text-lg font-bold mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <motion.div variants={fadeUp} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="p-7 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug mb-3">Edit your <span className="text-[#171717]">live website</span> visually</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Click any element to change text, images, links, or styles. Use template variables like <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{"{{geo.city}}"}</code> for dynamic content. Upload custom images directly in the editor.</p>
          </div>
          <div className="mx-6 mb-6 sm:mx-8 sm:mb-8 rounded-xl border border-border/40 bg-muted/10 p-5 sm:p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4"><div className="size-2 rounded-full bg-green-400" /><span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Visual editor</span></div>
              <div className="h-3 w-16 rounded-full bg-muted/50" />
              <div className="relative"><div className="h-6 w-full rounded bg-[#171717]/8 border-2 border-[#171717]/30 border-dashed" /><div className="absolute -top-4 left-0 text-[8px] bg-[#171717] text-white px-1.5 py-0.5 rounded font-medium">Selected</div></div>
              <div className="h-3 w-3/4 rounded-full bg-muted/30" /><div className="h-3 w-1/2 rounded-full bg-muted/30" />
              <div className="flex gap-2 pt-2"><div className="h-7 w-20 rounded bg-[#171717]/15" /><div className="h-7 w-16 rounded bg-muted/30" /></div>
            </div>
          </div>
        </motion.div>
        <motion.div variants={fadeUp} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="p-7 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug mb-3">Target with precision, <span className="text-[#171717]">test with confidence</span></h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Combine targeting conditions with AND/OR logic. Save reusable audience segments. Run A/B tests with weighted traffic splits and deterministic visitor assignment.</p>
          </div>
          <div className="mx-6 mb-6 sm:mx-8 sm:mb-8 rounded-xl border border-border/40 bg-muted/10 p-5 sm:p-6">
            <div className="space-y-2.5">
              {[{ label: "Country = United States", icon: Globe, color: "bg-green-400" }, { label: "Device = Mobile", icon: Smartphone, color: "bg-amber-400" }, { label: "UTM Source = twitter", icon: Tag, color: "bg-purple-400" }, { label: "Visitor = Returning", icon: Users, color: "bg-blue-400" }].map((rule) => (
                <div key={rule.label} className="flex items-center gap-3 rounded-lg border border-border/30 bg-card px-3.5 py-2.5">
                  <div className={`size-2 rounded-full ${rule.color}`} /><rule.icon className="size-3 text-muted-foreground" /><span className="text-xs font-medium text-foreground">{rule.label}</span><Check className="size-3.5 text-[#171717] ml-auto" />
                </div>
              ))}
              <div className="pt-2 flex gap-2">
                <div className="flex-1 rounded-lg bg-[#171717]/8 border border-[#171717]/20 px-3.5 py-2.5 flex items-center gap-2"><span className="text-xs text-[#171717] font-medium">Variant A — 50%</span></div>
                <div className="flex-1 rounded-lg bg-amber-500/8 border border-amber-500/20 px-3.5 py-2.5 flex items-center gap-2"><FlaskConical className="size-3.5 text-amber-600" /><span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Variant B — 50%</span></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatedSection>
  );
}

function TargetingChips() {
  return (
    <AnimatedSection className="py-20 sm:py-28">
      <motion.div variants={fadeUp} className="text-center mb-4">
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">Powerful targeting, zero complexity</h2>
        <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed max-w-2xl mx-auto">Mix and match conditions to deliver the perfect experience to every visitor. Save combinations as reusable audience segments.</p>
      </motion.div>
      <motion.div variants={fadeUp} className="mt-8 space-y-3 overflow-hidden">
        <div className="flex gap-2.5 animate-[scrollLeft_25s_linear_infinite]">{[...ACTION_CHIPS_ROW1, ...ACTION_CHIPS_ROW1].map((chip, i) => (<span key={`${chip}-${i}`} className="shrink-0 inline-flex items-center px-4 py-2 rounded-full border border-border/50 bg-card text-sm font-medium text-muted-foreground whitespace-nowrap shadow-sm">{chip}</span>))}</div>
        <div className="flex gap-2.5 animate-[scrollRight_30s_linear_infinite]">{[...ACTION_CHIPS_ROW2, ...ACTION_CHIPS_ROW2].map((chip, i) => (<span key={`${chip}-${i}`} className="shrink-0 inline-flex items-center px-4 py-2 rounded-full border border-border/50 bg-card text-sm font-medium text-muted-foreground whitespace-nowrap shadow-sm">{chip}</span>))}</div>
      </motion.div>
      <motion.div variants={fadeUp} className="mt-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {[{ icon: Globe, label: "Geo" }, { icon: Smartphone, label: "Device" }, { icon: Tag, label: "UTM" }, { icon: Clock, label: "Time" }, { icon: Users, label: "New / Return" }, { icon: FlaskConical, label: "A/B Split" }, { icon: Layers, label: "URL" }, { icon: Globe, label: "Language" }].map((c) => (
            <div key={c.label} className="rounded-xl border border-border/40 bg-card p-4 flex flex-col items-center gap-2 text-center">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted/40"><c.icon className="size-4 text-muted-foreground" /></div>
              <span className="text-xs font-medium">{c.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
      <style>{`@keyframes scrollLeft { from { transform: translateX(0); } to { transform: translateX(-50%); } } @keyframes scrollRight { from { transform: translateX(-50%); } to { transform: translateX(0); } }`}</style>
    </AnimatedSection>
  );
}

function VisitorAnalytics() {
  return (
    <AnimatedSection className="py-20 sm:py-28">
      <motion.div variants={fadeUp}>
        <div className="rounded-3xl border border-border/50 bg-card overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-4"><Activity className="size-5 text-[#171717]" /><span className="text-xs font-semibold text-[#171717] uppercase tracking-wider">Visitor Intelligence</span></div>
              <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">Every visitor&apos;s <span className="text-[#171717]">complete story</span></h2>
              <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">Every pageview, click, scroll, form submission, and purchase — tied to a single visitor profile. Anonymous visitors get friendly names like &quot;gentle fox&quot; with unique avatars, so you can track journeys before they ever share their email.</p>
              <div className="flex flex-wrap gap-2 mt-6">{["Full timeline", "Live visitors", "Session replay", "Geo & device", "Scroll depth", "Custom events"].map((tag) => (<span key={tag} className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted/50 text-xs font-medium text-muted-foreground">{tag}</span>))}</div>
            </div>
            <div className="bg-muted/10 p-6 sm:p-8 lg:p-10 flex items-center border-t lg:border-t-0 lg:border-l border-border/40">
              <div className="w-full space-y-3">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">Visitor timeline — gentle fox</div>
                {[{ time: "2:12 PM", event: "Pageview", detail: "/features", color: "bg-blue-400" }, { time: "2:13 PM", event: "Scrolled", detail: "78% scroll depth", color: "bg-indigo-400" }, { time: "2:14 PM", event: "Click", detail: "\"View pricing\" button", color: "bg-amber-400" }, { time: "2:14 PM", event: "Pageview", detail: "/pricing", color: "bg-blue-400" }, { time: "2:15 PM", event: "Personalization", detail: "Showed annual pricing (A/B variant B)", color: "bg-purple-400" }, { time: "2:16 PM", event: "Click", detail: "\"Start free trial\" CTA", color: "bg-amber-400" }, { time: "2:16 PM", event: "Form submit", detail: "Registration form", color: "bg-green-400" }, { time: "2:17 PM", event: "Identify", detail: "sarah@acme.co", color: "bg-emerald-400" }].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-border/30 bg-card px-3.5 py-2.5">
                    <div className={`size-2 rounded-full mt-1.5 shrink-0 ${item.color}`} />
                    <div className="flex-1 min-w-0"><span className="text-xs font-medium text-foreground">{item.event}</span><p className="text-[10px] text-muted-foreground truncate">{item.detail}</p></div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatedSection>
  );
}

function RevenueAttribution() {
  return (
    <AnimatedSection className="py-20 sm:py-28">
      <motion.div variants={fadeUp}>
        <div className="rounded-3xl border border-border/50 bg-card overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-muted/10 p-6 sm:p-8 lg:p-10 flex items-center border-b lg:border-b-0 lg:border-r border-border/40 order-2 lg:order-1">
              <div className="w-full space-y-4">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">How attribution works</div>
                {[{ step: "1", label: "Visitor browses your site", sub: "Runtime tracks every page and interaction", color: "bg-blue-400" }, { step: "2", label: "Clicks a Polar.sh checkout link", sub: "Segmentor appends visitor reference_id automatically", color: "bg-amber-400" }, { step: "3", label: "Completes purchase or subscribes", sub: "Polar sends order.paid / subscription.created webhook", color: "bg-green-400" }, { step: "4", label: "Revenue linked to full journey", sub: "Purchase appears in visitor profile with product & amount", color: "bg-[#171717]" }].map((item) => (
                  <div key={item.step} className="flex items-center gap-3 rounded-lg border border-border/30 bg-card px-3.5 py-3">
                    <div className={`flex size-6 shrink-0 items-center justify-center rounded-full ${item.color} text-white text-[10px] font-bold`}>{item.step}</div>
                    <div className="flex-1 min-w-0"><span className="text-xs font-medium text-foreground">{item.label}</span><p className="text-[10px] text-muted-foreground">{item.sub}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center order-1 lg:order-2">
              <div className="flex items-center gap-2 mb-4"><DollarSign className="size-5 text-amber-500" /><span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Revenue Attribution</span></div>
              <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">Know which journey <span className="text-[#171717]">drives every dollar</span></h2>
              <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">Segmentor automatically detects checkout links on your site and tags them with the visitor&apos;s ID. Purchases, subscriptions, and refunds are all tracked and linked to the full visitor journey — no manual integration needed.</p>
              <div className="mt-6 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"><Check className="size-3 text-emerald-500" /><span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Polar.sh</span></div>
                  {["Stripe", "Gumroad", "Lemon Squeezy", "Paddle"].map((name) => (<span key={name} className="px-3 py-1.5 rounded-full bg-muted/50 text-xs font-medium text-muted-foreground">{name} (soon)</span>))}
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span className="px-2 py-1 rounded bg-muted/40 font-mono">order.paid</span>
                  <span className="px-2 py-1 rounded bg-muted/40 font-mono">subscription.created</span>
                  <span className="px-2 py-1 rounded bg-muted/40 font-mono">subscription.canceled</span>
                  <span className="px-2 py-1 rounded bg-muted/40 font-mono">order.refunded</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatedSection>
  );
}

function AnalyticsOverview() {
  return (
    <AnimatedSection className="py-20 sm:py-28">
      <motion.div variants={fadeUp} className="text-center mb-12">
        <p className="text-sm font-medium text-muted-foreground mb-3 tracking-wide">Analytics dashboard</p>
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">Your data, <span className="text-[#171717]">at a glance</span></h2>
        <p className="mt-4 text-[15px] text-muted-foreground max-w-2xl mx-auto">Two modes: impression analytics for personalization performance, and journey overview for the big picture — visitors, sessions, pageviews, bounce rate, revenue, and more.</p>
      </motion.div>
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Users, label: "Visitor Profiles", desc: "Full timeline with geo, device, browser, UTM, and session history" },
            { icon: BarChart3, label: "Journey Overview", desc: "New vs returning, bounce rate, avg session duration, top pages" },
            { icon: FlaskConical, label: "A/B Test Results", desc: "Impression counts per variant, split traffic analysis" },
            { icon: CreditCard, label: "Revenue Dashboard", desc: "Total revenue, paid customers, purchases linked to journeys" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border/50 bg-card p-6 flex flex-col items-center text-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-muted/40"><item.icon className="size-5 text-muted-foreground" /></div>
              <h4 className="text-sm font-bold">{item.label}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatedSection>
  );
}

function TestimonialsSection() {
  return (
    <AnimatedSection className="py-20 sm:py-28">
      <motion.div variants={fadeUp} className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">Trusted by <span className="text-[#171717]">builders who ship</span></h2>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t) => (
          <motion.div key={t.handle} variants={fadeUp} className="rounded-2xl border border-border/50 bg-card p-6 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted/50 text-xs font-bold text-muted-foreground">{t.name.split(" ").map((n) => n[0]).join("")}</div>
                <div><p className="text-sm font-semibold leading-tight">{t.name}</p><p className="text-xs text-muted-foreground">{t.role}</p></div>
              </div>
            </div>
            <p className="text-[14px] leading-relaxed text-foreground flex-1">{t.quote}</p>
            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border/30 text-muted-foreground">
              <span className="text-xs">{t.date}</span>
              <div className="flex items-center gap-1 ml-auto"><Heart className="size-3.5" /><span className="text-xs">{t.likes}</span></div>
              <MessageSquare className="size-3.5 text-muted-foreground" />
              <Copy className="size-3.5 text-muted-foreground" />
            </div>
          </motion.div>
        ))}
      </div>
    </AnimatedSection>
  );
}

function Pricing() {
  const [yearly, setYearly] = useState(true);
  const monthlyPrice = 9;
  const yearlyPrice = 89;
  const monthlySavings = Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100);
  const features = ["Unlimited projects", "Visitor analytics & full timeline", "Visual editor & personalization", "A/B testing with weighted splits", "Saved audience segments", "Revenue attribution (Polar.sh)", "Geo, device, UTM & time targeting", "Custom events & identify API", "Priority support"];
  return (
    <AnimatedSection id="pricing" className="py-20 sm:py-28">
      <motion.div variants={fadeUp} className="text-center mb-10">
        <p className="text-sm font-medium text-muted-foreground mb-3 tracking-wide">Pricing</p>
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">Simple pricing. No surprises.</h2>
        <p className="mt-3 text-[15px] text-muted-foreground max-w-lg mx-auto">One plan with everything included. No per-visitor fees, no feature gates, no usage caps.</p>
      </motion.div>
      <motion.div variants={fadeUp} className="max-w-md mx-auto">
        <div className="flex items-center justify-center gap-3 mb-8">
          <button onClick={() => setYearly(false)} className={`text-sm font-medium transition-colors ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>Monthly</button>
          <button onClick={() => setYearly(!yearly)} className={`relative w-11 h-6 rounded-full transition-colors ${yearly ? "bg-[#171717]" : "bg-muted"}`}><div className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${yearly ? "translate-x-[22px]" : "translate-x-1"}`} /></button>
          <button onClick={() => setYearly(true)} className={`text-sm font-medium transition-colors ${yearly ? "text-foreground" : "text-muted-foreground"}`}>Yearly</button>
          {monthlySavings > 0 && <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">Save {monthlySavings}%</span>}
        </div>
        <div className="rounded-2xl border-2 border-[#171717]/25 bg-card overflow-hidden shadow-xl shadow-[#171717]/5 relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#171717]" />
          <div className="p-8 sm:p-10">
            <div className="text-center mb-7">
              <p className="text-sm font-semibold text-[#171717] mb-3">Pro</p>
              <div className="flex items-baseline justify-center gap-1"><span className="text-xl font-semibold text-muted-foreground">$</span><span className="text-6xl font-extrabold tracking-tight tabular-nums">{yearly ? yearlyPrice : monthlyPrice}</span></div>
              <p className="text-sm text-muted-foreground mt-1">{yearly ? (<>per year <span className="text-xs">(${(yearlyPrice / 12).toFixed(2)}/mo)</span></>) : "per month"}</p>
            </div>
            <Button asChild className="w-full h-12 rounded-full text-[15px] font-semibold mb-3"><a href={`${APP_URL}/auth/signup`}>Get started now <ArrowRight className="ml-2 size-4" /></a></Button>
            <p className="text-center text-xs text-muted-foreground">14-day money-back guarantee &middot; Cancel anytime</p>
            <div className="mt-8 pt-7 border-t border-border/40">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">Everything included</p>
              <ul className="space-y-3">{features.map((f) => (<li key={f} className="flex items-center gap-2.5"><div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#171717]/10"><Check className="size-3 text-[#171717]" /></div><span className="text-sm">{f}</span></li>))}</ul>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatedSection>
  );
}

function FAQSection() {
  return (
    <AnimatedSection id="faq" className="py-20 sm:py-28">
      <motion.div variants={fadeUp} className="text-center mb-12"><h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Frequently asked questions</h2></motion.div>
      <motion.div variants={fadeUp} className="max-w-2xl mx-auto">
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-border/40">
              <AccordionTrigger className="text-[15px] font-medium text-left hover:no-underline py-5">{item.q}</AccordionTrigger>
              <AccordionContent className="text-[15px] text-muted-foreground leading-relaxed pb-5">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </AnimatedSection>
  );
}

function FinalCTA() {
  return (
    <section className="w-full px-5 sm:px-6 lg:px-8 py-20 sm:py-28">
      <div className="mx-auto max-w-[1080px]">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="rounded-3xl bg-[#171717] p-10 sm:p-16 text-center overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
          <div className="relative z-10">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-[-0.02em] leading-tight text-white max-w-2xl mx-auto">Stop guessing. Start understanding your visitors.</motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-white/70 text-[15px] max-w-lg mx-auto">Analytics, personalization, A/B testing, and revenue attribution — one script, one dashboard, five minutes to set up.</motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="h-12 px-7 text-[15px] rounded-full bg-white text-[#171717] hover:bg-white/90 font-semibold"><a href={`${APP_URL}/auth/signup`}>Start tracking for free</a></Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-7 text-[15px] rounded-full border-white/30 text-white hover:bg-white/10 bg-transparent"><a href="#features">Explore features</a></Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="w-full border-t border-border/40">
      <div className="mx-auto max-w-[1080px] px-5 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div className="col-span-2 sm:col-span-1">
            <img src="/logo.svg" alt="Segmentor" className="h-6 mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">Visitor analytics, personalization, and revenue attribution for builders who ship.</p>
          </div>
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold mb-4">{title}</h4>
              <ul className="space-y-2.5">{links.map((l) => (<li key={l.label}><a href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</a></li>))}</ul>
            </div>
          ))}
        </div>
        <div className="mt-14 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Segmentor. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Payments secured by Stripe</p>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <OneScript />
      <ThreePillars />
      <HowItWorks />
      <TargetingChips />
      <VisitorAnalytics />
      <RevenueAttribution />
      <AnalyticsOverview />
      <TestimonialsSection />
      <Pricing />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
