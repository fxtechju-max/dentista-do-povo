import { useEffect, useRef } from "react";
import { useLoaderData } from "@tanstack/react-router";
import type { AdPosition } from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

// Bloco de anúncio do Google AdSense. O ID de editor e o ID de cada bloco vêm
// de Configurações › Anúncios (carregados no layout raiz). Se o AdSense estiver
// desligado ou o bloco não tiver ID, não renderiza nada.
export function AdSlot({ position, className }: { position: AdPosition; className?: string }) {
  const adsense = useLoaderData({ from: "__root__" });
  const clientId = adsense?.enabled ? adsense.clientId : null;
  const slot = clientId ? adsense.slots[position] : null;
  const pushed = useRef(false);

  useEffect(() => {
    if (!clientId || !slot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
      pushed.current = true;
    } catch {
      // Script bloqueado (ex.: bloqueador de anúncios) — nada a fazer.
    }
  }, [clientId, slot]);

  if (!clientId || !slot) return null;

  return (
    <div className={className}>
      <p className="mb-1 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        Publicidade
      </p>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
