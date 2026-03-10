"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { ProjectProvider } from "@/lib/project-context";
import { AppSidebar } from "@/components/app-sidebar";
import { cn } from "@/lib/utils";
import { Download, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegiOrb } from "@/components/segi-orb";

const SECTION_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  visitors: "Visitors",
  personalizations: "Personalizations",
  audiences: "Audiences",
  analytics: "Analytics",
  heatmaps: "Heatmaps",
  recordings: "Session Recordings",
  setup: "Setup",
  settings: "Settings",
  billing: "Billing",
  integrations: "Integrations",
  chat: "",
};

function MobileOverlay() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#1a1a1a] flex flex-col items-center justify-center px-8 text-center gap-6">
      <SegiOrb size={72} />
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Desktop Experience Only</h2>
        <p className="text-sm text-[#999] max-w-xs leading-relaxed">
          Segmentor is built for desktop browsers. Open this page on your computer for the best experience.
        </p>
      </div>
      <div className="flex items-center gap-2 mt-2 px-4 py-2.5 rounded-lg bg-[#2a2a2a] border border-[#444]">
        <Monitor className="h-4 w-4 text-[#999]" />
        <span className="text-xs text-[#bbb]">app.segmentor.io</span>
      </div>
    </div>
  );
}

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
    if (!isChat) { setChatTitle(""); return; }
    const handler = (e: Event) => {
      const title = (e as CustomEvent<string>).detail;
      setChatTitle(title || "");
    };
    window.addEventListener("segi-title-updated", handler);
    return () => window.removeEventListener("segi-title-updated", handler);
  }, [isChat]);

  useEffect(() => {
    if (!isChat || !conversationId) setChatTitle("");
  }, [isChat, conversationId]);

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
      <MobileOverlay />
      <AppSidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      <div
        className={cn(
          "h-svh transition-[margin-left] duration-200 ease-in-out flex flex-col py-2 pr-2",
          collapsed ? "ml-[calc(60px+1rem)]" : "ml-[18rem]"
        )}
      >
        <div className="flex-1 flex flex-col rounded-xl border bg-[#343434] shadow-sm overflow-hidden min-h-0">
          {!hideHeader && (
            <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 px-[18px] border-b dark:border-[#484848] bg-background dark:bg-[#343434]">
              <span className="text-base font-normal truncate dark:text-[#C2C0B6]">
                {isChat ? (chatTitle || "New chat") : (SECTION_TITLES[section] || "Overview")}
              </span>
              {isChat && conversationId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 shrink-0"
                  onClick={() => window.dispatchEvent(new CustomEvent("segi-export"))}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export
                </Button>
              )}
            </header>
          )}
          <main className={cn(
            "flex-1 min-h-0",
            isChat ? "overflow-hidden" : section === "visitors" ? "relative overflow-hidden" : "overflow-auto p-6"
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
