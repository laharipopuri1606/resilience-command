import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy, useState } from "react";
import { useLiveOps } from "@/hooks/useLiveOps";
import {
  AlertCentre,
  LiveControls,
  LiveEventList,
  OutreachPanel,
} from "@/components/ops/LivePanels";
import { useResilience } from "@/hooks/useResilience";
import { MapBoard } from "@/components/ops/MapBoard";
import { AgentMesh, AgentStream } from "@/components/ops/AgentMesh";
import { AuditLedger, DispatchTable, IncidentFeed } from "@/components/ops/Feeds";
import {
  KpiStrip,
  PriorityQueue,
  ResourcePanel,
  ScenarioPanel,
  ZoneDetail,
} from "@/components/ops/Panels";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Resilience Command — Autonomous Emergency Coordination" },
      {
        name: "description",
        content:
          "Self-driving multi-agent command centre for floods, cyclones, fires and heatwaves: incident intake, impact modelling, resource matching, dynamic routing and what-if simulation.",
      },
      { property: "og:title", content: "Resilience Command — Autonomous Emergency Coordination" },
      {
        property: "og:description",
        content:
          "Eight AI agents coordinate shelters, healthcare, transport and volunteers in real time, with an auditable action ledger.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Command,
});

const LiveMap = lazy(() => import("@/components/ops/LiveMap"));

function Command() {
  const sim = useResilience();
  const live = useLiveOps();
  const [zone, setZone] = useState<string | null>(null);
  const { world } = sim;

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-5 lg:px-8">
      <header className="mb-5 flex flex-wrap items-center gap-4 border-b border-panel-edge pb-4">
        <div className="relative grid size-10 place-items-center rounded-md border border-accent/40 bg-accent/10">
          <span className="absolute size-2 rounded-full bg-accent animate-pulse-ring" />
          <span className="size-2 rounded-full bg-accent" />
        </div>
        <div>
          <h1 className="font-display text-lg font-semibold tracking-tight">
            Resilience Command
          </h1>
          <p className="label-xs">
            Autonomous community resilience & emergency resource coordination mesh
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded border border-ok/40 bg-ok/10 px-2 py-1 font-mono text-[10px] uppercase text-ok">
            Fully autonomous · no human approval required
          </span>
          <span className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground">
            Scenario: {world.hazard}
          </span>
        </div>
      </header>

      <section className="mb-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-panel-edge px-4 py-2.5">
              <div>
                <p className="label-xs">Real-world operating picture · USGS · GDACS · NASA EONET</p>
                <h2 className="font-display text-sm font-semibold">Global live disaster map</h2>
              </div>
              <div className="flex items-center gap-3">
                {[
                  ["Critical", "var(--critical)"],
                  ["Severe", "var(--severe)"],
                  ["Moderate", "var(--moderate)"],
                  ["Watch", "var(--ok)"],
                ].map(([l, c]) => (
                  <span key={l} className="label-xs flex items-center gap-1.5">
                    <i className="size-2 rounded-full" style={{ background: c }} />
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <ClientOnly
              fallback={<div className="h-[30rem] w-full animate-pulse bg-muted/20" />}
            >
              <Suspense fallback={<div className="h-[30rem] w-full animate-pulse bg-muted/20" />}>
                <LiveMap
                  events={live.events}
                  selectedId={live.selected}
                  onSelect={live.setSelected}
                />
              </Suspense>
            </ClientOnly>
          </div>
          <LiveEventList
            events={live.events}
            selected={live.selected}
            onSelect={live.setSelected}
            onAnalyze={(e) => void live.runAgents(e)}
            busy={live.busy}
            analysedIds={live.alerts.map((a) => a.event.id)}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <LiveControls
            minSeverity={live.minSeverity}
            setMinSeverity={live.setMinSeverity}
            radiusKm={live.radiusKm}
            setRadiusKm={live.setRadiusKm}
            autoWatch={live.autoWatch}
            setAutoWatch={live.setAutoWatch}
            sources={live.live.data?.sources ?? []}
            fetchedAt={live.live.data?.fetchedAt}
            count={live.events.length}
            refetching={live.live.isFetching}
          />
          <AlertCentre alerts={live.alerts} />
          <OutreachPanel alerts={live.alerts} contacts={live.contacts} />
        </div>
      </section>

      <KpiStrip world={world} />

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <MapBoard world={world} selected={zone} onSelect={setZone} />
          <AgentMesh world={world} />
        </div>
        <div className="space-y-4">
          <ScenarioPanel {...sim} />
          <PriorityQueue world={world} onSelect={setZone} />
          <ZoneDetail world={world} zoneId={zone} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <IncidentFeed world={world} />
        <AgentStream world={world} />
        <ResourcePanel world={world} />
        <DispatchTable world={world} />
        <AuditLedger world={world} />
        <div className="panel h-[22rem] overflow-y-auto p-4 text-[12px] leading-relaxed text-muted-foreground">
          <p className="label-xs mb-2">How the mesh operates</p>
          <p>
            Every cycle, the <span className="text-foreground">Intake Agent</span> fuses citizen
            reports with simulated river, wind, thermal and seismic sensors. The{" "}
            <span className="text-foreground">Impact Agent</span> recomputes affected area from
            elevation, exposure and corroborated signal; the{" "}
            <span className="text-foreground">Needs Agent</span> converts that into shelter,
            medical, water, food, rescue and power demand per ward.
          </p>
          <p className="mt-2">
            The <span className="text-foreground">Triage Agent</span> ranks wards by impact,
            social vulnerability and access loss. The{" "}
            <span className="text-foreground">Matching Agent</span> commits the nearest available
            shelter, hospital, ambulance, boat, tanker, kitchen and volunteer capacity, while the{" "}
            <span className="text-foreground">Routing Agent</span> re-plans corridors whenever a
            link fails its accessibility check.
          </p>
          <p className="mt-2">
            The <span className="text-foreground">Coordination Agent</span> broadcasts mutual-aid
            requests when unmet need crosses threshold, and the{" "}
            <span className="text-foreground">Audit Agent</span> seals every decision into a
            hash-chained ledger. Controls on this console only shape the scenario — the mesh plans,
            dispatches and re-plans on its own.
          </p>
        </div>
      </div>
    </main>
  );
}
