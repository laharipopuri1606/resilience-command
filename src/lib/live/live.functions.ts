import { createServerFn } from "@tanstack/react-start";
import type { AgentAnalysis, Contact, DisasterEvent, OutreachDraft } from "./types";

export const getLiveDisasters = createServerFn({ method: "GET" }).handler(async () => {
  const { loadLiveDisasters } = await import("./sources.server");
  return await loadLiveDisasters();
});

interface AnalyzeInput {
  event: DisasterEvent;
}

/** Detection agent: reads the raw feed event and returns the exact location + impact brief. */
export const analyzeEvent = createServerFn({ method: "POST" })
  .inputValidator((input: AnalyzeInput) => input)
  .handler(async ({ data }): Promise<AgentAnalysis> => {
    const { z } = await import("zod");
    const { runStructured, toList } = await import("./ai.server");
    const e = data.event;

    const out = await runStructured(
      z.object({
        headline: z.string(),
        exactLocation: z.string(),
        severity: z.enum(["watch", "moderate", "severe", "critical"]),
        impactRadiusKm: z.number(),
        estimatedPeopleAtRisk: z.string(),
        primaryNeeds: z.string(),
        immediateActions: z.string(),
        rationale: z.string(),
      }),
      "You are the Detection Agent of an emergency command centre. Given one live disaster feed event, state the exact affected location (nearest named settlement, district, region and country), assess severity, estimate an impact radius in km and a population exposure band. primaryNeeds and immediateActions must each be a single semicolon-separated list of at most 5 short items. Be factual and terse; never invent event data beyond the input.",
      [
        `Source: ${e.source}`,
        `Hazard: ${e.hazard}`,
        `Title: ${e.title}`,
        `Reported place: ${e.place}`,
        `Coordinates: ${e.lat.toFixed(4)}, ${e.lon.toFixed(4)}`,
        `Magnitude/severity value: ${e.magnitude ?? "n/a"}`,
        `Feed severity: ${e.severity}`,
        `Time (UTC): ${e.time}`,
      ].join("\n"),
    );

    return {
      eventId: e.id,
      headline: out.headline,
      exactLocation: out.exactLocation,
      severity: out.severity,
      impactRadiusKm: Math.round(out.impactRadiusKm),
      estimatedPeopleAtRisk: out.estimatedPeopleAtRisk,
      primaryNeeds: toList(out.primaryNeeds),
      immediateActions: toList(out.immediateActions),
      rationale: out.rationale,
    };
  });

interface OutreachInput {
  event: DisasterEvent;
  analysis: AgentAnalysis;
  contacts: Array<Contact & { distanceKm: number }>;
}

/** Coordination agent: drafts the notification sent to each nearby contact. */
export const draftOutreach = createServerFn({ method: "POST" })
  .inputValidator((input: OutreachInput) => input)
  .handler(async ({ data }): Promise<OutreachDraft[]> => {
    if (data.contacts.length === 0) return [];
    const { z } = await import("zod");
    const { runStructured } = await import("./ai.server");
    const e = data.event;
    const a = data.analysis;

    const drafts: OutreachDraft[] = [];
    for (const c of data.contacts.slice(0, 4)) {
      const out = await runStructured(
        z.object({ subject: z.string(), email: z.string(), sms: z.string() }),
        "You are the Coordination Agent of an emergency command centre notifying one nearby responder. Write one email body (under 120 words) and one SMS (under 300 characters). Both must state the exact location, the distance from this responder, the severity, and the specific action this responder's role should take now.",
        [
          `Event: ${e.title} (${e.hazard}, source ${e.source})`,
          `Exact location: ${a.exactLocation} [${e.lat.toFixed(3)}, ${e.lon.toFixed(3)}]`,
          `Severity: ${a.severity}; impact radius ${a.impactRadiusKm} km; exposure ${a.estimatedPeopleAtRisk}`,
          `Primary needs: ${a.primaryNeeds.join(", ")}`,
          `Immediate actions: ${a.immediateActions.join("; ")}`,
          `Responder: ${c.name} — role ${c.role}, ${c.distanceKm.toFixed(0)} km from the event`,
        ].join("\n"),
      );

      drafts.push(
        {
          contactId: c.id,
          contactName: c.name,
          distanceKm: c.distanceKm,
          channel: "email",
          subject: out.subject.slice(0, 140),
          message: out.email,
        },
        {
          contactId: c.id,
          contactName: c.name,
          distanceKm: c.distanceKm,
          channel: "sms",
          subject: out.subject.slice(0, 140),
          message: out.sms.slice(0, 320),
        },
      );
    }
    return drafts;
  });
