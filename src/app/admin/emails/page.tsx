"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, Mail } from "lucide-react";

const TEMPLATES = [
  { value: "onboardingDay1", label: "Onboarding - Day 1 (Setup Guide)" },
  { value: "onboardingDay3", label: "Onboarding - Day 3 (Feature Tips)" },
  { value: "onboardingDay7", label: "Onboarding - Day 7 (Check-in)" },
  { value: "inactiveReminder", label: "Inactive Reminder" },
  { value: "trialEnding", label: "Trial / Subscription Ending" },
  { value: "featureAnnouncement", label: "Feature Announcement" },
  { value: "reviewRequest", label: "Review / Feedback Request" },
  { value: "winBack", label: "Win-Back (Post-Cancellation)" },
];

const FILTERS = [
  { value: "all", label: "All Users" },
  { value: "active", label: "Active Subscribers" },
  { value: "inactive_7d", label: "Inactive (7+ days)" },
  { value: "canceled", label: "Canceled Subscribers" },
  { value: "no_subscription", label: "No Subscription" },
];

export default function AdminEmailsPage() {
  const [template, setTemplate] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [daysLeft, setDaysLeft] = useState(3);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);

  const isAnnouncement = template === "featureAnnouncement";
  const isTrialEnding = template === "trialEnding";

  async function handleSend() {
    if (!template || !recipientFilter) {
      toast.error("Select a template and recipient filter");
      return;
    }
    if (isAnnouncement && (!title || !body)) {
      toast.error("Title and body are required for announcements");
      return;
    }

    const confirmMsg = `Send "${TEMPLATES.find((t) => t.value === template)?.label}" to ${FILTERS.find((f) => f.value === recipientFilter)?.label}?`;
    if (!window.confirm(confirmMsg)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await api.post<{ sent: number; total: number }>("/api/admin/emails/send", {
        template,
        recipientFilter,
        customFields: {
          ...(isAnnouncement ? { title, body } : {}),
          ...(isTrialEnding ? { daysLeft } : {}),
        },
      });
      setResult(res);
      toast.success(`Sent ${res.sent} emails`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Marketing Emails</h2>
        <p className="text-muted-foreground text-sm mt-1">Send marketing emails to filtered user groups</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email Template</label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Recipients</label>
              <Select value={recipientFilter} onValueChange={setRecipientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose recipients..." />
                </SelectTrigger>
                <SelectContent>
                  {FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAnnouncement && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Announcement Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New Feature: A/B Testing" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Announcement Body</label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Describe the new feature..."
                  />
                </div>
              </>
            )}

            {isTrialEnding && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Days Left</label>
                <Input type="number" value={daysLeft} onChange={(e) => setDaysLeft(parseInt(e.target.value) || 0)} min={1} max={30} />
              </div>
            )}

            <Button className="w-full" onClick={handleSend} disabled={sending || !template || !recipientFilter}>
              {sending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
              {sending ? "Sending..." : "Send Emails"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="size-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Send Result</h3>
            </div>

            {result ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="text-sm px-3 py-1">
                    {result.sent} sent
                  </Badge>
                  <span className="text-sm text-muted-foreground">of {result.total} recipients</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Emails are being delivered via Resend. Delivery may take a few minutes.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a template and recipients, then click Send. The result will appear here.
              </p>
            )}

            <div className="mt-6 pt-4 border-t">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Available Templates</h4>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map((t) => (
                  <Badge key={t.value} variant="outline" className="text-xs">
                    {t.label}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
