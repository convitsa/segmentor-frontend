"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function getDomain(urlOrDomain: string): string | null {
  try {
    const u = urlOrDomain.includes("://") ? urlOrDomain : `https://${urlOrDomain}`;
    return new URL(u).hostname;
  } catch {
    return null;
  }
}

export function Favicon({
  url,
  size = 16,
  className,
}: {
  url: string;
  size?: number;
  className?: string;
}) {
  const [error, setError] = useState(false);
  const domain = getDomain(url);

  if (!domain || error) {
    return (
      <span
        className={cn("inline-flex items-center justify-center rounded-sm bg-muted text-muted-foreground text-[10px] font-bold shrink-0", className)}
        style={{ width: size, height: size }}
      >
        {(domain || url).charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}`}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 rounded-sm", className)}
      onError={() => setError(true)}
    />
  );
}
