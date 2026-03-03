"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { ProjectProvider } from "@/lib/project-context";
import { AppSidebar } from "@/components/app-sidebar";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const SECTION_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  visitors: "Visitors",
  personalizations: "Personalizations",
  audiences: "Audiences",
  analytics: "Analytics",
  recordings: "Session Recordings",
  setup: "Setup",
  settings: "Settings",
  billing: "Billing",
  integrations: "Integrations",
  chat: "",
};

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEditorPage = pathname.includes("/editor");

  const [collapsed, setCollapsed] = useState(false);
  const [chatTitle, setChatTitle] = useState<string>("");

  const isSettingsPage = pathname === "/dashboard/settings";
  const isBillingPage = pathname === "/dashboard/billing";
  const section = isSettingsPage ? "settings" : isBillingPage ? "billing" : (searchParams.get("section") || "dashboard");
  const conversationId = searchParams.get("conversationId");
  const isChat = section === "chat";

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      if (saved === "true") setCollapsed(true);
    } catch { /* localStorage unavailable */ }
  }, []);

  useEffect(() => {
    if (isChat && conversationId) {
      const token = typeof window !== "undefined" ? localStorage.getItem("segmentor_token") : null;
      const projectId = pathname.split("/projects/")[1]?.split("/")[0] || pathname.split("/projects/")[1];
      if (projectId && token) {
        fetch(`${API_URL}/api/projects/${projectId}/segi/conversations/${conversationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.conversation?.title) setChatTitle(data.conversation.title);
          })
          .catch(() => {});
      }
    } else {
      setChatTitle("");
    }
  }, [isChat, conversationId, pathname]);

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

  const hideHeader = section === "visitors";

  return (
    <div className="h-svh bg-[#2a2a2a] overflow-hidden">
      <AppSidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      <div
        className={cn(
          "h-svh transition-[margin-left] duration-200 ease-in-out flex flex-col py-2 pr-2",
          collapsed ? "ml-[calc(60px+1rem)]" : "ml-[18rem]"
        )}
      >
        <div className="flex-1 flex flex-col rounded-xl border bg-[#343434] shadow-sm overflow-hidden min-h-0">
          {!hideHeader && (
            <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 px-6 border-b bg-background dark:bg-[#343434]">
              <span className="text-lg font-semibold truncate">
                {isChat ? (chatTitle || "New chat") : (SECTION_TITLES[section] || "Overview")}
              </span>
              {isChat && conversationId && (
                <Button variant="outline" size="sm" className="text-xs h-8 shrink-0">
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export
                </Button>
              )}
            </header>
          )}
          <main className={cn(
            "flex-1 min-h-0",
            isChat ? "overflow-hidden" : section === "visitors" ? "overflow-hidden" : "overflow-auto p-6"
          )}>
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
