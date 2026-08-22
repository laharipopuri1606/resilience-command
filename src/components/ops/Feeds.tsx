import type { WorldState } from "@/lib/sim/types";

const SEV: Record<string, string> = {
  critical: "text-critical",
  severe: "text-severe",
  moderate: "text-moderate",
  watch: "text-watch",
};

export function IncidentFeed({ world }: { world: WorldState }) {
  const items = [...world.incidents].slice(-40).reverse();
  const name = (id: string) => world.zones.find((z) => z.id === id)?.name ?? id;
  return (
    <div className="panel flex h-[22rem] flex-col">
      <div className="border-b border-panel-edge px-4 py-2.5">
        <p className="label-xs">Intake · citizens + simulated sensors</p>
        <h2 className="font-display text-sm font-semibold">Incident feed</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {items.map((i) => (
          <div key={i.id} className="animate-rise border-b border-border/50 py-1.5 last:border-0">
            <div className="flex items-center gap-2">
              <span className={`font-mono text-[10px] uppercase ${SEV[i.severity]}`}>
                {i.severity}
              </span>
              <span className="label-xs">{i.source}</span>
              <span className="label-xs ml-auto">
                conf {(i.confidence * 100).toFixed(0)}%{i.verified ? " · verified" : ""}
              </span>
            </div>
            <p className="text-[12px] leading-snug">{i.text}</p>
            <p className="label-xs">{name(i.zoneId)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DispatchTable({ world }: { world: WorldState }) {
  const items = [...world.allocations].slice(-24).reverse();
  const name = (id: string) => world.zones.find((z) => z.id === id)?.name ?? id;
  return (
    <div className="panel flex h-[22rem] flex-col">
      <div className="border-b border-panel-edge px-4 py-2.5">
        <p className="label-xs">Matching + routing agents</p>
        <h2 className="font-display text-sm font-semibold">Autonomous dispatch ledger</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-panel">
            <tr className="label-xs">
              <th className="px-4 py-1.5 font-normal">Zone</th>
              <th className="py-1.5 font-normal">Resource</th>
              <th className="py-1.5 font-normal">Units</th>
              <th className="py-1.5 font-normal">ETA</th>
              <th className="px-4 py-1.5 font-normal">Corridor</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className="border-t border-border/50 align-top">
                <td className="px-4 py-1.5 font-medium">{name(a.zoneId)}</td>
                <td className="py-1.5 capitalize text-muted-foreground">{a.kind}</td>
                <td className="py-1.5 font-mono">{a.units}</td>
                <td className="py-1.5 font-mono text-accent">{a.eta}m</td>
                <td className="px-4 py-1.5 text-muted-foreground">
                  <span
                    className={
                      a.status === "rerouted"
                        ? "font-mono text-[10px] uppercase text-severe"
                        : "font-mono text-[10px] uppercase text-ok"
                    }
                  >
                    {a.status}
                  </span>{" "}
                  {a.route}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AuditLedger({ world }: { world: WorldState }) {
  const items = [...world.audit].slice(-40).reverse();
  return (
    <div className="panel flex h-[22rem] flex-col">
      <div className="border-b border-panel-edge px-4 py-2.5">
        <p className="label-xs">Audit agent · tamper-evident chain</p>
        <h2 className="font-display text-sm font-semibold">Action ledger</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-[11px]">
        {items.map((a) => (
          <div key={a.id} className="animate-rise border-b border-border/40 py-1 last:border-0">
            <span className="text-muted-foreground">T{String(a.tick).padStart(3, "0")}</span>{" "}
            <span className="text-primary">{a.action}</span>{" "}
            <span className="text-foreground/80">{a.detail}</span>{" "}
            <span className="text-muted-foreground">#{a.hash}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
