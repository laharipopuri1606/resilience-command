import type { Contact, DisasterEvent } from "./types";

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function nearbyContacts(event: DisasterEvent, contacts: Contact[], radiusKm: number) {
  return contacts
    .map((c) => ({ ...c, distanceKm: distanceKm(event.lat, event.lon, c.lat, c.lon) }))
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export const DEFAULT_CONTACTS: Contact[] = [
  { id: "c1", name: "NDRF Regional Control", role: "Search & rescue", lat: 17.385, lon: 78.4867, email: "control@ndrf.example", phone: "+911100000001" },
  { id: "c2", name: "Tokyo Metropolitan EOC", role: "Emergency operations", lat: 35.6762, lon: 139.6503, email: "eoc@tokyo.example", phone: "+818000000002" },
  { id: "c3", name: "Cal OES Field Office", role: "Wildfire response", lat: 38.5816, lon: -121.4944, email: "field@caloes.example", phone: "+15300000003" },
  { id: "c4", name: "Jakarta Flood Task Force", role: "Flood relief", lat: -6.2088, lon: 106.8456, email: "flood@jkt.example", phone: "+628000000004" },
  { id: "c5", name: "Santiago Seismic Unit", role: "Seismic response", lat: -33.4489, lon: -70.6693, email: "seismo@cl.example", phone: "+560000000005" },
  { id: "c6", name: "Nairobi Red Cross Hub", role: "Shelter & medical", lat: -1.2921, lon: 36.8219, email: "hub@ke.example", phone: "+254000000006" },
  { id: "c7", name: "Athens Civil Protection", role: "Civil protection", lat: 37.9838, lon: 23.7275, email: "cp@gr.example", phone: "+300000000007" },
  { id: "c8", name: "Manila Disaster Council", role: "Cyclone response", lat: 14.5995, lon: 120.9842, email: "council@ph.example", phone: "+630000000008" },
];
