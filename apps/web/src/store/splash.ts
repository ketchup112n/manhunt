import { create } from "zustand";

/** Must match SPLASH_MAX_LENGTH on the server. */
export const SPLASH_MAX_LENGTH = 48;

interface SplashStore {
  /** Line shown beside the logo, or null before the first presence beat. */
  text: string | null;
  setText: (text: string) => void;
}

export const useSplash = create<SplashStore>((set) => ({
  text: null,
  setText: (text) => set({ text }),
}));
