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
  DollarSign, Activity, FlaskConical,
} from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
  : "";

const ACTION_CHIPS_ROW1 = ["Show local pricing", "Greet by name", "Hide for mobile", "Schedule flash sale", "Target returning users", "Swap hero image"];
const ACTION_CHIPS_ROW2 = ["Change CTA text", "A/B test headlines", "Redirect by country", "UTM-based content", "Time-based banner", "Language-based copy"];

const TESTIMONIALS = [
  { name: "Ulvin Omarov", role: "Founder, Design Studio", handle: "@ulvinomarov", quote: "Segmentor paid for itself in the first week. I can see exactly where visitors come from, what they click, and the visual editor lets me personalize in seconds. Conversion jumped 30%.", date: "2:15 PM Jan 12, 2026", likes: 247 },
  { name: "Shaig Allahyarli", role: "Indie Hacker", handle: "@shaigallahyarli", quote: "I replaced three tools with Segmentor \u2014 analytics, personalization, and revenue tracking all in one. The Polar.sh integration linking purchases to visitors automatically is incredible.", date: "9:30 AM Feb 3, 2026", likes: 183 },
  { name: "Aslan Mammadli", role: "Co-founder at Enverson.ai", handle: "@aslanmammadli", quote: "The visitor timeline is a game changer. I can see the full journey \u2014 every page, every click, and when they convert. Setup was literally one script tag. Five minutes and done.", date: "4:45 PM Jan 28, 2026", likes: 89 },
];

