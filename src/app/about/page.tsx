import Link from "next/link";
import { ArrowLeft, ArrowRight, Zap, Heart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/40 bg-background/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-[1080px] items-center px-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <div className="flex-1 flex justify-center">
            <Link href="/">
              <img src="/logo.svg" alt="Segmentor" className="h-6" />
            </Link>
          </div>
          <div className="w-14" />
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-5 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="pt-20 pb-16 sm:pt-28 sm:pb-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-tight">
            About <span className="text-[#098DB9]">Segmentor</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We believe every visitor deserves a personalized experience.
            Segmentor is the no-code personalization tool built specifically for Framer
            — by makers, for makers.
          </p>
        </section>

        {/* Mission */}
        <section className="pb-16 sm:pb-24">
          <div className="rounded-2xl border border-border/50 bg-card p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">Our mission</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-3xl">
              Personalization shouldn&apos;t require an engineering team. We started Segmentor because
              we saw solopreneurs and small teams building beautiful Framer sites but showing the
              same generic content to every visitor. We set out to change that — with a visual editor
              that makes personalization as simple as drag and drop, targeting rules that actually
              make sense, and analytics that show real results.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="pb-16 sm:pb-24">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-10">
            What we stand for
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Zap,
                title: "Simplicity first",
                desc: "No-code means no-code. If it takes more than 5 minutes to set up, we&apos;ve failed. Every feature is designed for speed and clarity.",
              },
              {
                icon: Heart,
                title: "Built for makers",
                desc: "We&apos;re solopreneurs ourselves. Segmentor is built with the constraints of small teams in mind — affordable, powerful, no bloat.",
              },
              {
                icon: Eye,
                title: "Transparency",
                desc: "Simple pricing, honest analytics, no dark patterns. We earn trust by being upfront about everything we do.",
              },
            ].map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-border/50 bg-card p-7"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#098DB9]/8 text-[#098DB9] mb-5">
                  <v.icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{v.title}</h3>
                <p className="text-[15px] text-muted-foreground leading-relaxed">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20 sm:pb-28 text-center">
          <div className="rounded-3xl bg-[#098DB9] p-10 sm:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
                Ready to get started?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
                Join makers who personalize their Framer sites with Segmentor.
              </p>
              <Button
                asChild
                size="lg"
                className="h-12 px-7 rounded-full bg-white text-[#098DB9] hover:bg-white/90 font-semibold"
              >
                <Link href="/auth/signup">
                  Start for free <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40">
        <div className="mx-auto max-w-[1080px] px-5 sm:px-6 lg:px-8 py-8 flex items-center justify-between">
          <Link href="/">
            <img src="/logo.svg" alt="Segmentor" className="h-5 opacity-50" />
          </Link>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Segmentor
          </p>
        </div>
      </footer>
    </div>
  );
}
