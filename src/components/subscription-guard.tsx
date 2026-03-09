"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { SegiOrb } from "@/components/segi-orb";

interface SubResponse {
  subscription: {
    status: string;
  } | null;
}

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const data = await api.get<SubResponse>("/api/billing/subscription");
        if (cancelled) return;

        const status = data.subscription?.status;
        if (status === "active" || status === "trialing") {
          setActive(true);
        } else {
          router.replace("/billing");
        }
      } catch {
        router.replace("/billing");
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, [router, pathname]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SegiOrb size={48} thinking />
      </div>
    );
  }

  if (!active) return null;

  return <>{children}</>;
}
