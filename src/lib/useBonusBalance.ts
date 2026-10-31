"use client";

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type BonusBalanceState = {
  userId: string;
  balance: number | null;
  loading: boolean;
  error: string | null;
};

/** Read the same server-calculated balance that the account and checkout API use. */
export function useBonusBalance(userId: string | null) {
  const [state, setState] = useState<BonusBalanceState | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const refresh = useCallback(() => setRefreshCount((count) => count + 1), []);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();

    const load = async () => {
      setState({ userId, balance: null, loading: true, error: null });
      try {
        if (!supabase) throw new Error("Авторизация временно недоступна");
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.access_token || data.session.user.id !== userId) {
          throw new Error("Войдите в личный кабинет повторно");
        }
        const response = await fetch("/api/account/loyalty", {
          headers: { authorization: `Bearer ${data.session.access_token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error("Не удалось проверить баланс бонусов");
        const balance = Number(payload.bonusPoints);
        if (!Number.isSafeInteger(balance) || balance < 0) throw new Error("Получен некорректный баланс бонусов");
        if (!controller.signal.aborted) setState({ userId, balance, loading: false, error: null });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({ userId, balance: null, loading: false, error: error instanceof Error ? error.message : "Не удалось проверить баланс бонусов" });
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [userId, refreshCount]);

  const current = state?.userId === userId ? state : null;
  return {
    balance: current?.balance ?? null,
    loading: Boolean(userId) && (!current || current.loading),
    error: current?.error ?? null,
    refresh,
  };
}
