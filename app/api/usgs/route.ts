import { NextResponse } from "next/server";
import { buildUsgsUrl, parseUsgs } from "@/lib/usgs";

export const revalidate = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const minMagnitude = Number(url.searchParams.get("min") ?? 2.5);
  const days = Number(url.searchParams.get("days") ?? 1);
  const limit = Number(url.searchParams.get("limit") ?? 2000);

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);

  const usgsUrl = buildUsgsUrl({
    minMagnitude,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    limit,
  });

  try {
    const res = await fetch(usgsUrl, { next: { revalidate: 60 } });
    if (!res.ok) {
      return NextResponse.json({ error: `USGS ${res.status}` }, { status: 502 });
    }
    const raw = await res.json();
    const quakes = parseUsgs(raw);
    return NextResponse.json(
      { quakes, generated: raw.metadata?.generated ?? Date.now(), count: quakes.length },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "fetch failed" },
      { status: 500 },
    );
  }
}
