"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FolderKanban,
  Tag,
  Mail,
  Ticket,
  ArrowLeft,
  Shield,
  Loader2,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/plans", label: "Plans", icon: Tag },
  { href: "/admin/emails", label: "Emails", icon: Mail },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth/signin");
      return;
    }
    api
      .get<{ role: string }>("/api/auth/me")
      .then((me) => {
        if (me.role !== "admin") {
          router.replace("/dashboard/projects");
        } else {
          setAuthorized(true);
        }
      })
      .catch(() => router.replace("/auth/signin"))
      .finally(() => setChecking(false));
  }, [user, authLoading, router]);

  if (authLoading || checking || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-neutral-950">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-60 z-30 flex flex-col bg-white dark:bg-card m-2 rounded-xl border shadow-sm overflow-hidden">
        <div className="h-14 flex items-center gap-2 px-4 border-b">
          <Shield className="size-5 text-primary" />
          <span className="font-bold text-sm">Admin Panel</span>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => router.push("/dashboard/projects")}
          >
            <ArrowLeft className="size-3.5 mr-1.5" />
            Back to Dashboard
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-[calc(15rem+0.5rem)] py-2 pr-2 min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col rounded-xl border bg-background shadow-sm overflow-hidden">
          <header className="sticky top-0 z-20 h-14 flex items-center px-6 border-b bg-background">
            <h1 className="text-lg font-semibold">
              {NAV.find((n) => (n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href)))?.label || "Admin"}
            </h1>
          </header>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
