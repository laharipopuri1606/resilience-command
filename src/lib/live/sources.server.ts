import type { DisasterEvent, LiveHazard, LiveSeverity } from "./types";

function sev(score: number): LiveSeverity {
  if (score >= 0.8) return "critical";
  if (score >= 0.6) return "severe";
  if (score >= 0.35) return "moderate";
  return "watch";
}

async function getJson(url: string, ms = 9000): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(ms),
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** USGS — all earthquakes M2.5+ in the past day, worldwide. */
async function usgs(): Promise<DisasterEvent[]> {
  const data = (await getJson(
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
  )) as { features?: unknown[] } | null;
  const features = (data?.features ?? []) as unknown as Array<{
    id: string;
    properties: { mag: number | null; place: string; time: number; url: string; title: string };
    geometry: { coordinates: [number, number, number] };
  }>;
  return features.map((f) => {
    const mag = f.properties.mag ?? 0;
    return {
      id: `usgs-${f.id}`,
      source: "USGS" as const,
      hazard: "earthquake" as LiveHazard,
      title: f.properties.title,
      place: f.properties.place ?? "Unknown location",
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      magnitude: mag,
      severity: sev((mag - 2.5) / 4.5),
      time: new Date(f.properties.time).toISOString(),
      url: f.properties.url,
    };
  });
}

const EONET_MAP: Record<string, LiveHazard> = {
  wildfires: "wildfire",
  severeStorms: "cyclone",
  floods: "flood",
  volcanoes: "volcano",
  drought: "drought",
  earthquakes: "earthquake",
};

/** NASA EONET — open natural events worldwide. */
async function eonet(): Promise<DisasterEvent[]> {
  const data = (await getJson(
    "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=120&days=10",
  )) as {
    events?: Array<{
      id: string;
      title: string;
      link: string;
      categories: Array<{ id: string; title: string }>;
      geometry: Array<{ date: string; type: string; coordinates: number[] | number[][][] }>;
    }>;
  } | null;

  const out: DisasterEvent[] = [];
  for (const ev of data?.events ?? []) {
    const g = ev.geometry[ev.geometry.length - 1];
    if (!g) continue;
    let lon: number | undefined;
    let lat: number | undefined;
    if (g.type === "Point") {
      const c = g.coordinates as number[];
      lon = c[0];
      lat = c[1];
    } else {
      const ring = (g.coordinates as number[][][])[0];
      if (!ring?.length) continue;
      lon = ring.reduce((s, p) => s + (p[0] ?? 0), 0) / ring.length;
      lat = ring.reduce((s, p) => s + (p[1] ?? 0), 0) / ring.length;
    }
    if (lat === undefined || lon === undefined) continue;
    const cat = ev.categories[0]?.id ?? "other";
    out.push({
      id: `eonet-${ev.id}`,
      source: "EONET",
      hazard: EONET_MAP[cat] ?? "other",
      title: ev.title,
      place: ev.title,
      lat,
      lon,
      magnitude: null,
      severity: "moderate",
      time: g.date,
      url: ev.link,
    });
  }
  return out;
}

const GDACS_MAP: Record<string, LiveHazard> = {
  EQ: "earthquake",
  TC: "cyclone",
  FL: "flood",
  VO: "volcano",
  DR: "drought",
  WF: "wildfire",
};

/** GDACS — global multi-hazard alerts with red/orange/green alert levels. */
async function gdacs(): Promise<DisasterEvent[]> {
  const data = (await getJson(
    "https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventlist=EQ;TC;FL;VO;DR;WF",
  )) as {
    features?: Array<{
      properties: Record<string, unknown>;
      geometry: { coordinates: [number, number] };
    }>;
  } | null;

  return (data?.features ?? [])
    .map((f) => {
      const p = f.properties;
      const type = String(p["eventtype"] ?? "");
      const alert = String(p["alertlevel"] ?? "Green").toLowerCase();
      const id = `${type}-${String(p["eventid"] ?? "")}`;
      return {
        id: `gdacs-${id}`,
        source: "GDACS" as const,
        hazard: GDACS_MAP[type] ?? ("other" as LiveHazard),
        title: String(p["htmldescription"] ?? p["name"] ?? "GDACS event").replace(/<[^>]*>/g, ""),
        place: String(p["country"] ?? p["name"] ?? "Unknown location"),
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        magnitude: typeof p["severitydata"] === "object" && p["severitydata"] !== null
          ? Number((p["severitydata"] as { severity?: number }).severity ?? 0) || null
          : null,
        severity: (alert === "red" ? "critical" : alert === "orange" ? "severe" : "moderate") as LiveSeverity,
        time: String(p["fromdate"] ?? new Date().toISOString()),
        url: String(p["url"] ?? "https://www.gdacs.org"),
      };
    })
    .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lon));
}

export async function loadLiveDisasters(): Promise<{
  events: DisasterEvent[];
  sources: { name: string; count: number }[];
  fetchedAt: string;
}> {
  const [a, b, c] = await Promise.all([usgs(), gdacs(), eonet()]);
  const seen = new Set<string>();
  const events = [...a, ...b, ...c]
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .sort((x, y) => Date.parse(y.time) - Date.parse(x.time));

  return {
    events,
    sources: [
      { name: "USGS", count: a.length },
      { name: "GDACS", count: b.length },
      { name: "EONET", count: c.length },
    ],
    fetchedAt: new Date().toISOString(),
  };
}
