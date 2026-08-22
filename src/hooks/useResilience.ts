import { useCallback, useEffect, useRef, useState } from "react";
import { createWorld, step, whatIf, type WhatIfResult } from "@/lib/sim/engine";
import type { HazardType, WorldState } from "@/lib/sim/types";

export function useResilience() {
  const [world, setWorld] = useState<WorldState>(() => createWorld("flood"));
  const [speed, setSpeed] = useState(1600);
  const [autonomy, setAutonomy] = useState(true);
  const [whatIfs, setWhatIfs] = useState<WhatIfResult[] | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!autonomy) return;
    timer.current = setInterval(() => setWorld((w) => step(w)), speed);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [speed, autonomy]);

  const setHazard = useCallback((hazard: HazardType) => {
    setWorld((w) => ({ ...createWorld(hazard), intensity: w.intensity }));
    setWhatIfs(null);
  }, []);

  const surge = useCallback((delta: number) => {
    setWorld((w) => ({ ...w, intensity: Math.min(1, Math.max(0.05, w.intensity + delta)) }));
  }, []);

  const advance = useCallback(() => setWorld((w) => step(w)), []);

  const runWhatIf = useCallback(() => {
    setWhatIfs([
      whatIf(world, "Baseline — continue current plan", (w) => w),
      whatIf(world, "Hazard escalates +30%", (w) => ({
        ...w,
        intensity: Math.min(1, w.intensity + 0.3),
      })),
      whatIf(world, "Double shelter + boat capacity", (w) => ({
        ...w,
        resources: w.resources.map((r) =>
          r.kind === "shelter" || r.kind === "boat" ? { ...r, capacity: r.capacity * 2 } : r,
        ),
      })),
      whatIf(world, "Lose 40% of transport fleet", (w) => ({
        ...w,
        resources: w.resources.map((r) =>
          r.kind === "ambulance" || r.kind === "boat"
            ? { ...r, capacity: Math.floor(r.capacity * 0.6) }
            : r,
        ),
      })),
    ]);
  }, [world]);

  return {
    world,
    speed,
    setSpeed,
    autonomy,
    setAutonomy,
    setHazard,
    surge,
    advance,
    whatIfs,
    runWhatIf,
  };
}
