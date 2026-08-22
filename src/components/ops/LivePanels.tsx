import type { AlertRecord } from "@/hooks/useLiveOps";
import type { Contact, DisasterEvent } from "@/lib/live/types";

const sevColor: Record<string, string> = {
  critical: "var(--critical)",
  severe: "var(--severe)",
  moderate: "var(--moderate)",
  watch: "var(--ok)",
};

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}

export function LiveControls({
  minSeverity,
  setMinSeverity,
  radiusKm,
  setRadiusKm,
  autoWatch,
  setAutoWatch,
  sources,
  fetchedAt,
  count,
  refetching,
}: {
  minSeverity: string;
  setMinSeverity: (v: "watch" | "moderate" | "severe" | "critical") => void;
  radiusKm: number;
  setRadiusKm: (v: number) => void;
  autoWatch: boolean;
  setAutoWatch: (v: boolean) => void;
  sources: { name: string; count: number }[];
  fetchedAt?: string | undefined;
  count: number;
  refetching: boolean;
}) {
  return (
    <div className="panel p-4">
      <p className="label-xs mb-3">Live feed control</p>
      <div className="space-y-3 text-[12px]">
        <div>
          <p className="label-xs mb-1.5">Minimum severity</p>
          <div className="flex flex-wrap gap-1.5">
            {(["watch", "moderate", "severe", "critical"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setMinSeverity(s)}
                className="rounded border px-2 py-1 font-mono text-[10px] uppercase transition-colors"
                style={{
                  borderColor: minSeverity === s ? sevColor[s] : "var(--border)",
                  color: minSeverity === s ? sevColor[s] : "var(--muted-foreground)",
                  background: minSeverity === s ? `color-mix(in oklab, ${sevColor[s]} 14%, transparent)` : "transparent",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="label-xs mb-1.5">Nearby contact radius · {radiusKm} km</p>
          <input
            type="range"
            min={100}
            max={3000}
            step={100}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </div>

        <label className="flex items-center justify-between gap-2 rounded border border-panel-edge px-2 py-1.5">
          <span>Autonomous detection agent</span>
          <input
            type="checkbox"
            checked={autoWatch}
            onChange={(e) => setAutoWatch(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
        </label>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {sources.map((s) => (
            <span
              key={s.name}
              className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground"
            >
              {s.name} {s.count}
            </span>
          ))}
        </div>
        <p className="label-xs">
          {count} events shown · {refetching ? "syncing…" : fetchedAt ? `updated ${ago(fetchedAt)} ago` : "—"}
        </p>
      </div>
    </div>
  );
}

export function LiveEventList({
  events,
  selected,
  onSelect,
  onAnalyze,
  busy,
  analysedIds,
}: {
  events: DisasterEvent[];
  selected: string | null;
  onSelect: (id: string) => void;
  onAnalyze: (e: DisasterEvent) => void;
  busy: string | null;
  analysedIds: string[];
}) {
  return (
    <div className="panel flex h-[30rem] flex-col">
      <div className="border-b border-panel-edge px-4 py-2.5">
        <p className="label-xs">Real-world feed</p>
        <h2 className="font-display text-sm font-semibold">Active global events</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 && (
          <p className="p-4 text-[12px] text-muted-foreground">No events at this severity.</p>
        )}
        {events.map((e) => (
          <div
            key={e.id}
            onClick={() => onSelect(e.id)}
            className={`cursor-pointer border-b border-panel-edge px-4 py-2.5 transition-colors hover:bg-accent/5 ${selected === e.id ? "bg-accent/10" : ""}`}
          >
            <div className="flex items-start gap-2">
              <i className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: sevColor[e.severity] }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] text-foreground">{e.title}</p>
                <p className="label-xs mt-0.5">
                  {e.source} · {e.hazard} · {e.lat.toFixed(2)}, {e.lon.toFixed(2)} · {ago(e.time)} ago
                </p>
              </div>
              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  onAnalyze(e);
                }}
                disabled={busy === e.id}
                className="shrink-0 rounded border border-accent/40 bg-accent/10 px-2 py-1 font-mono text-[10px] uppercase text-accent disabled:opacity-50"
              >
                {busy === e.id ? "running" : analysedIds.includes(e.id) ? "re-run" : "analyse"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AlertCentre({ alerts }: { alerts: AlertRecord[] }) {
  return (
    <div className="panel h-[24rem] overflow-y-auto">
      <div className="sticky top-0 border-b border-panel-edge bg-card px-4 py-2.5">
        <p className="label-xs">Detection agent</p>
        <h2 className="font-display text-sm font-semibold">Notifications & exact locations</h2>
      </div>
      {alerts.length === 0 && (
        <p className="p-4 text-[12px] text-muted-foreground">
          Waiting for the detection agent to confirm an event…
        </p>
      )}
      {alerts.map((a) => (
        <div key={a.id} className="border-b border-panel-edge p-4">
          <div className="flex items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase"
              style={{
                color: sevColor[a.analysis.severity],
                background: `color-mix(in oklab, ${sevColor[a.analysis.severity]} 14%, transparent)`,
              }}
            >
              {a.analysis.severity}
            </span>
            <span className="label-xs">{ago(a.createdAt)} ago</span>
          </div>
          <p className="mt-1.5 text-[12px] text-foreground">{a.analysis.headline}</p>
          <p className="mt-1 font-mono text-[11px] text-accent">
            📍 {a.analysis.exactLocation} [{a.event.lat.toFixed(3)}, {a.event.lon.toFixed(3)}]
          </p>
          <p className="label-xs mt-1">
            Radius {a.analysis.impactRadiusKm} km · exposure {a.analysis.estimatedPeopleAtRisk}
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">{a.analysis.rationale}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {a.analysis.primaryNeeds.map((n) => (
              <span key={n} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {n}
              </span>
            ))}
          </div>
          <ul className="mt-2 space-y-1 text-[12px] text-muted-foreground">
            {a.analysis.immediateActions.map((n) => (
              <li key={n}>› {n}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function OutreachPanel({ alerts, contacts }: { alerts: AlertRecord[]; contacts: Contact[] }) {
  const drafts = alerts.flatMap((a) => a.drafts.map((d) => ({ ...d, event: a.event })));
  return (
    <div className="panel h-[24rem] overflow-y-auto">
      <div className="sticky top-0 border-b border-panel-edge bg-card px-4 py-2.5">
        <p className="label-xs">Coordination agent · {contacts.length} contacts in directory</p>
        <h2 className="font-display text-sm font-semibold">Nearby locations contacted</h2>
      </div>
      {drafts.length === 0 && (
        <p className="p-4 text-[12px] text-muted-foreground">
          No outreach yet. When an event is confirmed, the coordination agent contacts every
          responder inside the radius.
        </p>
      )}
      {drafts.map((d, i) => (
        <div key={`${d.contactId}-${d.channel}-${i}`} className="border-b border-panel-edge p-4">
          <div className="flex items-center gap-2">
            <span className="rounded border border-accent/40 px-1.5 py-0.5 font-mono text-[10px] uppercase text-accent">
              {d.channel}
            </span>
            <span className="text-[12px] text-foreground">{d.contactName}</span>
            <span className="label-xs ml-auto">{d.distanceKm.toFixed(0)} km away</span>
          </div>
          {d.channel === "email" && (
            <p className="mt-1.5 text-[12px] text-foreground">{d.subject}</p>
          )}
          <p className="mt-1 whitespace-pre-wrap text-[12px] text-muted-foreground">{d.message}</p>
        </div>
      ))}
    </div>
  );
}
