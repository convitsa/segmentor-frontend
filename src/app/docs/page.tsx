import Link from "next/link";
import { ArrowLeft, Code, Pencil, Rocket } from "lucide-react";

export default function DocsPage() {
  const scriptSnippet = `<script src="https://cdn.segmentor.io/s.js" data-project="YOUR_PROJECT_ID" defer></script>`;

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
        <section className="pt-20 pb-14 sm:pt-28 sm:pb-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-tight">
            Documentation
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
            Get started with Segmentor on your Framer site in minutes.
          </p>
        </section>

        {/* Steps */}
        <section className="pb-20 sm:pb-28 max-w-3xl mx-auto space-y-8">
          {/* Step 1 */}
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-7 py-5 border-b border-border/40 bg-muted/10">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#098DB9] text-white text-sm font-bold">
                01
              </div>
              <div>
                <h2 className="text-lg font-semibold">Install the snippet</h2>
                <p className="text-sm text-muted-foreground">Add Segmentor to your Framer site</p>
              </div>
            </div>
            <div className="p-7 space-y-4">
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                Copy the script tag below and paste it into your Framer site&apos;s
                <strong className="text-foreground"> Custom Code </strong>
                section (Site Settings &rarr; General &rarr; Custom Code &rarr; End of &lt;head&gt; tag).
              </p>
              <div className="relative">
                <pre className="rounded-xl bg-muted/30 border border-border/40 p-4 overflow-x-auto text-sm font-mono text-foreground">
                  {scriptSnippet}
                </pre>
              </div>
              <p className="text-sm text-muted-foreground">
                Replace <code className="text-foreground font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">YOUR_PROJECT_ID</code> with
                the project ID from your Segmentor dashboard.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-7 py-5 border-b border-border/40 bg-muted/10">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#098DB9] text-white text-sm font-bold">
                02
              </div>
              <div>
                <h2 className="text-lg font-semibold">Open the visual editor</h2>
                <p className="text-sm text-muted-foreground">Select elements and create variants</p>
              </div>
            </div>
            <div className="p-7 space-y-4">
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                Once installed, open any project in your Segmentor dashboard and click
                <strong className="text-foreground"> Open Editor</strong>. This loads your live
                Framer site with the Segmentor overlay. Click on any element to select it,
                then create a <strong className="text-foreground">new variant</strong> with different
                text, styles, or visibility.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: Code, label: "Change text content" },
                  { icon: Pencil, label: "Modify styles & classes" },
                  { icon: Rocket, label: "Show or hide elements" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/40 bg-muted/10 p-4 flex items-center gap-3">
                    <item.icon className="size-4 text-[#098DB9] shrink-0" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-7 py-5 border-b border-border/40 bg-muted/10">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#098DB9] text-white text-sm font-bold">
                03
              </div>
              <div>
                <h2 className="text-lg font-semibold">Set conditions & go live</h2>
                <p className="text-sm text-muted-foreground">Target the right visitors</p>
              </div>
            </div>
            <div className="p-7 space-y-4">
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                Add targeting conditions to each variant. You can combine any of these rules:
              </p>
              <ul className="space-y-2">
                {[
                  "Geo-location (country, region, city)",
                  "Device type (mobile, desktop, tablet)",
                  "Time of day or day of week",
                  "UTM parameters (source, medium, campaign)",
                  "Custom audience segments",
                ].map((rule) => (
                  <li key={rule} className="flex items-start gap-2.5 text-sm">
                    <div className="size-1.5 rounded-full bg-[#098DB9] mt-2 shrink-0" />
                    <span className="text-muted-foreground">{rule}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                When you&apos;re happy with the setup, publish your changes. They go live instantly
                on your Framer site — no redeploy needed.
              </p>
            </div>
          </div>

          {/* Help */}
          <div className="rounded-2xl border border-[#098DB9]/20 bg-[#098DB9]/[0.03] p-7 text-center">
            <h3 className="text-lg font-semibold mb-2">Need help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If you run into any issues, our team is here to help.
            </p>
            <Link
              href="/contact"
              className="text-sm font-medium text-[#098DB9] hover:underline"
            >
              Contact support &rarr;
            </Link>
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
