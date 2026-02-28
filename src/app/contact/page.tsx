"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Message sent! We'll get back to you soon.");
  }

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
        <section className="pt-20 pb-20 sm:pt-28 sm:pb-28">
          <div className="text-center mb-14">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-tight">
              Contact <span className="text-[#171717]">us</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg mx-auto">
              Have a question or need help? We&apos;d love to hear from you.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Form */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-border/50 bg-card p-7 sm:p-8">
                {submitted ? (
                  <div className="py-12 text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-[#171717]/8 text-[#171717] mx-auto mb-5">
                      <Send className="size-6" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Message sent!</h3>
                    <p className="text-[15px] text-muted-foreground">
                      We&apos;ll get back to you within 24 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" placeholder="Your name" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="you@example.com" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="How can we help?"
                        rows={5}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full h-11 rounded-full">
                      Send message
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {/* Info cards */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/50 bg-card p-6">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#171717]/8 text-[#171717] mb-4">
                  <Mail className="size-5" />
                </div>
                <h3 className="text-sm font-semibold mb-1">Email us</h3>
                <a
                  href="mailto:support@segmentor.io"
                  className="text-sm text-[#171717] hover:underline"
                >
                  support@segmentor.io
                </a>
              </div>

              <div className="rounded-2xl border border-border/50 bg-card p-6">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#171717]/8 text-[#171717] mb-4">
                  <Clock className="size-5" />
                </div>
                <h3 className="text-sm font-semibold mb-1">Response time</h3>
                <p className="text-sm text-muted-foreground">
                  We typically respond within 24 hours on business days.
                </p>
              </div>
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
