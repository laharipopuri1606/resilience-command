import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DisasterEvent } from "@/lib/live/types";

const COLOR: Record<string, string> = {
  critical: "var(--critical)",
  severe: "var(--severe)",
  moderate: "var(--moderate)",
  watch: "var(--ok)",
};

export default function LiveMap({
  events,
  selectedId,
  onSelect,
}: {
  events: DisasterEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!holder.current || map.current) return;
    map.current = new maplibregl.Map({
      container: holder.current,
      style: {
        version: 8,
        sources: {
          carto: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors © CARTO",
          },
        },
        layers: [{ id: "carto", type: "raster", source: "carto" }],
      },
      center: [20, 20],
      zoom: 1.4,
      attributionControl: { compact: true },
    });
    map.current?.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = events.map((e) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", e.title);
      const size = e.severity === "critical" ? 20 : e.severity === "severe" ? 16 : 12;
      el.style.cssText = `width:${size}px;height:${size}px;border-radius:9999px;cursor:pointer;background:color-mix(in oklab, ${COLOR[e.severity]} 45%, transparent);border:1.5px solid ${COLOR[e.severity]};box-shadow:0 0 12px ${COLOR[e.severity]}`;
      if (e.id === selectedId) el.style.outline = "2px solid var(--foreground)";
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelectRef.current(e.id);
      });
      return new maplibregl.Marker({ element: el })
        .setLngLat([e.lon, e.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 14, closeButton: false }).setText(
            `${e.title} — ${e.place}`,
          ),
        )
        .addTo(m);
    });
  }, [events, selectedId]);

  useEffect(() => {
    const m = map.current;
    const e = events.find((x) => x.id === selectedId);
    if (m && e) m.flyTo({ center: [e.lon, e.lat], zoom: Math.max(m.getZoom(), 4.5), speed: 1.2 });
  }, [selectedId, events]);

  return <div ref={holder} className="h-[30rem] w-full" />;
}
