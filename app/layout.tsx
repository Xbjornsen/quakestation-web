import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "QuakeStation — Live earthquake & volcano tracker",
  description:
    "Real-time global earthquake, volcano and tectonic-plate tracker on a cinematic 3D globe. Powered by the free USGS earthquake feed.",
  metadataBase: new URL("https://quakestation.com"),
  applicationName: "QuakeStation",
  keywords: [
    "earthquake tracker",
    "live earthquakes",
    "seismic activity",
    "USGS",
    "volcanoes",
    "tectonic plates",
    "3D globe",
    "earthquake map",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "QuakeStation",
    description: "Live global seismic activity on a cinematic 3D globe.",
    url: "https://quakestation.com",
    siteName: "QuakeStation",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuakeStation",
    description: "Live global seismic activity on a cinematic 3D globe.",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
