"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { ProjectProvider } from "@/lib/project-context";
import { AppSidebar } from "@/components/app-sidebar";
import { cn } from "@/lib/utils";

const SECTION_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  visitors: "Visitors",
  personalizations: "Personalizations",
  audiences: "Audiences",
  analytics: "Analytics",
  setup: "Setup",
  settings: "Settings",
  billing: "Billing",
  integrations: "Integrations",
};

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEditorPage = pathname.includes("/editor");

  const [collapsed, setCollapsed] = useState(false);

  const isSettingsPage = pathname === "/dashboard/settings";
  const isBillingPage = pathname === "/dashboard/billing";
  const section = isSettingsPage ? "settings" : isBillingPage ? "billing" : (searchParams.get("section") || "dashboard");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      if (saved === "true") setCollapsed(true);
    } catch { /* localStorage unavailable */ }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      try {
        localStorage.setItem("sidebar_collapsed", String(!prev));
      } catch { /* localStorage unavailable */ }
      return !prev;
    });
  }, []);

  if (isEditorPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-svh bg-stone-100 dark:bg-neutral-950">
      <AppSidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      <div
        className={cn(
          "min-h-svh transition-[margin-left] duration-200 ease-in-out flex flex-col py-2 pr-2",
          collapsed ? "ml-[calc(60px+1rem)]" : "ml-[18rem]"
        )}
      >
        <div className="flex-1 flex flex-col rounded-xl border bg-background shadow-sm overflow-hidden">
          {section !== "visitors" && (
            <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 px-6 border-b bg-background">
              <span className="text-lg font-semibold">
                {SECTION_TITLES[section] || "Overview"}
              </span>
            </header>
          )}
          <main className={cn("flex-1 p-6", section === "visitors" ? "overflow-hidden" : "overflow-auto")}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SubscriptionGuard>
        <ProjectProvider>
          <Suspense fallback={null}>
            <DashboardInner>{children}</DashboardInner>
          </Suspense>
        </ProjectProvider>
      </SubscriptionGuard>
    </AuthGuard>
  );
}
