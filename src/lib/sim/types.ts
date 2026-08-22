export type HazardType = "flood" | "cyclone" | "fire" | "heatwave" | "quake";

export type Severity = "watch" | "moderate" | "severe" | "critical";

export interface Zone {
  id: string;
  name: string;
  x: number;
  y: number;
  population: number;
  elevation: number; // 0-100, lower = flood prone
  vulnerability: number; // 0-1 social vulnerability index
  hazard: number; // 0-1 current hazard intensity
  impact: number; // 0-100 derived impact score
  priority: number; // 0-100 derived triage priority
  accessible: boolean;
  needs: Needs;
  unmet: number; // 0-100
}

export interface Needs {
  shelter: number;
  medical: number;
  water: number;
  food: number;
  rescue: number;
  power: number;
}

export type ResourceKind =
  | "shelter"
  | "ambulance"
  | "medical"
  | "water"
  | "food"
  | "boat"
  | "volunteer"
  | "power";

export interface ResourceUnit {
  id: string;
  kind: ResourceKind;
  label: string;
  baseZone: string;
  capacity: number;
  committed: number;
  etaBase: number;
}

export interface Incident {
  id: string;
  tick: number;
  zoneId: string;
  source: "citizen" | "sensor" | "responder" | "satellite";
  hazard: HazardType;
  text: string;
  confidence: number;
  severity: Severity;
  verified: boolean;
}

export type AgentId =
  | "intake"
  | "impact"
  | "needs"
  | "matcher"
  | "router"
  | "triage"
  | "comms"
  | "audit";

export interface AgentMessage {
  id: string;
  tick: number;
  agent: AgentId;
  level: "info" | "action" | "alert";
  text: string;
}

export interface Allocation {
  id: string;
  tick: number;
  zoneId: string;
  resourceId: string;
  kind: ResourceKind;
  units: number;
  eta: number;
  route: string;
  status: "dispatched" | "enroute" | "delivered" | "rerouted";
  rationale: string;
}

export interface AuditEntry {
  id: string;
  tick: number;
  actor: AgentId;
  action: string;
  detail: string;
  hash: string;
}

export interface WorldState {
  tick: number;
  hazard: HazardType;
  intensity: number; // 0-1 scenario driver
  running: boolean;
  zones: Zone[];
  resources: ResourceUnit[];
  incidents: Incident[];
  messages: AgentMessage[];
  allocations: Allocation[];
  audit: AuditEntry[];
  kpi: {
    peopleAtRisk: number;
    coverage: number;
    avgEta: number;
    unmetNeed: number;
    decisions: number;
  };
}
