import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_CREATORS, type Creator, type Payment } from "./creators";

type State = {
  creators: Record<string, Creator>;
  currentHandle: string;
  hydrated: boolean;
  setCurrent: (handle: string) => void;
  upsertCreator: (c: Creator) => void;
  addPayment: (handle: string, p: Payment) => void;
  resetDemo: () => void;
  disconnect: () => void;
};

const seed = (): Record<string, Creator> =>
  Object.fromEntries(SEED_CREATORS.map((c) => [c.handle, c]));

export const useKivo = create<State>()(
  persist(
    (set) => ({
      creators: seed(),
      currentHandle: "nikhil",
      hydrated: false,
      setCurrent: (handle) => set({ currentHandle: handle }),
      upsertCreator: (c) =>
        set((s) => ({ creators: { ...s.creators, [c.handle]: c } })),
      addPayment: (handle, p) =>
        set((s) => {
          const c = s.creators[handle];
          if (!c) return s;
          return {
            creators: {
              ...s.creators,
              [handle]: { ...c, payments: [p, ...c.payments] },
            },
          };
        }),
      resetDemo: () => set({ creators: seed(), currentHandle: "nikhil" }),
      disconnect: () => set({ currentHandle: "" }),
    }),
    {
      name: "fyora-demo-v1",
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export const useCreator = (handle: string): Creator | undefined =>
  useKivo((s) => s.creators[handle]);
