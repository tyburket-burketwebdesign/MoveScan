"use client";

import { useCallback, useEffect, useState } from "react";
import { store } from "./store";
import { DEFAULT_SETTINGS, type GymSettings } from "./types";

export function useSettings() {
  const [settings, setSettings] = useState<GymSettings | null>(null);
  useEffect(() => {
    store.getSettings().then(setSettings).catch(() => setSettings(DEFAULT_SETTINGS));
  }, []);
  const save = useCallback(async (patch: Partial<GymSettings>) => {
    const next = await store.saveSettings(patch);
    setSettings(next);
    window.dispatchEvent(new Event("movescan:settings"));
    return next;
  }, []);
  // Keep every mounted copy (e.g. the sidebar plan badge) in sync after a save.
  useEffect(() => {
    const h = () => store.getSettings().then(setSettings);
    window.addEventListener("movescan:settings", h);
    return () => window.removeEventListener("movescan:settings", h);
  }, []);
  return { settings, save };
}
