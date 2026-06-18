import type { MetadataRoute } from "next";

const BASE = "https://quakestation.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/stats`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
  ];
}
