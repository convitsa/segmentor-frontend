"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  Menu,
  X,
  Check,
  MousePointerClick,
  Globe,
  Clock,
  Monitor,
  Users,
  BarChart3,
  Code,
  Pencil,
  Rocket,
  Heart,
  MessageSquare,
  Copy,
  Share2,
  Mail,
  Link2,
  Webhook,
  Target,
  Eye,
  Smartphone,
  Tag,
} from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
  : "";

/* ─── Data ─── */

const USE_CASES = ["E-commerce", "SaaS", "Portfolio", "Blog", "Agency"];

const ACTION_CHIPS_ROW1 = [
  "Show local pricing",
  "Greet by name",
  "Hide for mobile",
  "Schedule flash sale",
  "Target returning users",
  "Swap hero image",
];

const ACTION_CHIPS_ROW2 = [
  "Change CTA text",
  "Show exit popup",
  "Redirect by country",
  "A/B test headlines",
  "UTM-based content",
  "Time-based banner",
];

const SHARING_CHANNELS = [
  { label: "Public link", icon: Link2 },
  { label: "Slack", icon: MessageSquare },
  { label: "Email", icon: Mail },
  { label: "Analytics", icon: BarChart3 },
  { label: "Webhook", icon: Webhook },
];

const TESTIMONIALS = [
  {
    name: "Ulvin Omarov",
    role: "Framer Pro Expert",
    handle: "@ulvinomarov",
    quote: "Segmentor paid for itself in the first week. Conversion on my Framer landing page jumped 30%. Not sure how they made it this easy.",
    date: "2:15 PM · Jan 12, 2026",
    likes: 247,
  },
  {
    name: "Shaig Allahyarli",
    role: "Framer Pro Expert",
    handle: "@shaigallahyarli",
    quote: "Segmentor is so good. I replaced three tools with it and the visual editor works perfectly with Framer. Hope they keep shipping!",
    date: "9:30 AM · Feb 3, 2026",
    likes: 183,
  },
  {
    name: "Aslan Mammadli",
    role: "Co-founder at Enverson.ai",
    handle: "@aslanmammadli",
    quote: "I get uncharacteristically excited about client calls now. Why? Because the payoff is showing them personalized Framer experiences seconds after setup.",
    date: "4:45 PM · Jan 28, 2026",
    likes: 89,
  },
];

