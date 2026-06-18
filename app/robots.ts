import type { MetadataRoute } from "next";

const BASE = "https://quakestation.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Embed iframes aren't standalone pages worth indexing.
      disallow: "/embed/",
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
