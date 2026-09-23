import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The home page has an async generateMetadata (for ?quake= deep-link
  // titles). By default Next streams that metadata *after* <head> for any
  // user agent not on its known-bot list, so link-preview scrapers and
  // Lighthouse can miss the description. Resolve it before <head> for all
  // agents — it's a no-op without ?quake= and one cached USGS call with it.
  htmlLimitedBots: /.*/,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