const FAQ_ITEMS = [
  { q: "What is Segmentor?", a: "Segmentor is a no-code platform that combines visitor analytics, content personalization, and revenue attribution. Add one script tag to any website to track visitors, personalize content based on targeting rules, and link purchases back to visitor journeys." },
  { q: "How does visitor tracking work?", a: "When a visitor loads your site, Segmentor\u2019s lightweight script automatically tracks pageviews, clicks, scroll depth, form submissions, and sessions. Each visitor gets a unique ID stored in a cookie, so you can follow their full journey over time." },
  { q: "Do I need to write any code?", a: "Not at all. Paste one script tag into your site, and everything works automatically \u2014 visitor tracking, personalization via the visual editor, and revenue attribution via Polar.sh checkout link detection. Zero code required." },
  { q: "How does revenue attribution work?", a: "Segmentor automatically detects Polar.sh checkout links on your site and appends a visitor reference ID. When a purchase happens, the Polar webhook links it back to the exact visitor who clicked. No manual integration needed." },
  { q: "What websites does it work with?", a: "Any website that supports a script tag \u2014 Framer, Webflow, WordPress, Next.js, plain HTML, Shopify, and more. If you can paste a script tag, Segmentor works." },
  { q: "Can I try it for free?", a: "Yes! Sign up and explore all features. When you\u2019re ready to go live with personalization, plans start at just $9/month with a 14-day money-back guarantee." },
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
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }} className="text-[36px] sm:text-[52px] lg:text-[64px] font-bold tracking-[-0.03em] leading-[1.08] max-w-4xl">
            Know your visitors. <span className="text-[#098DB9]">Personalize their experience.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }} className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            One script tag. Visitor analytics, content personalization, and revenue attribution &mdash; all without writing code.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }} className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="h-12 px-7 text-[15px] rounded-full font-semibold"><a href={`${APP_URL}/auth/signup`}>Get started free <ArrowRight className="ml-2 size-4" /></a></Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-7 text-[15px] rounded-full"><a href="#how-it-works">See how it works</a></Button>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.7 }} className="mt-16 w-full max-w-4xl">
            <div className="rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/[0.06] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/15">
                <div className="flex gap-1.5"><div className="size-2.5 rounded-full bg-red-400/60" /><div className="size-2.5 rounded-full bg-amber-400/60" /><div className="size-2.5 rounded-full bg-green-400/60" /></div>
                <div className="flex-1 mx-8 h-6 rounded-md bg-muted/30 flex items-center justify-center"><span className="text-[10px] text-muted-foreground">segmentor.io/dashboard</span></div>
              </div>
              <div className="p-5 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[{ label: "Visitors", value: "1,247", color: "text-foreground" }, { label: "Live Now", value: "12", color: "text-green-500" }, { label: "Identified", value: "384", color: "text-foreground" }, { label: "Revenue", value: "$2,840", color: "text-[#098DB9]" }].map((s) => (
                    <div key={s.label} className="rounded-lg border border-border/30 bg-muted/10 px-3 py-2.5"><p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p><p className={`text-lg font-bold ${s.color}`}>{s.value}</p></div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[{ name: "warm penguin", loc: "San Francisco", pages: 8, live: true }, { name: "sarah@acme.co", loc: "London", pages: 14, revenue: "$49" }, { name: "gentle fox", loc: "Berlin", pages: 3, live: true }].map((v) => (
                    <div key={v.name} className="flex items-center gap-3 rounded-lg border border-border/30 bg-card px-3.5 py-2.5">
                      <div className="size-8 rounded-full bg-muted/50 shrink-0" />
                      <div className="flex-1 min-w-0"><span className="text-xs font-medium text-foreground">{v.name}</span>{v.live && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-green-400" />}<p className="text-[10px] text-muted-foreground">{v.loc}</p></div>
                      <span className="text-[10px] text-muted-foreground">{v.pages} pages</span>
                      {v.revenue && <span className="text-[10px] font-medium text-[#098DB9]">{v.revenue}</span>}
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
        <p className="text-sm font-medium text-muted-foreground tracking-wide">Works with any website</p>
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10 items-center opacity-50">
          {["Framer", "Webflow", "WordPress", "Next.js", "HTML"].map((p) => (<span key={p} className="text-sm sm:text-base font-semibold text-foreground">{p}</span>))}
        </div>
        <div className="mt-4 w-full max-w-xl">
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-muted/10">
              <Code className="size-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">One line to install</span>
            </div>
            <div className="p-4">
              <code className="text-xs sm:text-sm font-mono text-muted-foreground break-all">
                <span className="text-muted-foreground/50">&lt;</span><span className="text-[#098DB9]">script</span>{" "}
                <span className="text-amber-600 dark:text-amber-400">src</span><span className="text-muted-foreground/50">=</span>
                <span className="text-green-600 dark:text-green-400">&quot;segmentor.io/runtime.js?projectKey=...&quot;</span>
                <span className="text-muted-foreground/50">&gt;&lt;/</span><span className="text-[#098DB9]">script</span><span className="text-muted-foreground/50">&gt;</span>
              </code>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatedSection>
  );
}

function ThreePillars() {
  const pillars = [
    { icon: Eye, title: "Track", subtitle: "Understand every visitor", description: "Automatic pageview, click, scroll depth, and session tracking. See live visitors, full timelines, and identify users by email.", features: ["Pageviews & sessions", "Click & scroll tracking", "Live visitors", "Visitor timeline"], color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", borderColor: "border-emerald-500/20" },
    { icon: MousePointerClick, title: "Personalize", subtitle: "Show the right content", description: "Visual editor to change any element on your live site. Target by geo, device, UTM, time, language, and more. A/B test with weighted splits.", features: ["Visual editor", "Smart targeting rules", "A/B testing", "Audience segments"], color: "bg-[#098DB9]/10 text-[#098DB9]", borderColor: "border-[#098DB9]/20" },
    { icon: DollarSign, title: "Monetize", subtitle: "Attribute every dollar", description: "Automatic Polar.sh checkout link tagging. When a visitor buys, the purchase is linked back to their journey \u2014 zero code needed.", features: ["Automatic link tagging", "Revenue per visitor", "Purchase timeline", "Polar.sh integration"], color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", borderColor: "border-amber-500/20" },
  ];
  return (
    <AnimatedSection id="features" className="py-20 sm:py-28">
      <motion.div variants={fadeUp} className="text-center mb-12">
        <p className="text-sm font-medium text-muted-foreground mb-3 tracking-wide">Everything you need</p>
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">Track. Personalize. Monetize.</h2>
        <p className="mt-4 text-[15px] text-muted-foreground max-w-2xl mx-auto">Three capabilities in one lightweight script &mdash; replacing multiple tools with a single dashboard.</p>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {pillars.map((p) => (
          <motion.div key={p.title} variants={fadeUp} className={`rounded-2xl border ${p.borderColor} bg-card p-7 sm:p-8 flex flex-col`}>
            <div className={`flex size-11 items-center justify-center rounded-xl ${p.color} mb-5`}><p.icon className="size-5" /></div>
            <h3 className="text-xl font-bold mb-1">{p.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{p.subtitle}</p>
            <p className="text-[14px] text-muted-foreground leading-relaxed flex-1">{p.description}</p>
            <ul className="mt-5 pt-5 border-t border-border/30 space-y-2.5">
              {p.features.map((f) => (<li key={f} className="flex items-center gap-2"><Check className="size-3.5 text-[#098DB9] shrink-0" /><span className="text-sm">{f}</span></li>))}
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
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">Point. Click. Personalize.</h2>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <motion.div variants={fadeUp} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="p-7 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug mb-3">Edit your <span className="text-[#098DB9]">live website</span> visually</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Click any element on your site, change the text, visibility, link, or style &mdash; and Segmentor shows it to the right visitors.</p>
          </div>
          <div className="mx-6 mb-6 sm:mx-8 sm:mb-8 rounded-xl border border-border/40 bg-muted/10 p-5 sm:p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4"><div className="size-2 rounded-full bg-green-400" /><span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Visual editor</span></div>
              <div className="h-3 w-16 rounded-full bg-muted/50" />
              <div className="relative"><div className="h-6 w-full rounded bg-[#098DB9]/8 border-2 border-[#098DB9]/30 border-dashed" /><div className="absolute -top-4 left-0 text-[8px] bg-[#098DB9] text-white px-1.5 py-0.5 rounded font-medium">Selected</div></div>
              <div className="h-3 w-3/4 rounded-full bg-muted/30" /><div className="h-3 w-1/2 rounded-full bg-muted/30" />
              <div className="flex gap-2 pt-2"><div className="h-7 w-20 rounded bg-[#098DB9]/15" /><div className="h-7 w-16 rounded bg-muted/30" /></div>
            </div>
          </div>
        </motion.div>
        <motion.div variants={fadeUp} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="p-7 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug mb-3">Set conditions, show the <span className="text-[#098DB9]">right content</span></h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Target by country, device, UTM source, time of day, language, new vs returning &mdash; combine with AND/OR logic.</p>
          </div>
          <div className="mx-6 mb-6 sm:mx-8 sm:mb-8 rounded-xl border border-border/40 bg-muted/10 p-5 sm:p-6">
            <div className="space-y-2.5">
              {[{ label: "Country = United States", icon: Globe, color: "bg-green-400" }, { label: "Device = Mobile", icon: Smartphone, color: "bg-amber-400" }, { label: "UTM Source = twitter", icon: Tag, color: "bg-purple-400" }, { label: "Visitor = Returning", icon: Users, color: "bg-blue-400" }].map((rule) => (
                <div key={rule.label} className="flex items-center gap-3 rounded-lg border border-border/30 bg-card px-3.5 py-2.5">
                  <div className={`size-2 rounded-full ${rule.color}`} /><rule.icon className="size-3 text-muted-foreground" /><span className="text-xs font-medium text-foreground">{rule.label}</span><Check className="size-3.5 text-[#098DB9] ml-auto" />
                </div>
              ))}
              <div className="pt-2"><div className="rounded-lg bg-[#098DB9]/8 border border-[#098DB9]/20 px-3.5 py-2.5 flex items-center gap-2"><MousePointerClick className="size-3.5 text-[#098DB9]" /><span className="text-xs text-[#098DB9] font-medium">Show personalized hero + local pricing</span></div></div>
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
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">Smart targeting, built in</h2>
        <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed max-w-2xl mx-auto">Combine any condition to show the perfect content to every visitor</p>
      </motion.div>
      <motion.div variants={fadeUp} className="mt-8 space-y-3 overflow-hidden">
        <div className="flex gap-2.5 animate-[scrollLeft_25s_linear_infinite]">{[...ACTION_CHIPS_ROW1, ...ACTION_CHIPS_ROW1].map((chip, i) => (<span key={`${chip}-${i}`} className="shrink-0 inline-flex items-center px-4 py-2 rounded-full border border-border/50 bg-card text-sm font-medium text-muted-foreground whitespace-nowrap shadow-sm">{chip}</span>))}</div>
        <div className="flex gap-2.5 animate-[scrollRight_30s_linear_infinite]">{[...ACTION_CHIPS_ROW2, ...ACTION_CHIPS_ROW2].map((chip, i) => (<span key={`${chip}-${i}`} className="shrink-0 inline-flex items-center px-4 py-2 rounded-full border border-border/50 bg-card text-sm font-medium text-muted-foreground whitespace-nowrap shadow-sm">{chip}</span>))}</div>
      </motion.div>
      <motion.div variants={fadeUp} className="mt-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[{ icon: Globe, label: "Geo" }, { icon: Smartphone, label: "Device" }, { icon: Tag, label: "UTM" }, { icon: Clock, label: "Time" }, { icon: Users, label: "New / Returning" }, { icon: FlaskConical, label: "A/B Split" }].map((c) => (
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
              <div className="flex items-center gap-2 mb-4"><Activity className="size-5 text-[#098DB9]" /><span className="text-xs font-semibold text-[#098DB9] uppercase tracking-wider">Visitor Analytics</span></div>
              <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">See every visitor&apos;s <span className="text-[#098DB9]">full journey</span></h2>
              <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">Every pageview, click, scroll, and session &mdash; all tied to a single visitor profile. Anonymous visitors get friendly names like &quot;warm penguin&quot; so you can track them without emails.</p>
              <div className="flex flex-wrap gap-2 mt-6">{["Timeline", "Sessions", "Live visitors", "Geo & device", "Scroll depth"].map((tag) => (<span key={tag} className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted/50 text-xs font-medium text-muted-foreground">{tag}</span>))}</div>
            </div>
            <div className="bg-muted/10 p-6 sm:p-8 lg:p-10 flex items-center border-t lg:border-t-0 lg:border-l border-border/40">
              <div className="w-full space-y-3">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">Visitor timeline</div>
                {[{ time: "2:14 PM", event: "Pageview", detail: "/pricing", color: "bg-blue-400" }, { time: "2:15 PM", event: "Click", detail: "\"Start free trial\" button", color: "bg-amber-400" }, { time: "2:15 PM", event: "Pageview", detail: "/signup", color: "bg-blue-400" }, { time: "2:16 PM", event: "Form submit", detail: "Registration form", color: "bg-green-400" }, { time: "2:16 PM", event: "Identify", detail: "sarah@acme.co", color: "bg-purple-400" }].map((item, i) => (
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
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">Automatic attribution flow</div>
                {[{ step: "1", label: "Visitor browses your site", sub: "Runtime assigns visitor ID", color: "bg-blue-400" }, { step: "2", label: "Clicks Polar checkout link", sub: "reference_id appended automatically", color: "bg-amber-400" }, { step: "3", label: "Completes purchase", sub: "Polar sends webhook with visitor ID", color: "bg-green-400" }, { step: "4", label: "Revenue linked to visitor", sub: "Shows in visitor profile & analytics", color: "bg-[#098DB9]" }].map((item) => (
                  <div key={item.step} className="flex items-center gap-3 rounded-lg border border-border/30 bg-card px-3.5 py-3">
                    <div className={`flex size-6 shrink-0 items-center justify-center rounded-full ${item.color} text-white text-[10px] font-bold`}>{item.step}</div>
                    <div className="flex-1 min-w-0"><span className="text-xs font-medium text-foreground">{item.label}</span><p className="text-[10px] text-muted-foreground">{item.sub}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center order-1 lg:order-2">
              <div className="flex items-center gap-2 mb-4"><DollarSign className="size-5 text-amber-500" /><span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Revenue Attribution</span></div>
              <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">Track revenue <span className="text-[#098DB9]">without code</span></h2>
              <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">Segmentor automatically detects Polar.sh checkout links on your site and tags them with the visitor&apos;s ID. When a purchase happens, it&apos;s linked back to their full journey &mdash; automatically.</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"><Check className="size-3 text-emerald-500" /><span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Polar.sh</span></div>
                {["Stripe", "Gumroad", "Lemon Squeezy"].map((name) => (<span key={name} className="px-3 py-1.5 rounded-full bg-muted/50 text-xs font-medium text-muted-foreground">{name} (soon)</span>))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatedSection>
  );
}

function TestimonialsSection() {
  return (
    <AnimatedSection className="py-20 sm:py-28">
      <motion.div variants={fadeUp} className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">Loved by <span className="text-[#098DB9]">solopreneurs</span></h2>
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
  const features = ["Unlimited projects", "Visitor analytics & timeline", "Revenue attribution", "Visual editor", "A/B testing", "Audience targeting", "Geo, device & time conditions", "Priority support"];
  return (
    <AnimatedSection id="pricing" className="py-20 sm:py-28">
      <motion.div variants={fadeUp} className="text-center mb-10">
        <p className="text-sm font-medium text-muted-foreground mb-3 tracking-wide">Pricing</p>
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">One plan. Everything included.</h2>
        <p className="mt-3 text-[15px] text-muted-foreground max-w-lg mx-auto">No hidden fees, no usage limits, no surprises. Just simple pricing that scales with you.</p>
      </motion.div>
      <motion.div variants={fadeUp} className="max-w-md mx-auto">
        <div className="flex items-center justify-center gap-3 mb-8">
          <button onClick={() => setYearly(false)} className={`text-sm font-medium transition-colors ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>Monthly</button>
          <button onClick={() => setYearly(!yearly)} className={`relative w-11 h-6 rounded-full transition-colors ${yearly ? "bg-[#098DB9]" : "bg-muted"}`}><div className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${yearly ? "translate-x-[22px]" : "translate-x-1"}`} /></button>
          <button onClick={() => setYearly(true)} className={`text-sm font-medium transition-colors ${yearly ? "text-foreground" : "text-muted-foreground"}`}>Yearly</button>
          {monthlySavings > 0 && <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">Save {monthlySavings}%</span>}
        </div>
        <div className="rounded-2xl border-2 border-[#098DB9]/25 bg-card overflow-hidden shadow-xl shadow-[#098DB9]/5 relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#098DB9]" />
          <div className="p-8 sm:p-10">
            <div className="text-center mb-7">
              <p className="text-sm font-semibold text-[#098DB9] mb-3">Pro</p>
              <div className="flex items-baseline justify-center gap-1"><span className="text-xl font-semibold text-muted-foreground">$</span><span className="text-6xl font-extrabold tracking-tight tabular-nums">{yearly ? yearlyPrice : monthlyPrice}</span></div>
              <p className="text-sm text-muted-foreground mt-1">{yearly ? (<>per year <span className="text-xs">(${(yearlyPrice / 12).toFixed(2)}/mo)</span></>) : "per month"}</p>
            </div>
            <Button asChild className="w-full h-12 rounded-full text-[15px] font-semibold mb-3"><a href={`${APP_URL}/billing`}>Get started now <ArrowRight className="ml-2 size-4" /></a></Button>
            <p className="text-center text-xs text-muted-foreground">14-day money-back guarantee &middot; Cancel anytime</p>
            <div className="mt-8 pt-7 border-t border-border/40">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">Everything included</p>
              <ul className="space-y-3">{features.map((f) => (<li key={f} className="flex items-center gap-2.5"><div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#098DB9]/10"><Check className="size-3 text-[#098DB9]" /></div><span className="text-sm">{f}</span></li>))}</ul>
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
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="rounded-3xl bg-[#098DB9] p-10 sm:p-16 text-center overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
          <div className="relative z-10">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-[-0.02em] leading-tight text-white max-w-2xl mx-auto">Ready to understand your visitors?</motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-white/70 text-[15px] max-w-lg mx-auto">One script tag. Visitor analytics, personalization, and revenue attribution &mdash; all in one dashboard.</motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="h-12 px-7 text-[15px] rounded-full bg-white text-[#098DB9] hover:bg-white/90 font-semibold"><a href={`${APP_URL}/auth/signup`}>Get started free</a></Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-7 text-[15px] rounded-full border-white/30 text-white hover:bg-white/10 bg-transparent"><a href="#features">Learn more</a></Button>
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
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">No-code personalization and visitor analytics for solopreneurs.</p>
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
      <TestimonialsSection />
      <Pricing />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
