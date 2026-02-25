"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  UserPlus,
  UserMinus,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  subscriptionStatus: string | null;
  subscriptionInterval: string | null;
  projectsCount: number;
  createdAt: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  pages: number;
}

function SubscriptionBadge({
  status,
  interval,
}: {
  status: string | null;
  interval: string | null;
}) {
  if (!status) {
    return <Badge variant="outline" className="bg-muted text-muted-foreground">None</Badge>;
  }
  const map: Record<string, { label: string; className: string }> = {
    active: { label: interval ? `Active (${interval})` : "Active", className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20" },
    trialing: { label: "Trial", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    past_due: { label: "Past Due", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20" },
    canceled: { label: "Canceled", className: "bg-muted text-muted-foreground" },
  };
  const info = map[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={info.className}>{info.label}</Badge>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function loadUsers() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search.trim()) params.set("search", search.trim());
    api
      .get<UsersResponse>(`/api/admin/users?${params}`)
      .then((data) => {
        setUsers(data.users);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleGrantSubscription(userId: string) {
    setActionLoading(userId);
    api
      .post(`/api/admin/users/${userId}/grant-subscription`, {})
      .then(() => {
        toast.success("Subscription granted");
        loadUsers();
      })
      .catch(() => toast.error("Failed to grant subscription"))
      .finally(() => setActionLoading(null));
  }

  function handleRevokeSubscription(userId: string) {
    if (!window.confirm("Revoke this user's subscription? They will lose access immediately.")) return;
    setActionLoading(userId);
    api
      .post(`/api/admin/users/${userId}/revoke-subscription`, {})
      .then(() => {
        toast.success("Subscription revoked");
        loadUsers();
      })
      .catch(() => toast.error("Failed to revoke subscription"))
      .finally(() => setActionLoading(null));
  }

  function handleDelete(userId: string) {
    if (!window.confirm("Delete this user? This action cannot be undone.")) return;
    setActionLoading(userId);
    api
      .delete(`/api/admin/users/${userId}`)
      .then(() => {
        toast.success("User deleted");
        loadUsers();
      })
      .catch(() => toast.error("Failed to delete user"))
      .finally(() => setActionLoading(null));
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const hasActiveSub = (u: User) =>
    u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              No users found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  <div className="grid grid-cols-[1fr_1fr_80px_140px_80px_100px_140px] gap-4 px-6 py-4 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
                    <div>Email</div>
                    <div>Name</div>
                    <div>Role</div>
                    <div>Subscription</div>
                    <div className="text-right">Projects</div>
                    <div>Joined</div>
                    <div className="text-right">Actions</div>
                  </div>
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="grid grid-cols-[1fr_1fr_80px_140px_80px_100px_140px] gap-4 px-6 py-4 border-b last:border-b-0 items-center text-sm"
                    >
                      <div className="font-medium truncate">{u.email}</div>
                      <div className="truncate text-muted-foreground">
                        {u.name || "—"}
                      </div>
                      <div>
                        <Badge variant="secondary" className="text-xs">
                          {u.role}
                        </Badge>
                      </div>
                      <div>
                        <SubscriptionBadge
                          status={u.subscriptionStatus}
                          interval={u.subscriptionInterval}
                        />
                      </div>
                      <div className="text-right tabular-nums">
                        {u.projectsCount}
                      </div>
                      <div className="text-muted-foreground">
                        {formatDate(u.createdAt)}
                      </div>
                      <div className="flex justify-end gap-1">
                        {!hasActiveSub(u) && (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            title="Grant subscription"
                            onClick={() => handleGrantSubscription(u.id)}
                            disabled={actionLoading === u.id}
                          >
                            {actionLoading === u.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <UserPlus className="size-3" />
                            )}
                          </Button>
                        )}
                        {hasActiveSub(u) && (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            title="Revoke subscription"
                            onClick={() => handleRevokeSubscription(u.id)}
                            disabled={actionLoading === u.id}
                          >
                            {actionLoading === u.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <UserMinus className="size-3" />
                            )}
                          </Button>
                        )}
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete user"
                          onClick={() => handleDelete(u.id)}
                          disabled={actionLoading === u.id}
                        >
                          {actionLoading === u.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {total} user{total !== 1 ? "s" : ""} total
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm tabular-nums">
                      Page {page} of {pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      disabled={page >= pages}
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
