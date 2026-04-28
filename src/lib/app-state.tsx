import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

export type Plan = "free" | "day" | "trip";

type State = {
  plan: Plan;
  setPlan: (p: Plan) => void;
  selectedPark: string | null;
  setSelectedPark: (slug: string) => void;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  monitored: Set<string>;
  toggleMonitor: (id: string) => boolean;
  alerts: Record<string, { earlier: boolean; available: boolean }>;
  setAlert: (id: string, key: "earlier" | "available", val: boolean) => void;
  telegramConnected: boolean;
  setTelegramConnected: (v: boolean) => void;
  upgradeOpen: boolean;
  setUpgradeOpen: (v: boolean) => void;
  parksUsed: Set<string>;
  registerParkUse: (slug: string) => void;
};

const Ctx = createContext<State | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>("free");
  const [selectedPark, setSelectedParkRaw] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [monitored, setMonitored] = useState<Set<string>>(new Set());
  const [alerts, setAlerts] = useState<Record<string, { earlier: boolean; available: boolean }>>({});
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [parksUsed, setParksUsed] = useState<Set<string>>(new Set());

  const setSelectedPark = useCallback((slug: string) => {
    setSelectedParkRaw(slug);
    setParksUsed((prev) => new Set(prev).add(slug));
  }, []);

  const registerParkUse = useCallback((slug: string) => {
    setParksUsed((prev) => (prev.has(slug) ? prev : new Set(prev).add(slug)));
  }, []);

  const toggleMonitor = useCallback(
    (id: string) => {
      let allowed = true;
      setMonitored((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          if (plan === "free" && next.size >= 3) {
            allowed = false;
            return prev;
          }
          next.add(id);
        }
        return next;
      });
      if (!allowed) setUpgradeOpen(true);
      return allowed;
    },
    [plan]
  );

  const setAlert = useCallback((id: string, key: "earlier" | "available", val: boolean) => {
    setAlerts((prev) => {
      const current = prev[id] ?? { earlier: false, available: false };
      return { ...prev, [id]: { ...current, [key]: val } };
    });
  }, []);

  const value = useMemo<State>(
    () => ({
      plan, setPlan, selectedPark, setSelectedPark, selectedDate, setSelectedDate,
      monitored, toggleMonitor, alerts, setAlert,
      telegramConnected, setTelegramConnected,
      upgradeOpen, setUpgradeOpen,
      parksUsed, registerParkUse,
    }),
    [plan, selectedPark, selectedDate, monitored, alerts, telegramConnected, upgradeOpen, parksUsed, setSelectedPark, toggleMonitor, setAlert, registerParkUse]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
