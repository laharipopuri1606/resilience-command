export type LiveHazard =
  | "earthquake"
  | "flood"
  | "cyclone"
  | "wildfire"
  | "volcano"
  | "drought"
  | "storm"
  | "other";

export type LiveSeverity = "watch" | "moderate" | "severe" | "critical";

export interface DisasterEvent {
  id: string;
  source: "USGS" | "GDACS" | "EONET";
  hazard: LiveHazard;
  title: string;
  place: string;
  lat: number;
  lon: number;
  magnitude: number | null;
  severity: LiveSeverity;
  time: string;
  url: string;
}

export interface AgentAnalysis {
  eventId: string;
  headline: string;
  exactLocation: string;
  severity: LiveSeverity;
  impactRadiusKm: number;
  estimatedPeopleAtRisk: string;
  primaryNeeds: string[];
  immediateActions: string[];
  rationale: string;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  lat: number;
  lon: number;
  email: string;
  phone: string;
}

export interface OutreachDraft {
  contactId: string;
  contactName: string;
  distanceKm: number;
  channel: "email" | "sms";
  subject: string;
  message: string;
}
