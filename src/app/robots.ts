import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/billing"],
        disallow: ["/dashboard/", "/admin/", "/api/"],
      },
    ],
  };
}
