import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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

      <main className="mx-auto max-w-[720px] px-5 sm:px-6 lg:px-8 pt-20 pb-20 sm:pt-28 sm:pb-28">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-tight mb-3">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-12">
          Effective date: February 1, 2026
        </p>

        <div className="prose-custom space-y-10">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              When you create an account, we collect your name, email address, and payment information.
              When visitors interact with sites using Segmentor, we collect anonymous data such as
              IP-based country, device type, browser, and page URL to apply personalization rules.
              We do not collect personally identifiable information from your site visitors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              We use collected information to provide and improve the Segmentor service,
              process payments, send transactional emails (account verification, billing receipts),
              and display analytics in your dashboard. We do not sell or rent your data to third
              parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Cookies</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Segmentor uses essential cookies to maintain your authenticated session. Our
              runtime script on your site may use a session cookie to identify returning visitors
              for personalization purposes. No advertising or tracking cookies are used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Retention</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Account data is retained for the duration of your subscription and up to 30 days
              after cancellation. Anonymous visitor analytics data is retained for 12 months,
              after which it is automatically deleted. You may request earlier deletion by
              contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Third-Party Services</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              We use the following third-party services to operate Segmentor:
            </p>
            <ul className="mt-3 space-y-2">
              {[
                "Stripe — payment processing",
                "Resend — transactional email",
                "PostHog — product analytics (our dashboard, not your visitors)",
                "Google OAuth — optional sign-in provider",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[15px] text-muted-foreground">
                  <div className="size-1.5 rounded-full bg-muted-foreground/30 mt-2 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              You have the right to access, correct, or delete your personal data at any time.
              You can export your data from the dashboard settings or request a full data export
              by emailing us. If you are in the EU, you have additional rights under the GDPR,
              including the right to data portability and the right to lodge a complaint with
              your local supervisory authority.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Contact</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              If you have questions about this privacy policy or your data, please contact us at{" "}
              <a href="mailto:support@segmentor.io" className="text-[#098DB9] hover:underline">
                support@segmentor.io
              </a>.
            </p>
          </section>
        </div>
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
