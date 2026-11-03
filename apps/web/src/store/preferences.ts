import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Preferences } from "@/lib/types";

interface PreferenceStore extends Preferences {
  setTheme: (theme: Preferences["theme"]) => void;
  setUnits: (units: Preferences["units"]) => void;
  setPreference: <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => void;
  resetPreferences: () => void;
}

const DEFAULTS: Preferences = {
  theme: "dark",
  units: "metric",
  sound: true,
  haptics: true,
  reduceMotion: false,
  northUp: false,
};

export const usePreferences = create<PreferenceStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setTheme: (theme) => set({ theme }),
      setUnits: (units) => set({ units }),
      setPreference: (key, value) => set({ [key]: value } as Partial<Preferences>),
      resetPreferences: () => set(DEFAULTS),
    }),
    { name: "manhunt-prefs" },
  ),
);
