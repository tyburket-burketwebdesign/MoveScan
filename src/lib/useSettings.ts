"use client";

import { useCallback, useEffect, useState } from "react";
import { store } from "./store";
import { DEFAULT_SETTINGS, type GymSettings } from "./types";

const EVENT = "app:settings";

export function useSettings() {
  const [settings, setSettings] = useState<GymSettings | null>(null);
  useEffect(() => {
    store.getSettings().then(setSettings).catch(() => setSettings(DEFAULT_SETTINGS));
  }, []);
  const save = useCallback(async (patch: Partial<GymSettings>) => {
    const next = await store.saveSettings(patch);
    setSettings(next);
    window.dispatchEvent(new Event(EVENT));
    return next;
  }, []);
  // Keep every mounted copy (e.g. the sidebar plan badge) in sync after a save.
  useEffect(() => {
    const h = () => store.getSettings().then(setSettings);
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);
  return { settings, save };
}

// Load something async for a screen. Returns [value (undefined while loading), reload].
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []): [T | undefined, () => void] {
  const [value, setValue] = useState<T>();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    fn().then((v) => live && setValue(v));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return [value, useCallback(() => setTick((t) => t + 1), [])];
}
