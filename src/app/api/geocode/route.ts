import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { rateLimit, clientKey } from "@/lib/rate-limit";

// Mokpo city area, roughly (left, top, right, bottom) in lon/lat.
const MOKPO_VIEWBOX = "126.30,34.95,126.50,34.70";

// Nominatim's usage policy caps automated use at ~1 request/second across
// the whole app, not per-user — so this is a module-level gate, not a
// per-client rate limit like the other routes.
let lastNominatimCallAt = 0;
const MIN_INTERVAL_MS = 1100;

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

export async function GET(request: NextRequest) {
  const { user, response } = await requireUser();
  if (!user) return response;

  if (!rateLimit(`geocode:${clientKey(request)}`, 20, 60 * 1000)) {
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const now = Date.now();
  if (now - lastNominatimCallAt < MIN_INTERVAL_MS) {
    // Fail soft: the client already has local campus results to show.
    return NextResponse.json({ results: [], throttled: true });
  }
  lastNominatimCallAt = now;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", q);
  url.searchParams.set("viewbox", MOKPO_VIEWBOX);
  url.searchParams.set("bounded", "1");
  url.searchParams.set("countrycodes", "kr");
  url.searchParams.set("limit", "6");
  url.searchParams.set("accept-language", "ko");

  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim's usage policy requires an identifying User-Agent for
        // automated clients. This is a student demo project; replace with
        // real contact details before any production/public use.
        "User-Agent": "tayo-campus-carpool-student-demo/1.0",
      },
    });
    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }
    const data = (await res.json()) as NominatimResult[];
    const results = data.map((d) => ({
      id: `nominatim-${d.place_id}`,
      name: d.display_name.split(",").slice(0, 2).join(",").trim(),
      lat: Number(d.lat),
      lng: Number(d.lon),
    }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
