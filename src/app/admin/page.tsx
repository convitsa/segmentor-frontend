"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CreditCard, FolderKanban, BarChart3, DollarSign, Loader2 } from "lucide-react";

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  mrr: number;
  totalProjects: number;
  totalEvents: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Stats>("/api/admin/stats").then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "Total Users", value: stats.totalUsers.toLocaleString(), icon: Users, color: "text-foreground" },
    { label: "Active Subscriptions", value: stats.activeSubscriptions.toLocaleString(), icon: CreditCard, color: "text-green-500" },
    { label: "MRR", value: `$${(stats.mrr / 100).toFixed(2)}`, icon: DollarSign, color: "text-primary" },
    { label: "Total Projects", value: stats.totalProjects.toLocaleString(), icon: FolderKanban, color: "text-orange-500" },
    { label: "Total Events", value: stats.totalEvents.toLocaleString(), icon: BarChart3, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground text-sm mt-1">Global platform statistics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
                <card.icon className={`size-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
