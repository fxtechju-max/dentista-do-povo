import { useCallback, useEffect, useState } from "react";
import { getCashStatus, type CashStatus } from "./cash.functions";

/** Estado do caixa do dia, recarregado depois de cada venda ou movimento. */
export function useCashStatus() {
  const [status, setStatus] = useState<CashStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setStatus(await getCashStatus());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar o caixa.");
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { status, error, refresh };
}
