import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { analyzeEvent, draftOutreach, getLiveDisasters } from "@/lib/live/live.functions";
import { DEFAULT_CONTACTS, nearbyContacts } from "@/lib/live/geo";
import type { AgentAnalysis, Contact, DisasterEvent, OutreachDraft } from "@/lib/live/types";

const SEV_RANK: Record<string, number> = { watch: 0, moderate: 1, severe: 2, critical: 3 };

export interface AlertRecord {
  id: string;
  event: DisasterEvent;
  analysis: AgentAnalysis;
  drafts: OutreachDraft[];
  createdAt: string;
}

export function useLiveOps() {
  const fetchLive = useServerFn(getLiveDisasters);
  const runAnalyze = useServerFn(analyzeEvent);
  const runOutreach = useServerFn(draftOutreach);

  const [selected, setSelected] = useState<string | null>(null);
  const [minSeverity, setMinSeverity] = useState<"watch" | "moderate" | "severe" | "critical">(
    "moderate",
  );
  const [radiusKm, setRadiusKm] = useState(800);
  const [contacts] = useState<Contact[]>(DEFAULT_CONTACTS);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [autoWatch, setAutoWatch] = useState(true);
  const attempted = useRef<Set<string>>(new Set());

  const live = useQuery({
    queryKey: ["live-disasters"],
    queryFn: () => fetchLive(),
    refetchInterval: 120_000,
  });

  const events = useMemo(() => {
    const all = live.data?.events ?? [];
    return all.filter((e) => SEV_RANK[e.severity]! >= SEV_RANK[minSeverity]!);
  }, [live.data, minSeverity]);

  const runAgents = useCallback(
    async (event: DisasterEvent) => {
      attempted.current.add(event.id);
      setBusy(event.id);
      try {
        const analysis = await runAnalyze({ data: { event } });
        const near = nearbyContacts(event, contacts, radiusKm);
        const drafts = near.length ? await runOutreach({ data: { event, analysis, contacts: near } }) : [];
        setAlerts((prev) => [
          {
            id: `${event.id}-${Date.now()}`,
            event,
            analysis,
            drafts,
            createdAt: new Date().toISOString(),
          },
          ...prev.filter((a) => a.event.id !== event.id),
        ]);
        setSelected(event.id);
        toast.error(`${analysis.severity.toUpperCase()} · ${analysis.exactLocation}`, {
          description: `${analysis.headline} — ${drafts.length / 2 || 0} nearby contacts notified.`,
        });
        return true;
      } catch (err) {
        toast.error("Agent run failed", { description: (err as Error).message });
        return false;
      } finally {
        setBusy(null);
      }
    },
    [contacts, radiusKm, runAnalyze, runOutreach],
  );

  // Detection agent auto-triggers on the newest unseen critical/severe event.
  useEffect(() => {
    if (!autoWatch || busy) return;
    const target = events.find(
      (e) =>
        (e.severity === "critical" || e.severity === "severe") &&
        !attempted.current.has(e.id),
    );
    if (target) void runAgents(target);
  }, [events, autoWatch, busy, runAgents]);

  return {
    live,
    events,
    alerts,
    selected,
    setSelected,
    minSeverity,
    setMinSeverity,
    radiusKm,
    setRadiusKm,
    contacts,
    runAgents,
    busy,
    autoWatch,
    setAutoWatch,
  };
}
