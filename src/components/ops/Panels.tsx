import type { WhatIfResult } from "@/lib/sim/engine";
import type { HazardType, WorldState } from "@/lib/sim/types";

const HAZARDS: Array<[HazardType, string]> = [
  ["flood", "Flood"],
  ["cyclone", "Cyclone"],
  ["fire", "Wildfire"],
  ["heatwave", "Heatwave"],
  ["quake", "Earthquake"],
];

export function KpiStrip({ world }: { world: WorldState }) {
  const k = world.kpi;
  const items = [
    ["People at risk", k.peopleAtRisk.toLocaleString(), "critical"],
    ["Need coverage", `${k.coverage}%`, k.coverage > 60 ? "ok" : "severe"],
    ["Unmet need", `${k.unmetNeed}%`, k.unmetNeed > 50 ? "severe" : "moderate"],
    ["Avg response ETA", `${k.avgEta} min`, "watch"],
    ["Autonomous decisions", k.decisions.toLocaleString(), "ok"],
    ["Cycle", `T${world.tick}`, "watch"],
  ] as const;

  return (
    <div className="grid gap-px overflow-hidden rounded-lg bg-panel-edge sm:grid-cols-3 lg:grid-cols-6">
      {items.map(([label, value, t]) => (
        <div key={label} className="bg-panel px-4 py-3">
          <p className="label-xs">{label}</p>
          <p
            className="font-display text-xl font-semibold tabular-nums"
            style={{ color: `var(--${t})` }}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ScenarioPanel({
  world,
  autonomy,
  setAutonomy,
  speed,
  setSpeed,
  setHazard,
  surge,
  advance,
  runWhatIf,
  whatIfs,
}: {
  world: WorldState;
  autonomy: boolean;
  setAutonomy: (v: boolean) => void;
  speed: number;
  setSpeed: (v: number) => void;
  setHazard: (h: HazardType) => void;
  surge: (d: number) => void;
  advance: () => void;
  runWhatIf: () => void;
  whatIfs: WhatIfResult[] | null;
}) {
  const base = whatIfs?.[0];
  return (
    <div className="panel">
      <div className="border-b border-panel-edge px-4 py-2.5">
        <p className="label-xs">Scenario engine</p>
        <h2 className="font-display text-sm font-semibold">Simulation & what-if analysis</h2>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <p className="label-xs mb-1.5">Hazard scenario</p>
          <div className="flex flex-wrap gap-1.5">
            {HAZARDS.map(([h, l]) => (
              <button
                key={h}
                onClick={() => setHazard(h)}
                className={`rounded border px-2.5 py-1 font-mono text-[11px] uppercase transition-colors ${
                  world.hazard === h
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-accent hover:text-accent"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label-xs mb-1.5 flex justify-between">
            <span>Hazard driver</span>
            <span>{(world.intensity * 100).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${world.intensity * 100}%`,
                background: "linear-gradient(90deg, var(--ok), var(--moderate), var(--critical))",
              }}
            />
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => surge(0.2)}
              className="flex-1 rounded border border-critical/50 px-2 py-1 font-mono text-[11px] uppercase text-critical hover:bg-critical/10"
            >
              Inject surge
            </button>
            <button
              onClick={() => surge(-0.2)}
              className="flex-1 rounded border border-ok/50 px-2 py-1 font-mono text-[11px] uppercase text-ok hover:bg-ok/10"
            >
              Recede
            </button>
            <button
              onClick={advance}
              className="flex-1 rounded border border-border px-2 py-1 font-mono text-[11px] uppercase text-muted-foreground hover:border-accent hover:text-accent"
            >
              Step
            </button>
          </div>
        </div>

        <div>
          <div className="label-xs mb-1.5 flex justify-between">
            <span>Autonomy loop</span>
            <span className={autonomy ? "text-ok" : "text-severe"}>
              {autonomy ? "SELF-DRIVING" : "PAUSED"}
            </span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setAutonomy(!autonomy)}
              className={`flex-1 rounded border px-2 py-1 font-mono text-[11px] uppercase ${
                autonomy
                  ? "border-ok/50 text-ok hover:bg-ok/10"
                  : "border-primary bg-primary/15 text-primary"
              }`}
            >
              {autonomy ? "Pause loop" : "Resume loop"}
            </button>
            {[
              [2600, "0.5×"],
              [1600, "1×"],
              [700, "2×"],
            ].map(([s, l]) => (
              <button
                key={l as string}
                onClick={() => setSpeed(s as number)}
                className={`rounded border px-2 py-1 font-mono text-[11px] ${
                  speed === s
                    ? "border-accent text-accent"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <button
            onClick={runWhatIf}
            className="w-full rounded border border-accent bg-accent/10 px-2 py-1.5 font-mono text-[11px] uppercase text-accent hover:bg-accent/20"
          >
            Run what-if fork (8 cycles ahead)
          </button>
          {whatIfs && (
            <div className="mt-3 space-y-1.5">
              {whatIfs.map((w) => {
                const delta = base ? w.coverage - base.coverage : 0;
                return (
                  <div
                    key={w.label}
                    className="rounded border border-border/70 px-2.5 py-1.5 text-[11px]"
                  >
                    <div className="flex items-center justify-between">
                      <span>{w.label}</span>
                      <span
                        className="font-mono"
                        style={{
                          color: delta > 0 ? "var(--ok)" : delta < 0 ? "var(--critical)" : "var(--muted-foreground)",
                        }}
                      >
                        {delta > 0 ? "+" : ""}
                        {delta}% cover
                      </span>
                    </div>
                    <p className="label-xs">
                      coverage {w.coverage}% · unmet {w.unmet}% · eta {w.avgEta}m · at-risk{" "}
                      {w.peopleAtRisk.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResourcePanel({ world }: { world: WorldState }) {
  return (
    <div className="panel flex h-[22rem] flex-col">
      <div className="border-b border-panel-edge px-4 py-2.5">
        <p className="label-xs">Shelter · health · transport · volunteers</p>
        <h2 className="font-display text-sm font-semibold">Resource commitment</h2>
      </div>
      <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
        {world.resources.map((r) => {
          const pct = Math.round((r.committed / r.capacity) * 100);
          return (
            <div key={r.id}>
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="font-medium">{r.label}</span>
                <span className="font-mono text-muted-foreground">
                  {r.committed.toLocaleString()}/{r.capacity.toLocaleString()}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background:
                      pct > 85 ? "var(--critical)" : pct > 55 ? "var(--moderate)" : "var(--ok)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ZoneDetail({ world, zoneId }: { world: WorldState; zoneId: string | null }) {
  const z = world.zones.find((x) => x.id === zoneId) ?? [...world.zones].sort((a, b) => b.priority - a.priority)[0];
  if (!z) return null;
  const rows: Array<[string, number]> = [
    ["Shelter spaces", z.needs.shelter],
    ["Medical cases", z.needs.medical],
    ["Water (L·1000)", Math.round(z.needs.water / 1000)],
    ["Food packets", z.needs.food],
    ["Rescue cases", z.needs.rescue],
    ["Power crews", z.needs.power],
  ];
  return (
    <div className="panel">
      <div className="border-b border-panel-edge px-4 py-2.5">
        <p className="label-xs">Needs agent · zone dossier</p>
        <h2 className="font-display text-sm font-semibold">{z.name}</h2>
      </div>
      <div className="grid grid-cols-3 gap-px bg-panel-edge">
        {[
          ["Priority", `P${z.priority}`],
          ["Impact", `${z.impact}`],
          ["Unmet", `${z.unmet}%`],
        ].map(([l, v]) => (
          <div key={l} className="bg-panel px-3 py-2">
            <p className="label-xs">{l}</p>
            <p className="font-display text-base font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1.5 p-4 text-[11px]">
        <p className="label-xs">
          Population {z.population.toLocaleString()} · vulnerability{" "}
          {(z.vulnerability * 100).toFixed(0)}% ·{" "}
          <span className={z.accessible ? "text-ok" : "text-critical"}>
            {z.accessible ? "corridors open" : "access blocked"}
          </span>
        </p>
        {rows.map(([l, v]) => (
          <div key={l} className="flex justify-between border-b border-border/40 py-0.5">
            <span className="text-muted-foreground">{l}</span>
            <span className="font-mono">{v.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PriorityQueue({
  world,
  onSelect,
}: {
  world: WorldState;
  onSelect: (id: string) => void;
}) {
  const ranked = [...world.zones].sort((a, b) => b.priority - a.priority).slice(0, 8);
  return (
    <div className="panel">
      <div className="border-b border-panel-edge px-4 py-2.5">
        <p className="label-xs">Triage agent · continuously re-ranked</p>
        <h2 className="font-display text-sm font-semibold">Priority queue</h2>
      </div>
      <div className="p-2">
        {ranked.map((z, i) => (
          <button
            key={z.id}
            onClick={() => onSelect(z.id)}
            className="flex w-full items-center gap-3 rounded px-2 py-1.5 text-left hover:bg-secondary"
          >
            <span className="font-mono text-[10px] text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 truncate text-[12px]">{z.name}</span>
            {!z.accessible && (
              <span className="font-mono text-[9px] uppercase text-critical">cut off</span>
            )}
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${z.priority}%`,
                  background:
                    z.priority > 70
                      ? "var(--critical)"
                      : z.priority > 45
                        ? "var(--moderate)"
                        : "var(--ok)",
                }}
              />
            </span>
            <span className="w-8 text-right font-mono text-[11px]">P{z.priority}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
