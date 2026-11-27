import { create } from "zustand";

interface PresenceStore {
  /** Number of tabs currently active on the site, or null before the first beat. */
  online: number | null;
  setOnline: (online: number) => void;
}

export const usePresence = create<PresenceStore>((set) => ({
  online: null,
  setOnline: (online) => set({ online }),
}));
