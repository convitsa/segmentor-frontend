import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-12">
          Effective date: February 1, 2026
        </p>

        <div className="prose-custom space-y-10">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              By accessing or using Segmentor (&ldquo;the Service&rdquo;), you agree to be bound
              by these Terms of Service. If you do not agree, you may not use the Service.
              We may update these terms from time to time — continued use constitutes acceptance
              of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Segmentor is a no-code personalization platform that allows you to display
              different content to different visitors on your website based on conditions
              such as location, device, time, and traffic source. The Service includes a
              visual editor, targeting engine, analytics dashboard, and runtime script.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              You must provide accurate and complete information when creating an account.
              You are responsible for maintaining the confidentiality of your login credentials
              and for all activity under your account. You must notify us immediately of any
              unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Payment Terms</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Paid plans are billed in advance on a monthly or yearly basis through Stripe.
              All fees are non-refundable except as described in our 14-day money-back guarantee.
              If your payment method fails, we may suspend access until payment is resolved.
              Prices may change with 30 days&apos; written notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              The Service, including its design, code, features, and documentation, is owned
              by Segmentor. You retain ownership of your website content and any data you
              provide. By using the Service, you grant us a limited license to process your
              data solely for the purpose of providing the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Acceptable Use</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              You agree not to use the Service to distribute malware, phishing content,
              or any illegal material. You may not attempt to reverse-engineer, scrape,
              or interfere with the Service&apos;s infrastructure. We reserve the right to
              suspend accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Segmentor shall not be liable for any
              indirect, incidental, special, or consequential damages resulting from your use
              of the Service. Our total liability shall not exceed the amount you paid us in
              the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Termination</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              You may cancel your account at any time from the billing portal. We may terminate
              or suspend your account if you violate these terms. Upon termination, your data
              will be retained for 30 days, after which it will be permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Governing Law</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              These terms shall be governed by and construed in accordance with applicable law,
              without regard to conflict of law principles. Any disputes shall be resolved through
              binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              If you have questions about these terms, please contact us at{" "}
              <a href="mailto:support@segmentor.io" className="text-[#171717] hover:underline">
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
