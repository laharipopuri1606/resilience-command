import { AGENT_META } from "@/lib/sim/engine";
import type { WorldState } from "@/lib/sim/types";

export function AgentMesh({ world }: { world: WorldState }) {
  const ids = Object.keys(AGENT_META);
  const last = (id: string) => [...world.messages].reverse().find((m) => m.agent === id);

  return (
    <div className="panel">
      <div className="border-b border-panel-edge px-4 py-2.5">
        <p className="label-xs">Autonomous agent mesh</p>
        <h2 className="font-display text-sm font-semibold">
          8 agents negotiating · zero operator input
        </h2>
      </div>
      <div className="grid gap-px bg-panel-edge sm:grid-cols-2">
        {ids.map((id) => {
          const meta = AGENT_META[id]!;
          const m = last(id);
          const fresh = m ? world.tick - m.tick <= 1 : false;
          return (
            <div key={id} className="bg-panel p-3">
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{
                    background: meta.color,
                    boxShadow: fresh ? `0 0 10px 1px ${meta.color}` : "none",
                    opacity: fresh ? 1 : 0.4,
                  }}
                />
                <span className="font-display text-xs font-semibold">{meta.name}</span>
                <span className="label-xs ml-auto">{fresh ? "ACTIVE" : "IDLE"}</span>
              </div>
              <p className="label-xs mt-1">{meta.role}</p>
              <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {m?.text ?? "Awaiting first cycle…"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AgentStream({ world }: { world: WorldState }) {
  const items = [...world.messages].slice(-40).reverse();
  return (
    <div className="panel flex h-[22rem] flex-col">
      <div className="border-b border-panel-edge px-4 py-2.5">
        <p className="label-xs">Inter-agent reasoning bus</p>
        <h2 className="font-display text-sm font-semibold">Decision stream</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {items.map((m) => (
          <div key={m.id} className="animate-rise border-b border-border/50 py-1.5 last:border-0">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">
                T{String(m.tick).padStart(3, "0")}
              </span>
              <span
                className="font-mono text-[10px] font-semibold uppercase"
                style={{ color: AGENT_META[m.agent]?.color }}
              >
                {m.agent}
              </span>
              {m.level === "alert" && (
                <span className="rounded bg-critical/15 px-1 font-mono text-[9px] text-critical">
                  ALERT
                </span>
              )}
              {m.level === "action" && (
                <span className="rounded bg-primary/15 px-1 font-mono text-[9px] text-primary">
                  ACTION
                </span>
              )}
            </div>
            <p className="text-[12px] leading-snug text-foreground/90">{m.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
