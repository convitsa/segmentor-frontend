"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { IntegrationDTO } from "@/lib/types/dto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Plug,
  ShieldCheck,
  Trash2,
  Unplug,
} from "lucide-react";

interface Props {
  projectId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function IntegrationsSettings({ projectId }: Props) {
  const [integrations, setIntegrations] = useState<IntegrationDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ integrations: IntegrationDTO[] }>(
        `/api/projects/${projectId}/integrations`
      );
      setIntegrations(res.integrations);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const polarConnected = integrations.some((i) => i.type === "polar" && i.enabled);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Integrations</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Connect payment providers to track customer purchases and link them to visitor profiles.
        </p>
      </div>

      <PolarCard
        projectId={projectId}
        connected={polarConnected}
        onUpdate={load}
      />

      {/* Future integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ComingSoonCard
          name="Stripe"
          description="Track Stripe payments and subscriptions"
          logo="/stripe-icon-logo.svg"
        />
        <ComingSoonCard
          name="Gumroad"
          description="Track Gumroad product purchases"
          logo="/gumroad-icon.svg"
        />
        <ComingSoonCard
          name="Lemon Squeezy"
          description="Track Lemon Squeezy transactions"
          logo="/lemon.svg"
        />
        <ComingSoonCard
          name="Paddle"
          description="Track Paddle payments"
          logo="/paddle-logo-vector-2022.svg"
        />
      </div>
    </div>
  );
}

function PolarCard({
  projectId,
  connected,
  onUpdate,
}: {
  projectId: string;
  connected: boolean;
  onUpdate: () => void;
}) {
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${API_URL.replace("http://localhost:4000", "https://api.segmentor.io")}/public/webhooks/polar/${projectId}`;

  async function handleConnect() {
    if (!webhookSecret.trim()) {
      toast.error("Webhook Secret is required");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/api/projects/${projectId}/integrations/polar`, {
        webhookSecret: webhookSecret.trim(),
      });
      toast.success("Polar.sh connected successfully!");
      setWebhookSecret("");
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await api.delete(`/api/projects/${projectId}/integrations/polar`);
      toast.success("Polar.sh disconnected");
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://avatars.githubusercontent.com/u/105373340?s=80"
              alt="Polar.sh"
              className="h-10 w-10 rounded-lg object-cover"
            />
            <div>
              <CardTitle className="text-base">Polar.sh</CardTitle>
              <CardDescription>
                Track payments, subscriptions, and customer revenue
              </CardDescription>
            </div>
          </div>
          {connected ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <Check className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline">Not connected</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {connected ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Webhook URL
              </Label>
              <p className="text-xs text-muted-foreground mb-1">
                Copy this URL and add it as a webhook endpoint in your Polar.sh organization: <strong>Settings &gt; Webhooks &gt; Add Endpoint</strong>. Set format to <strong>Raw</strong>.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted rounded-md px-3 py-2 text-xs font-mono break-all">
                  {webhookUrl}
                </code>
                <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Events to subscribe
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {["order.paid", "subscription.created", "subscription.canceled", "order.refunded"].map(
                  (evt) => (
                    <Badge key={evt} variant="secondary" className="text-xs font-mono">
                      {evt}
                    </Badge>
                  )
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Visitor &rarr; Purchase linking
              </Label>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <p className="font-medium flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Automatic — no code needed
                </p>
                <p>
                  Segmentor&apos;s tracking script automatically detects Polar.sh checkout links on your
                  page and appends a <code className="bg-emerald-100 dark:bg-emerald-900/50 px-1 py-0.5 rounded font-mono">reference_id</code> parameter.
                  When a purchase is made, the webhook links it back to the visitor automatically.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Unplug className="h-3.5 w-3.5 mr-1.5" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                How to connect
              </p>
              <div className="space-y-3 text-xs">
                <div>
                  <p className="font-medium text-foreground mb-1">Step 1: Create a webhook in Polar.sh</p>
                  <ol className="list-decimal list-inside space-y-0.5 pl-1">
                    <li>Open <a href="https://polar.sh" target="_blank" rel="noopener noreferrer" className="text-[#098DB9] hover:underline inline-flex items-center gap-0.5">polar.sh <ExternalLink className="h-2.5 w-2.5" /></a> and go to your organization</li>
                    <li>Navigate to <strong>Settings &gt; Webhooks</strong> in the sidebar</li>
                    <li>Click <strong>Add Endpoint</strong></li>
                    <li>Paste this webhook URL:</li>
                  </ol>
                  <div className="flex items-center gap-2 mt-1.5 ml-1">
                    <code className="flex-1 bg-muted rounded-md px-2.5 py-1.5 text-[11px] font-mono break-all">
                      {webhookUrl}
                    </code>
                    <Button variant="outline" size="sm" className="h-7 px-2 shrink-0" onClick={copyWebhookUrl}>
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Step 2: Configure the endpoint</p>
                  <ol className="list-decimal list-inside space-y-0.5 pl-1">
                    <li>Set format to <strong>Raw</strong></li>
                    <li>Set a secret (you&apos;ll paste it below)</li>
                    <li>Subscribe to: <code className="bg-muted px-1 py-0.5 rounded font-mono">order.paid</code>, <code className="bg-muted px-1 py-0.5 rounded font-mono">subscription.created</code>, <code className="bg-muted px-1 py-0.5 rounded font-mono">subscription.canceled</code>, <code className="bg-muted px-1 py-0.5 rounded font-mono">order.refunded</code></li>
                    <li>Save the endpoint</li>
                  </ol>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Step 3: Paste the secret below and connect</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="polar-secret">Webhook Secret</Label>
                <Input
                  id="polar-secret"
                  type="password"
                  placeholder="whsec_..."
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                />
              </div>
              <Button onClick={handleConnect} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Plug className="h-3.5 w-3.5 mr-1.5" />
                )}
                Connect Polar.sh
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComingSoonCard({ name, description, logo }: { name: string; description: string; logo: string }) {
  return (
    <Card className="opacity-60">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt={name}
              className="h-9 w-9 rounded-lg object-cover shrink-0"
              loading="lazy"
            />
            <div>
              <p className="font-medium text-sm">{name}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">Coming soon</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
