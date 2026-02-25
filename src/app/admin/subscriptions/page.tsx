"use client";

import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Subscription {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  planName: string;
  status: string;
  interval: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionsResponse {
  subscriptions: Subscription[];
  total: number;
  pages: number;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "canceled", label: "Canceled" },
  { value: "past_due", label: "Past Due" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "active"
      ? "default"
      : status === "canceled"
        ? "destructive"
        : status === "past_due"
          ? "destructive"
          : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchSubscriptions = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    api
      .get<SubscriptionsResponse>(`/api/admin/subscriptions?${params}`)
      .then((data) => {
        setSubscriptions(data.subscriptions);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [page, statusFilter]);

  const handleExtend = async (id: string) => {
    setActioningId(id);
    try {
      await api.patch(`/api/admin/subscriptions/${id}`, { extendDays: 30 });
      toast.success("Subscription extended by 30 days");
      fetchSubscriptions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to extend");
    } finally {
      setActioningId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActioningId(id);
    try {
      await api.patch(`/api/admin/subscriptions/${id}`, { status: "canceled" });
      toast.success("Subscription canceled");
      fetchSubscriptions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Subscriptions</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage user subscriptions
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-[1fr_1fr_80px_100px_120px_100px_140px] gap-4 px-2 py-3 text-sm font-medium text-muted-foreground border-b">
                    <div>User Email</div>
                    <div>Plan</div>
                    <div>Interval</div>
                    <div>Status</div>
                    <div>Period End</div>
                    <div>Cancel at End</div>
                    <div className="text-right">Actions</div>
                  </div>
                  {subscriptions.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      No subscriptions found
                    </div>
                  ) : (
                    subscriptions.map((sub) => (
                      <div
                        key={sub.id}
                        className="grid grid-cols-[1fr_1fr_80px_100px_120px_100px_140px] gap-4 px-2 py-3 text-sm items-center border-b last:border-0"
                      >
                        <div>{sub.userEmail}</div>
                        <div>{sub.planName}</div>
                        <div>{sub.interval}</div>
                        <div>
                          <StatusBadge status={sub.status} />
                        </div>
                        <div>{formatDate(sub.currentPeriodEnd)}</div>
                        <div>{sub.cancelAtPeriodEnd ? "Yes" : "No"}</div>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actioningId !== null}
                            onClick={() => handleExtend(sub.id)}
                          >
                            {actioningId === sub.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              "Extend 30d"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={
                              actioningId !== null || sub.status === "canceled"
                            }
                            onClick={() => handleCancel(sub.id)}
                          >
                            {actioningId === sub.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              "Cancel"
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {pages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {total} total
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm">
                      Page {page} of {pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
