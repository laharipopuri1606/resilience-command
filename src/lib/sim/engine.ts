import type {
  Allocation,
  AgentMessage,
  AuditEntry,
  HazardType,
  Incident,
  Needs,
  ResourceKind,
  ResourceUnit,
  Severity,
  WorldState,
  Zone,
} from "./types";

/* ------------------------------------------------------------------ */
/* deterministic PRNG so runs are reproducible + auditable             */
/* ------------------------------------------------------------------ */
let seed = 1337;
export function rng() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
export function reseed(s: number) {
  seed = s;
}

const uid = (p: string) => `${p}-${Math.floor(rng() * 1e9).toString(36)}`;
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));

function hash(input: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/* ------------------------------------------------------------------ */
/* world seed                                                          */
/* ------------------------------------------------------------------ */
const ZONE_SEED: Array<[string, number, number, number, number, number]> = [
  // name, x, y, population, elevation, vulnerability
  ["Riverfront Ward", 12, 22, 48000, 12, 0.82],
  ["Old Harbour", 30, 14, 36000, 18, 0.74],
  ["Mill Quarter", 52, 20, 41000, 34, 0.58],
  ["North Ridge", 74, 12, 22000, 78, 0.31],
  ["Canal Colony", 18, 46, 63000, 9, 0.9],
  ["Civic Centre", 44, 44, 29000, 46, 0.4],
  ["Green Belt", 68, 40, 15000, 62, 0.28],
  ["East Fields", 88, 46, 19000, 55, 0.44],
  ["Fisher Basti", 16, 72, 52000, 6, 0.94],
  ["South Depot", 40, 76, 27000, 38, 0.52],
  ["Hilltop Estate", 66, 70, 18000, 84, 0.22],
  ["Airport Belt", 88, 78, 11000, 58, 0.3],
];

const RESOURCE_SEED: Array<[ResourceKind, string, string, number, number]> = [
  ["shelter", "Civic Hall Shelter", "Civic Centre", 1800, 12],
  ["shelter", "Ridge School Shelter", "North Ridge", 1200, 20],
  ["shelter", "Hilltop Community Shelter", "Hilltop Estate", 900, 24],
  ["medical", "General Hospital Trauma", "Civic Centre", 220, 10],
  ["medical", "East Field Clinic", "East Fields", 90, 16],
  ["ambulance", "EMS Fleet Alpha", "Civic Centre", 14, 8],
  ["ambulance", "EMS Fleet Bravo", "South Depot", 9, 11],
  ["boat", "Rescue Boat Squadron", "Old Harbour", 18, 9],
  ["boat", "Marine Volunteer Boats", "Fisher Basti", 11, 5],
  ["water", "Municipal Water Tankers", "South Depot", 60, 14],
  ["food", "Community Kitchen Network", "Mill Quarter", 22000, 18],
  ["volunteer", "Registered Volunteer Corps", "Civic Centre", 640, 7],
  ["power", "Grid Restoration Crews", "Airport Belt", 12, 22],
];

const emptyNeeds = (): Needs => ({
  shelter: 0,
  medical: 0,
  water: 0,
  food: 0,
  rescue: 0,
  power: 0,
});

export function createWorld(hazard: HazardType = "flood"): WorldState {
  reseed(20260821);
  const zones: Zone[] = ZONE_SEED.map(([name, x, y, population, elevation, vulnerability], i) => ({
    id: `z${i + 1}`,
    name,
    x,
    y,
    population,
    elevation,
    vulnerability,
    hazard: 0,
    impact: 0,
    priority: 0,
    accessible: true,
    needs: emptyNeeds(),
    unmet: 0,
  }));

  const resources: ResourceUnit[] = RESOURCE_SEED.map(
    ([kind, label, baseZone, capacity, etaBase], i) => ({
      id: `r${i + 1}`,
      kind,
      label,
      baseZone,
      capacity,
      committed: 0,
      etaBase,
    }),
  );

  return {
    tick: 0,
    hazard,
    intensity: 0.35,
    running: true,
    zones,
    resources,
    incidents: [],
    messages: [
      {
        id: uid("m"),
        tick: 0,
        agent: "comms",
        level: "info",
        text: "Autonomous command mesh online. 8 agents negotiating without operator input.",
      },
    ],
    allocations: [],
    audit: [],
    kpi: { peopleAtRisk: 0, coverage: 0, avgEta: 0, unmetNeed: 0, decisions: 0 },
  };
}

/* ------------------------------------------------------------------ */
/* hazard physics per scenario                                          */
/* ------------------------------------------------------------------ */
function hazardExposure(hazard: HazardType, z: Zone, tick: number, intensity: number) {
  const wave = 0.5 + 0.5 * Math.sin((tick + z.x) / 9);
  switch (hazard) {
    case "flood":
      return clamp(intensity * ((100 - z.elevation) / 100) * (0.75 + 0.4 * wave));
    case "cyclone":
      return clamp(intensity * (0.4 + (100 - z.x) / 160) * (0.7 + 0.5 * wave));
    case "fire":
      return clamp(intensity * (0.3 + z.elevation / 130) * (0.6 + 0.7 * wave));
    case "heatwave":
      return clamp(intensity * (0.5 + z.vulnerability * 0.6));
    case "quake":
      return clamp(intensity * (0.4 + z.vulnerability * 0.5) * (0.8 + 0.4 * wave));
  }
}

const CITIZEN_TEXT: Record<HazardType, string[]> = {
  flood: [
    "Water up to waist level, elderly stuck on first floor",
    "Drain overflow, lane impassable for two-wheelers",
    "Family of six on rooftop, requesting boat",
    "Drinking water contaminated, children unwell",
  ],
  cyclone: [
    "Roof sheets flying, shelter needed for 20 people",
    "Tree fell on transformer, no power since morning",
    "Coastal hamlet cut off, radio only contact",
    "Pregnant woman needs transport to hospital",
  ],
  fire: [
    "Smoke spreading across the ridge line",
    "Warehouse blaze, chemical smell reported",
    "Evacuation route blocked by burning debris",
    "Breathing difficulty cases rising in colony",
  ],
  heatwave: [
    "Two heatstroke cases at the bus terminus",
    "Water tanker has not arrived for 3 days",
    "Outdoor workers collapsing near market",
    "Elderly home without cooling since 11:00",
  ],
  quake: [
    "Building partially collapsed, people trapped",
    "Gas leak smell in the residential block",
    "Bridge approach cracked, vehicles stopped",
    "Aftershock panic, crowd at open ground",
  ],
};

const SENSOR_TEXT: Record<HazardType, string[]> = {
  flood: ["River gauge +2.4m over danger mark", "Pump station telemetry offline"],
  cyclone: ["Anemometer 118 km/h sustained gust", "Barometric drop 14 hPa in 3h"],
  fire: ["Thermal satellite hotspot cluster detected", "PM2.5 at 412 µg/m³"],
  heatwave: ["Wet-bulb temperature 33.1 °C", "Grid load at 97% of capacity"],
  quake: ["Seismograph aftershock M4.1", "Structural strain sensor threshold breach"],
};

function severityOf(v: number): Severity {
  if (v > 0.78) return "critical";
  if (v > 0.55) return "severe";
  if (v > 0.3) return "moderate";
  return "watch";
}

/* ------------------------------------------------------------------ */
/* the multi-agent tick                                                */
/* ------------------------------------------------------------------ */
export function step(prev: WorldState): WorldState {
  const tick = prev.tick + 1;
  const msgs: AgentMessage[] = [];
  const audit: AuditEntry[] = [];
  const say = (agent: AgentMessage["agent"], level: AgentMessage["level"], text: string) =>
    msgs.push({ id: uid("m"), tick, agent, level, text });
  const log = (actor: AuditEntry["actor"], action: string, detail: string) =>
    audit.push({
      id: uid("a"),
      tick,
      actor,
      action,
      detail,
      hash: hash(`${tick}|${actor}|${action}|${detail}`),
    });

  /* scenario driver drifts on its own — no operator required */
  const drift = Math.sin(tick / 14) * 0.035 + (rng() - 0.48) * 0.03;
  const intensity = clamp(prev.intensity + drift, 0.08, 1);

  /* --- AGENT 1: INTAKE — citizen reports + simulated sensors -------- */
  const incidents: Incident[] = [];
  const reportCount = 1 + Math.floor(rng() * (1 + intensity * 4));
  for (let i = 0; i < reportCount; i++) {
    const z = prev.zones[Math.floor(rng() * prev.zones.length)]!;
    const isSensor = rng() < 0.38;
    const pool = isSensor ? SENSOR_TEXT[prev.hazard] : CITIZEN_TEXT[prev.hazard];
    const exposure = hazardExposure(prev.hazard, z, tick, intensity);
    const confidence = clamp(isSensor ? 0.75 + rng() * 0.24 : 0.35 + rng() * 0.5);
    incidents.push({
      id: uid("i"),
      tick,
      zoneId: z.id,
      source: isSensor ? "sensor" : rng() < 0.2 ? "responder" : "citizen",
      hazard: prev.hazard,
      text: pool[Math.floor(rng() * pool.length)]!,
      confidence,
      severity: severityOf(clamp(exposure * (0.6 + confidence * 0.6))),
      verified: confidence > 0.7,
    });
  }
  const corroborated = incidents.filter((i) => i.verified).length;
  say(
    "intake",
    "info",
    `Ingested ${incidents.length} reports (${corroborated} auto-corroborated by sensor cross-check).`,
  );
  log("intake", "INGEST", `${incidents.length} reports normalised and geo-tagged`);

  /* --- AGENT 2: IMPACT — affected area + impact scoring ------------- */
  const recent = [...prev.incidents.slice(-60), ...incidents];
  const zones: Zone[] = prev.zones.map((z) => {
    const exposure = hazardExposure(prev.hazard, z, tick, intensity);
    const reports = recent.filter((r) => r.zoneId === z.id);
    const signal = clamp(reports.reduce((s, r) => s + r.confidence, 0) / 6);
    const hazardLevel = clamp(exposure * 0.72 + signal * 0.28);
    const impact = Math.round(
      clamp(hazardLevel * (0.55 + z.vulnerability * 0.45) * (0.6 + Math.log10(z.population) / 12)) *
        100,
    );
    return { ...z, hazard: hazardLevel, impact, accessible: hazardLevel < 0.72 };
  });
  const hotZones = zones.filter((z) => z.impact > 55);
  say(
    "impact",
    hotZones.length > 3 ? "alert" : "info",
    `Impact model recomputed: ${hotZones.length} zones above damage threshold, hazard driver at ${(intensity * 100).toFixed(0)}%.`,
  );
  log("impact", "SCORE", `impact recomputed for ${zones.length} zones`);

  /* --- AGENT 3: NEEDS — resident need estimation -------------------- */
  for (const z of zones) {
    const exposed = z.population * z.hazard;
    z.needs = {
      shelter: Math.round(exposed * 0.22 * (0.6 + z.vulnerability)),
      medical: Math.round(exposed * 0.018 * (0.5 + z.vulnerability)),
      water: Math.round(exposed * 0.4),
      food: Math.round(exposed * 0.55),
      rescue: Math.round(exposed * (z.accessible ? 0.004 : 0.021)),
      power: Math.round(z.hazard * 10),
    };
  }
  const totalShelter = zones.reduce((s, z) => s + z.needs.shelter, 0);
  say(
    "needs",
    "info",
    `Need profile: ${totalShelter.toLocaleString()} shelter spaces, ${zones
      .reduce((s, z) => s + z.needs.rescue, 0)
      .toLocaleString()} rescue cases projected.`,
  );

  /* --- AGENT 4: TRIAGE — priority ranking --------------------------- */
  for (const z of zones) {
    z.priority = Math.round(
      Math.min(
        100,
        clamp(z.impact / 100) * 55 +
          z.vulnerability * 25 +
          (z.accessible ? 0 : 12) +
          clamp(z.needs.rescue / 400) * 8,
      ),
    );
  }
  const ranked = [...zones].sort((a, b) => b.priority - a.priority);
  say(
    "triage",
    "action",
    `Priority queue re-ordered. Lead: ${ranked[0]!.name} (P${ranked[0]!.priority}), then ${ranked[1]!.name} (P${ranked[1]!.priority}).`,
  );
  log("triage", "RANK", `top=${ranked[0]!.name} p=${ranked[0]!.priority}`);

  /* --- AGENT 5: MATCHER — resource matching + commitments ----------- */
  const resources: ResourceUnit[] = prev.resources.map((r) => ({
    ...r,
    committed: Math.max(0, Math.round(r.committed * 0.88)), // release as ops complete
  }));
  const allocations: Allocation[] = [];
  const NEED_TO_KIND: Array<[keyof Needs, ResourceKind, number]> = [
    ["rescue", "boat", 12],
    ["medical", "ambulance", 6],
    ["medical", "medical", 40],
    ["shelter", "shelter", 400],
    ["water", "water", 3000],
    ["food", "food", 5000],
    ["power", "power", 4],
  ];

  for (const z of ranked.slice(0, 6)) {
    for (const [need, kind, perUnit] of NEED_TO_KIND) {
      const demand = z.needs[need];
      if (demand < perUnit * 0.4) continue;
      const pool = resources
        .filter((r) => r.kind === kind && r.capacity - r.committed > 0)
        .sort((a, b) => a.etaBase - b.etaBase);
      if (!pool.length) continue;
      const r = pool[0]!;
      const want = Math.ceil(demand / perUnit);
      const units = Math.min(want, r.capacity - r.committed);
      if (units <= 0) continue;
      r.committed += units;

      /* --- AGENT 6: ROUTER — dynamic routing around blocked links --- */
      const blocked = !z.accessible;
      const detour = blocked ? 1.75 : 1 + z.hazard * 0.5;
      const eta = Math.round(r.etaBase * detour + (z.priority > 70 ? -2 : 2));
      allocations.push({
        id: uid("d"),
        tick,
        zoneId: z.id,
        resourceId: r.id,
        kind,
        units,
        eta: Math.max(3, eta),
        route: blocked
          ? `${r.baseZone} → ridge bypass → ${z.name} (primary link submerged/blocked)`
          : `${r.baseZone} → arterial corridor → ${z.name}`,
        status: blocked ? "rerouted" : "dispatched",
        rationale: `P${z.priority} zone, ${demand.toLocaleString()} ${need} demand, nearest available capacity at ETA ${eta}m`,
      });
    }
  }
  say(
    "matcher",
    allocations.length ? "action" : "info",
    `Committed ${allocations.length} resource packages across ${new Set(allocations.map((a) => a.zoneId)).size} priority zones.`,
  );
  const reroutes = allocations.filter((a) => a.status === "rerouted").length;
  if (reroutes)
    say(
      "router",
      "alert",
      `${reroutes} convoys auto-rerouted: primary corridors failed accessibility check this cycle.`,
    );
  else say("router", "info", "All corridors passable; shortest-path dispatch retained.");
  for (const a of allocations)
    log("matcher", "DISPATCH", `${a.units}× ${a.kind} → ${zones.find((z) => z.id === a.zoneId)?.name} eta ${a.eta}m`);

  /* --- coverage + unmet need ---------------------------------------- */
  for (const z of zones) {
    const served = allocations
      .filter((a) => a.zoneId === z.id)
      .reduce((s, a) => s + a.units, 0);
    const demandUnits = Math.max(1, Math.round(z.needs.shelter / 400 + z.needs.rescue / 12 + z.needs.water / 3000));
    z.unmet = Math.round(clamp(1 - served / demandUnits) * 100);
  }

  const peopleAtRisk = Math.round(zones.reduce((s, z) => s + z.population * z.hazard, 0));
  const avgEta = allocations.length
    ? Math.round(allocations.reduce((s, a) => s + a.eta, 0) / allocations.length)
    : prev.kpi.avgEta;
  const demandTotal = zones.reduce(
    (s, z) => s + z.needs.shelter / 400 + z.needs.rescue / 12 + z.needs.water / 3000 + z.needs.medical / 40,
    0,
  );
  const servedTotal = allocations.reduce((s, a) => s + a.units, 0);
  const unmetNeed = Math.round(clamp(1 - servedTotal / Math.max(1, demandTotal)) * 100);
  const coverage = 100 - unmetNeed;

  if (unmetNeed > 55)
    say(
      "comms",
      "alert",
      `Unmet need at ${unmetNeed}% — volunteer corps auto-mobilised and mutual-aid request broadcast to neighbouring districts.`,
    );

  /* --- AGENT 8: AUDIT ------------------------------------------------ */
  log("audit", "SEAL", `cycle ${tick} sealed · ${allocations.length} actions · coverage ${coverage}%`);

  return {
    ...prev,
    tick,
    intensity,
    zones,
    resources,
    incidents: [...prev.incidents, ...incidents].slice(-200),
    messages: [...prev.messages, ...msgs].slice(-200),
    allocations: [...prev.allocations, ...allocations].slice(-160),
    audit: [...prev.audit, ...audit].slice(-200),
    kpi: {
      peopleAtRisk,
      coverage,
      avgEta,
      unmetNeed,
      decisions: prev.kpi.decisions + allocations.length + msgs.length,
    },
  };
}

/* ------------------------------------------------------------------ */
/* what-if analysis: fork the world and fast-forward                   */
/* ------------------------------------------------------------------ */
export interface WhatIfResult {
  label: string;
  coverage: number;
  unmet: number;
  avgEta: number;
  peopleAtRisk: number;
}

export function whatIf(
  base: WorldState,
  label: string,
  mutate: (w: WorldState) => WorldState,
  horizon = 8,
): WhatIfResult {
  const saved = seed;
  let w = mutate({
    ...base,
    zones: base.zones.map((z) => ({ ...z, needs: { ...z.needs } })),
    resources: base.resources.map((r) => ({ ...r })),
    messages: [],
    audit: [],
    allocations: [],
    incidents: [...base.incidents],
  });
  for (let i = 0; i < horizon; i++) w = step(w);
  seed = saved;
  return {
    label,
    coverage: w.kpi.coverage,
    unmet: w.kpi.unmetNeed,
    avgEta: w.kpi.avgEta,
    peopleAtRisk: w.kpi.peopleAtRisk,
  };
}

export const AGENT_META: Record<
  string,
  { name: string; role: string; color: string }
> = {
  intake: { name: "Intake Agent", role: "Citizen reports + sensor fusion", color: "var(--color-agent-1)" },
  impact: { name: "Impact Agent", role: "Affected-area & damage modelling", color: "var(--color-agent-2)" },
  needs: { name: "Needs Agent", role: "Resident need estimation", color: "var(--color-agent-3)" },
  triage: { name: "Triage Agent", role: "Priority ranking", color: "var(--color-agent-4)" },
  matcher: { name: "Matching Agent", role: "Resource commitment", color: "var(--color-agent-5)" },
  router: { name: "Routing Agent", role: "Dynamic corridors & ETA", color: "var(--color-agent-6)" },
  comms: { name: "Coordination Agent", role: "Mutual aid & broadcast", color: "var(--color-agent-7)" },
  audit: { name: "Audit Agent", role: "Immutable action ledger", color: "var(--color-agent-8)" },
};