const FAQ_ITEMS = [
  { q: "What is Segmentor?", a: "Segmentor is a no-code personalization platform that lets you show different content to different visitors based on their location, device, traffic source, time of day, and more — without writing any code." },
  { q: "Do I need to write code?", a: "Not at all. Segmentor provides a visual editor where you can point and click on any element on your live website and create personalized variants. Just paste one script tag to get started." },
  { q: "Does it work with Framer?", a: "Absolutely! Segmentor is built specifically for Framer. Just add a single code component or embed, and you're ready to personalize any element on your Framer site." },
  { q: "How does geo-targeting work?", a: "When a visitor loads your site, Segmentor detects their country and region via their IP address. You can then create rules to show specific content to visitors from certain locations." },
  { q: "Can I try it for free?", a: "Yes! You can sign up and explore Segmentor's features. When you're ready to go live, plans start at just $9/month." },
  { q: "How do I install it on Framer?", a: "Add Segmentor as a code component or paste the script tag into your Framer site's custom code section. That's it — Segmentor will start working immediately on your published site." },
];

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: `${APP_URL}/billing` },
    { label: "Integrations", href: "#platforms" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Documentation", href: "/docs" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

/* ─── Animation helpers ─── */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

function AnimatedSection({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
      className={`w-full px-5 sm:px-6 lg:px-8 ${className}`}
    >
      <div className="mx-auto max-w-[1080px]">{children}</div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   1. Navbar
   ═══════════════════════════════════════════ */

function Navbar() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-xl border-b border-border/40 shadow-sm shadow-black/[0.03]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1080px] items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/logo.svg" alt="Segmentor" className="h-6" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3.5 py-2 text-[14px] text-muted-foreground hover:text-foreground transition-colors rounded-lg"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Button asChild size="sm" className="rounded-full h-9 px-5 text-[14px]">
              <a href={`${APP_URL}/dashboard/projects`}>Dashboard</a>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-full h-9 px-4 text-[14px]">
                <a href={`${APP_URL}/auth/signin`}>Log in</a>
              </Button>
              <Button asChild size="sm" className="rounded-full h-9 px-5 text-[14px] bg-foreground text-background hover:bg-foreground/90">
                <a href={`${APP_URL}/auth/signup`}>Get for free</a>
              </Button>
            </>
          )}
        </div>

        <button className="md:hidden p-2 -mr-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-border/40 bg-background/95 backdrop-blur-xl"
          >
            <div className="flex flex-col gap-1 p-5">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 text-[15px] text-muted-foreground hover:text-foreground rounded-lg"
                >
                  {l.label}
                </a>
              ))}
              <div className="flex gap-3 mt-4 pt-4 border-t border-border/40">
                {user ? (
                  <Button asChild size="sm" className="flex-1 rounded-full">
                    <a href={`${APP_URL}/dashboard/projects`}>Dashboard</a>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="ghost" size="sm" className="flex-1 rounded-full">
                      <a href={`${APP_URL}/auth/signin`}>Log in</a>
                    </Button>
                    <Button asChild size="sm" className="flex-1 rounded-full bg-foreground text-background hover:bg-foreground/90">
                      <a href={`${APP_URL}/auth/signup`}>Get for free</a>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ═══════════════════════════════════════════
   2. Hero
   ═══════════════════════════════════════════ */

function Hero() {
  return (
    <section className="w-full px-5 sm:px-6 lg:px-8 pt-32 pb-6 sm:pt-40 sm:pb-10">
      <div className="mx-auto max-w-[1080px]">
        <div className="flex flex-col items-center text-center">
          {/* Pill badge */}
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="mt-8 text-[36px] sm:text-[52px] lg:text-[64px] font-bold tracking-[-0.03em] leading-[1.08] max-w-3xl"
          >
            The personalization tool that helps you get the{" "}
            <span className="relative inline-block">
              <span className="text-muted-foreground/30 line-through decoration-muted-foreground/25 decoration-[3px]">
                coding
              </span>
            </span>{" "}
            <span className="text-[#098DB9]">done.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-6 text-lg sm:text-xl font-medium text-foreground/80 max-w-2xl leading-relaxed"
          >
            Segmentor takes your Framer site and makes it personal for every visitor
          </motion.h2>

          {/* Product mockup -- split card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: "easeOut" as const }}
            className="mt-14 w-full max-w-4xl"
          >
            <div className="rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/[0.06] overflow-hidden">
              {/* Labels row */}
              <div className="flex border-b border-border/40">
                <div className="flex-1 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest border-r border-border/40 bg-muted/15">
                  Your website
                </div>
                <div className="flex-1 px-5 py-3 text-xs font-semibold text-[#098DB9] uppercase tracking-widest bg-[#098DB9]/4 flex items-center gap-1.5">
                  <MousePointerClick className="size-3" />
                  Personalized
                </div>
              </div>

              <div className="flex min-h-[260px] sm:min-h-[340px]">
                {/* Left - plain */}
                <div className="flex-1 p-6 sm:p-8 border-r border-border/40 flex flex-col justify-center">
                  <div className="space-y-3 opacity-40">
                    <div className="h-3 w-20 rounded-full bg-muted" />
                    <div className="h-7 w-full rounded-lg bg-muted" />
                    <div className="h-3 w-4/5 rounded-full bg-muted" />
                    <div className="h-3 w-3/5 rounded-full bg-muted" />
                    <div className="flex gap-2 pt-3">
                      <div className="h-9 w-24 rounded-lg bg-muted" />
                      <div className="h-9 w-20 rounded-lg bg-muted" />
                    </div>
                  </div>
                </div>

                {/* Right - personalized */}
                <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center bg-[#098DB9]/[0.02]">
                  <div className="space-y-3">
                    <div className="h-3 w-20 rounded-full bg-muted/50" />
                    <div className="h-7 w-full rounded-lg bg-[#098DB9]/8 border border-[#098DB9]/20 flex items-center px-3">
                      <span className="text-xs text-[#098DB9] font-medium">Welcome back, Sarah!</span>
                    </div>
                    <div className="h-3 w-4/5 rounded-full bg-muted/30" />
                    <div className="h-3 w-3/5 rounded-full bg-muted/30" />
                    <div className="flex gap-2 pt-3">
                      <div className="h-9 w-24 rounded-lg bg-[#098DB9]/15 flex items-center justify-center">
                        <span className="text-[10px] text-[#098DB9] font-medium">Your Deal</span>
                      </div>
                      <div className="h-9 w-20 rounded-lg bg-muted/30" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   3. Built for Framer
   ═══════════════════════════════════════════ */

function BuiltForFramer() {
  return (
    <AnimatedSection id="platforms" className="py-16 sm:py-20">
      <motion.div variants={fadeUp} className="flex flex-col items-center gap-4">
        <p className="text-sm sm:text-base text-muted-foreground">
          Built for
        </p>
        <div className="flex items-center gap-3">
          <img src="/framer-logo.svg" alt="Framer" className="h-8 sm:h-10" />
          <span className="text-2xl sm:text-3xl font-bold tracking-tight">Framer</span>
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          The no-code personalization tool designed specifically for Framer sites. One script, unlimited possibilities.
        </p>
      </motion.div>
    </AnimatedSection>
  );
}

/* ═══════════════════════════════════════════
   4. How It Works -- Two Side-by-Side Cards
   ═══════════════════════════════════════════ */

function HowItWorks() {
  return (
    <AnimatedSection id="how-it-works" className="py-20 sm:py-28">
      <motion.p variants={fadeUp} className="text-center text-sm font-medium text-muted-foreground mb-3 tracking-wide">
        How it works
      </motion.p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
        {/* Card 1 */}
        <motion.div variants={fadeUp} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="p-7 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug mb-4">
              Segmentor is like a design tool, but it works on your <span className="text-[#098DB9]">live Framer site</span>
            </h3>
          </div>
          {/* Mockup */}
          <div className="mx-6 mb-6 sm:mx-8 sm:mb-8 rounded-xl border border-border/40 bg-muted/10 p-5 sm:p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-2 rounded-full bg-green-400" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Live editing</span>
              </div>
              <div className="h-3 w-16 rounded-full bg-muted/50" />
              <div className="relative">
                <div className="h-6 w-full rounded bg-[#098DB9]/8 border-2 border-[#098DB9]/30 border-dashed" />
                <div className="absolute -top-4 left-0 text-[8px] bg-[#098DB9] text-white px-1.5 py-0.5 rounded font-medium">
                  Selected
                </div>
              </div>
              <div className="h-3 w-3/4 rounded-full bg-muted/30" />
              <div className="h-3 w-1/2 rounded-full bg-muted/30" />
              <div className="flex gap-2 pt-2">
                <div className="h-7 w-20 rounded bg-[#098DB9]/15" />
                <div className="h-7 w-16 rounded bg-muted/30" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 2 */}
        <motion.div variants={fadeUp} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="p-7 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug mb-4">
              Set your conditions, and Segmentor shows the <span className="text-[#098DB9]">right content</span>
            </h3>
          </div>
          {/* Mockup */}
          <div className="mx-6 mb-6 sm:mx-8 sm:mb-8 rounded-xl border border-border/40 bg-muted/10 p-5 sm:p-6">
            <div className="space-y-2.5">
              {[
                { label: "Country = United States", color: "bg-green-400" },
                { label: "Device = Mobile", color: "bg-amber-400" },
                { label: 'Time = "9am–5pm"', color: "bg-blue-400" },
              ].map((rule, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border/30 bg-card px-3.5 py-2.5">
                  <div className={`size-2 rounded-full ${rule.color}`} />
                  <span className="text-xs font-medium text-foreground">{rule.label}</span>
                  <Check className="size-3.5 text-[#098DB9] ml-auto" />
                </div>
              ))}
              <div className="pt-2">
                <div className="rounded-lg bg-[#098DB9]/8 border border-[#098DB9]/20 px-3.5 py-2.5 flex items-center gap-2">
                  <MousePointerClick className="size-3.5 text-[#098DB9]" />
                  <span className="text-xs text-[#098DB9] font-medium">Show &quot;Welcome back, Sarah!&quot;</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatedSection>
  );
}

/* ═══════════════════════════════════════════
   5. Made for Framer -- Full-Width Card
   ═══════════════════════════════════════════ */

function MadeForFramer() {
  return (
    <AnimatedSection id="features" className="py-20 sm:py-28">
      <motion.div variants={fadeUp}>
        <div className="rounded-3xl border border-border/50 bg-card overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Text side */}
            <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
              <div className="flex items-center gap-2.5 mb-5">
                <img src="/framer-logo.svg" alt="Framer" className="h-7" />
                <span className="text-sm font-semibold text-muted-foreground">+</span>
                <img src="/logo.svg" alt="Segmentor" className="h-5" />
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">
                Made for Framer, no code needed
              </h2>
              <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
                Segmentor integrates natively with Framer. Add one code component, and start personalizing any element on your site — no plugins, no complex setup.
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                {["Code component", "Custom code embed", "Script tag"].map((method) => (
                  <span
                    key={method}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted/50 text-xs font-medium text-muted-foreground"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>

            {/* Testimonial side */}
            <div className="bg-muted/10 p-8 sm:p-10 lg:p-12 flex items-center border-t lg:border-t-0 lg:border-l border-border/40">
              <blockquote className="relative">
                <div className="text-4xl text-[#098DB9]/20 font-serif leading-none mb-2">&ldquo;</div>
                <p className="text-[15px] sm:text-base leading-relaxed text-foreground italic">
                  Segmentor has become indispensable for our Framer projects — feels like I&apos;m living in the future. Setup was 5 minutes and my clients love the personalized experiences.
                </p>
                <footer className="mt-5 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#098DB9]/8 text-[#098DB9] text-xs font-bold">
                    UO
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Ulvin Omarov</p>
                    <p className="text-xs text-muted-foreground">Framer Pro Expert</p>
                  </div>
                </footer>
              </blockquote>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatedSection>
  );
}

/* ═══════════════════════════════════════════
   6. Use-Case Tabs + Mockup
   ═══════════════════════════════════════════ */

function UseCaseTabs() {
  const [active, setActive] = useState(0);

  return (
    <AnimatedSection className="py-20 sm:py-28">
      <motion.div variants={fadeUp}>
        {/* Use-case pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {USE_CASES.map((uc, i) => (
            <button
              key={uc}
              onClick={() => setActive(i)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                active === i
                  ? "bg-foreground text-background shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {uc}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-6">
        {/* Title area */}
        <div className="rounded-3xl border border-border/50 bg-card overflow-hidden">
          <div className="p-8 sm:p-10">
            <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug text-center">
              Get personalizations in the format your{" "}
              <span className="text-[#098DB9]">visitors need</span>
            </h2>
            <p className="mt-4 text-center text-[15px] text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Make use of customizable templates for your most common Framer use cases — from e-commerce product pages to SaaS landing pages and portfolios.
            </p>
          </div>

          {/* Mockup */}
          <div className="mx-6 mb-6 sm:mx-10 sm:mb-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="rounded-xl border border-border/40 bg-muted/10 p-5 sm:p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-[#098DB9]" />
                    <span className="text-xs font-semibold text-foreground">{USE_CASES[active]} template</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">Active</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {["Hero Section", "CTA Banner", "Pricing Block"].map((el, i) => (
                    <div
                      key={el}
                      className={`rounded-lg border px-3.5 py-3 ${
                        i === 0
                          ? "border-[#098DB9]/30 bg-[#098DB9]/5"
                          : "border-border/30 bg-card"
                      }`}
                    >
                      <span className={`text-xs font-medium ${i === 0 ? "text-[#098DB9]" : "text-muted-foreground"}`}>
                        {el}
                      </span>
                      <div className="mt-2 space-y-1.5">
                        <div className={`h-2 w-full rounded-full ${i === 0 ? "bg-[#098DB9]/15" : "bg-muted/40"}`} />
                        <div className={`h-2 w-3/4 rounded-full ${i === 0 ? "bg-[#098DB9]/10" : "bg-muted/30"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatedSection>
  );
}

/* ═══════════════════════════════════════════
   7. Action Chips + Mockup
   ═══════════════════════════════════════════ */

function ActionChips() {
  return (
    <AnimatedSection className="py-20 sm:py-28">
      <motion.div variants={fadeUp} className="text-center mb-4">
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">
          Put your personalizations to work
        </h2>
        <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Segmentor has smart targeting built in, so it can help you do all your post-setup actions
        </p>
      </motion.div>

      {/* Scrolling chip rows */}
      <motion.div variants={fadeUp} className="mt-8 space-y-3 overflow-hidden">
        <div className="flex gap-2.5 animate-[scrollLeft_25s_linear_infinite]">
          {[...ACTION_CHIPS_ROW1, ...ACTION_CHIPS_ROW1].map((chip, i) => (
            <span
              key={`${chip}-${i}`}
              className="shrink-0 inline-flex items-center px-4 py-2 rounded-full border border-border/50 bg-card text-sm font-medium text-muted-foreground whitespace-nowrap shadow-sm"
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="flex gap-2.5 animate-[scrollRight_30s_linear_infinite]">
          {[...ACTION_CHIPS_ROW2, ...ACTION_CHIPS_ROW2].map((chip, i) => (
            <span
              key={`${chip}-${i}`}
              className="shrink-0 inline-flex items-center px-4 py-2 rounded-full border border-border/50 bg-card text-sm font-medium text-muted-foreground whitespace-nowrap shadow-sm"
            >
              {chip}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Mockup */}
      <motion.div variants={fadeUp} className="mt-10">
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Left: targeting rules */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  Targeting Rules
                </div>
                {[
                  { icon: Globe, label: "Geo: United States", active: true },
                  { icon: Smartphone, label: "Device: Mobile", active: true },
                  { icon: Clock, label: "Time: 9am–5pm EST", active: false },
                  { icon: Tag, label: "UTM: twitter_campaign", active: true },
                ].map((rule, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border/30 bg-muted/10 px-3.5 py-2.5">
                    <rule.icon className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground flex-1">{rule.label}</span>
                    <div className={`size-2 rounded-full ${rule.active ? "bg-green-400" : "bg-muted-foreground/30"}`} />
                  </div>
                ))}
              </div>
              {/* Right: result */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  Result Preview
                </div>
                <div className="rounded-lg border border-[#098DB9]/20 bg-[#098DB9]/[0.03] p-4 space-y-2.5">
                  <div className="h-3 w-20 rounded-full bg-muted/40" />
                  <div className="h-5 w-full rounded bg-[#098DB9]/10 flex items-center px-2">
                    <span className="text-[10px] text-[#098DB9] font-medium">Hey Sarah, welcome back!</span>
                  </div>
                  <div className="h-2.5 w-4/5 rounded-full bg-muted/25" />
                  <div className="h-2.5 w-3/5 rounded-full bg-muted/25" />
                  <div className="flex gap-2 pt-1">
                    <div className="h-7 w-20 rounded bg-[#098DB9]/15 flex items-center justify-center">
                      <span className="text-[9px] text-[#098DB9] font-medium">Claim deal</span>
                    </div>
                    <div className="h-7 w-16 rounded bg-muted/25" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes scrollLeft {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes scrollRight {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </AnimatedSection>
  );
}

/* ═══════════════════════════════════════════
   8. Share Your Results
   ═══════════════════════════════════════════ */

function ShareResults() {
  return (
    <AnimatedSection className="py-20 sm:py-28">
      <motion.div variants={fadeUp}>
        <div className="rounded-3xl border border-border/50 bg-card overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Text side */}
            <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
              <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">
                Share your results with <span className="text-[#098DB9]">one click</span>
              </h2>
              <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
                Segmentor makes it easy to export and share personalization performance on the platforms you already use.
              </p>
            </div>

            {/* Channel pills */}
            <div className="bg-muted/10 p-8 sm:p-10 lg:p-12 flex items-center border-t lg:border-t-0 lg:border-l border-border/40">
              <div className="w-full space-y-2.5">
                {SHARING_CHANNELS.map((ch) => (
                  <div
                    key={ch.label}
                    className="flex items-center gap-3 rounded-xl border border-border/40 bg-card px-4 py-3 hover:border-[#098DB9]/30 transition-colors cursor-pointer group"
                  >
                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted/40 group-hover:bg-[#098DB9]/8 transition-colors">
                      <ch.icon className="size-4 text-muted-foreground group-hover:text-[#098DB9] transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{ch.label}</span>
                    <Share2 className="size-3.5 text-muted-foreground/40 ml-auto" />
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

/* ═══════════════════════════════════════════
   9. Testimonials -- Twitter/X Style
   ═══════════════════════════════════════════ */

function TestimonialsSection() {
  return (
    <AnimatedSection className="py-20 sm:py-28">
      <motion.div variants={fadeUp} className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">
          Loved by <span className="text-[#098DB9]">Framer experts</span>
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t) => (
          <motion.div
            key={t.handle}
            variants={fadeUp}
            className="rounded-2xl border border-border/50 bg-card p-6 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted/50 text-xs font-bold text-muted-foreground">
                  {t.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
              <span className="text-xs text-[#098DB9] font-medium cursor-pointer hover:underline">
                Follow
              </span>
            </div>

            {/* Quote */}
            <p className="text-[14px] leading-relaxed text-foreground flex-1">
              {t.quote}
            </p>

            {/* Footer */}
            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border/30 text-muted-foreground">
              <span className="text-xs">{t.date}</span>
              <div className="flex items-center gap-1 ml-auto">
                <Heart className="size-3.5" />
                <span className="text-xs">{t.likes}</span>
              </div>
              <button className="p-0">
                <MessageSquare className="size-3.5 text-muted-foreground" />
              </button>
              <button className="p-0">
                <Copy className="size-3.5 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </AnimatedSection>
  );
}

/* ═══════════════════════════════════════════
   10. Pricing
   ═══════════════════════════════════════════ */

function Pricing() {
  const [yearly, setYearly] = useState(true);

  const monthlyPrice = 9;
  const yearlyPrice = 89;
  const monthlySavings = Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100);

  const features = [
    "Unlimited projects",
    "Unlimited personalizations",
    "Visual editor",
    "Audience targeting",
    "Analytics dashboard",
    "Geo & time conditions",
    "Priority support",
  ];

  return (
    <AnimatedSection id="pricing" className="py-20 sm:py-28">
      <motion.div variants={fadeUp} className="text-center mb-10">
        <p className="text-sm font-medium text-muted-foreground mb-3 tracking-wide">Pricing</p>
        <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-tight leading-snug">
          One plan. Everything included.
        </h2>
        <p className="mt-3 text-[15px] text-muted-foreground max-w-lg mx-auto">
          No hidden fees, no usage limits, no surprises. Just simple pricing that scales with you.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="max-w-md mx-auto">
        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={() => setYearly(false)}
            className={`text-sm font-medium transition-colors ${!yearly ? "text-foreground" : "text-muted-foreground"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative w-11 h-6 rounded-full transition-colors ${yearly ? "bg-[#098DB9]" : "bg-muted"}`}
          >
            <div
              className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${yearly ? "translate-x-[22px]" : "translate-x-1"}`}
            />
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`text-sm font-medium transition-colors ${yearly ? "text-foreground" : "text-muted-foreground"}`}
          >
            Yearly
          </button>
          {monthlySavings > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
              Save {monthlySavings}%
            </span>
          )}
        </div>

        {/* Card */}
        <div className="rounded-2xl border-2 border-[#098DB9]/25 bg-card overflow-hidden shadow-xl shadow-[#098DB9]/5 relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#098DB9]" />

          <div className="p-8 sm:p-10">
            {/* Plan header */}
            <div className="text-center mb-7">
              <p className="text-sm font-semibold text-[#098DB9] mb-3">Pro</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-xl font-semibold text-muted-foreground">$</span>
                <span className="text-6xl font-extrabold tracking-tight tabular-nums">
                  {yearly ? yearlyPrice : monthlyPrice}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {yearly ? (
                  <>
                    per year{" "}
                    <span className="text-xs">
                      (${(yearlyPrice / 12).toFixed(2)}/mo)
                    </span>
                  </>
                ) : (
                  "per month"
                )}
              </p>
            </div>

            {/* CTA */}
            <Button asChild className="w-full h-12 rounded-full text-[15px] font-semibold mb-3">
              <a href={`${APP_URL}/billing`}>
                Get started now
                <ArrowRight className="ml-2 size-4" />
              </a>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              14-day money-back guarantee &middot; Cancel anytime
            </p>

            {/* Features */}
            <div className="mt-8 pt-7 border-t border-border/40">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                Everything included
              </p>
              <ul className="space-y-3">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#098DB9]/10">
                      <Check className="size-3 text-[#098DB9]" />
                    </div>
                    <span className="text-sm">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatedSection>
  );
}

/* ═══════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════ */

function FAQSection() {
  return (
    <AnimatedSection id="faq" className="py-20 sm:py-28">
      <motion.div variants={fadeUp} className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Frequently asked questions
        </h2>
      </motion.div>

      <motion.div variants={fadeUp} className="max-w-2xl mx-auto">
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-border/40">
              <AccordionTrigger className="text-[15px] font-medium text-left hover:no-underline py-5">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-[15px] text-muted-foreground leading-relaxed pb-5">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </AnimatedSection>
  );
}

/* ═══════════════════════════════════════════
   10. Final CTA Banner
   ═══════════════════════════════════════════ */

function FinalCTA() {
  return (
    <section className="w-full px-5 sm:px-6 lg:px-8 py-20 sm:py-28">
      <div className="mx-auto max-w-[1080px]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="rounded-3xl bg-[#098DB9] p-10 sm:p-16 text-center overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
          <div className="relative z-10">
            <motion.h2
              variants={fadeUp}
              className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-[-0.02em] leading-tight text-white max-w-2xl mx-auto"
            >
              Ready to personalize your Framer site?
            </motion.h2>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                size="lg"
                className="h-12 px-7 text-[15px] rounded-full bg-white text-[#098DB9] hover:bg-white/90 font-semibold"
              >
                <a href={`${APP_URL}/auth/signup`}>
                  Get started free
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-7 text-[15px] rounded-full border-white/30 text-white hover:bg-white/10 bg-transparent"
              >
                <a href="#features">
                  Learn more
                </a>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   11. Footer
   ═══════════════════════════════════════════ */

function Footer() {
  return (
    <footer className="w-full border-t border-border/40">
      <div className="mx-auto max-w-[1080px] px-5 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {/* Logo + tagline */}
          <div className="col-span-2 sm:col-span-1">
            <img src="/logo.svg" alt="Segmentor" className="h-6 mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[180px]">
              No-code personalization built for Framer.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Segmentor. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">Payments secured by Stripe</p>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════
   Page
   ═══════════════════════════════════════════ */

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <BuiltForFramer />
      <HowItWorks />
      <MadeForFramer />
      <UseCaseTabs />
      <ActionChips />
      <ShareResults />
      <TestimonialsSection />
      <Pricing />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
