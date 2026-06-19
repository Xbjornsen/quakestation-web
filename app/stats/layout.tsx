import type { Metadata } from "next";

// The stats page itself is a client component (it reads the live store), so it
// can't export metadata. This server-component layout supplies the page-specific
// title/description for crawlers and link previews instead of inheriting the
// generic homepage metadata.
export const metadata: Metadata = {
  title: "Statistics — QuakeStation",
  description:
    "Live global earthquake statistics: magnitude distribution, daily activity, depth breakdown, active swarms and volcanoes — from the free USGS feed.",
  alternates: { canonical: "/stats" },
  openGraph: {
    title: "QuakeStation — Statistics",
    description: "Live global earthquake statistics, swarms and volcanoes.",
    url: "https://quakestation.com/stats",
    siteName: "QuakeStation",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuakeStation — Statistics",
    description: "Live global earthquake statistics, swarms and volcanoes.",
  },
};

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
