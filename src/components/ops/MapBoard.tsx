import type { WorldState, Zone } from "@/lib/sim/types";

function tone(z: Zone) {
  if (z.impact > 74) return "var(--critical)";
  if (z.impact > 52) return "var(--severe)";
  if (z.impact > 30) return "var(--moderate)";
  return "var(--ok)";
}

export function MapBoard({
  world,
  selected,
  onSelect,
}: {
  world: WorldState;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const active = world.allocations.filter((a) => a.tick >= world.tick - 1);

  return (
    <div className="panel relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-panel-edge px-4 py-2.5">
        <div>
          <p className="label-xs">Live operating picture</p>
          <h2 className="font-display text-sm font-semibold">District hazard & dispatch grid</h2>
        </div>
        <div className="flex items-center gap-3">
          {[
            ["Critical", "var(--critical)"],
            ["Severe", "var(--severe)"],
            ["Moderate", "var(--moderate)"],
            ["Stable", "var(--ok)"],
          ].map(([l, c]) => (
            <span key={l} className="label-xs flex items-center gap-1.5">
              <i className="size-2 rounded-full" style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox="0 0 100 92" className="h-[27rem] w-full">
        <defs>
          <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M5 0H0V5" fill="none" stroke="var(--border)" strokeWidth="0.15" />
          </pattern>
        </defs>
        <rect width="100" height="92" fill="url(#grid)" />

        {/* corridors */}
        {active.map((a) => {
          const z = world.zones.find((x) => x.id === a.zoneId)!;
          const r = world.resources.find((x) => x.id === a.resourceId)!;
          const base = world.zones.find((x) => x.name === r.baseZone) ?? z;
          return (
            <line
              key={a.id}
              x1={base.x}
              y1={base.y}
              x2={z.x}
              y2={z.y}
              stroke={a.status === "rerouted" ? "var(--severe)" : "var(--accent)"}
              strokeWidth="0.35"
              strokeDasharray={a.status === "rerouted" ? "1.4 1" : "0.8 1.2"}
              opacity="0.65"
            />
          );
        })}

        {world.zones.map((z) => {
          const c = tone(z);
          const r = 1.5 + Math.log10(z.population) * 0.55;
          const isSel = selected === z.id;
          return (
            <g
              key={z.id}
              onClick={() => onSelect(z.id)}
              className="cursor-pointer"
              transform={`translate(${z.x} ${z.y})`}
            >
              {z.impact > 52 && (
                <circle r={r} fill={c} opacity="0.28" className="animate-pulse-ring" />
              )}
              <circle r={r} fill={c} opacity={0.22 + z.hazard * 0.5} />
              <circle
                r={r}
                fill="none"
                stroke={c}
                strokeWidth={isSel ? 0.7 : 0.35}
                opacity={isSel ? 1 : 0.8}
              />
              {!z.accessible && (
                <path
                  d={`M-${r} -${r} L${r} ${r} M${r} -${r} L-${r} ${r}`}
                  stroke="var(--critical)"
                  strokeWidth="0.3"
                  opacity="0.9"
                />
              )}
              <text
                y={r + 2.6}
                textAnchor="middle"
                fontSize="1.9"
                fill="var(--foreground)"
                opacity="0.82"
              >
                {z.name}
              </text>
              <text
                y={r + 4.8}
                textAnchor="middle"
                fontSize="1.6"
                fill={c}
                fontFamily="var(--font-mono)"
              >
                P{z.priority} · {z.impact}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
