import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

// Renders a Google AdSense ad unit. No-ops entirely until
// VITE_GOOGLE_ADSENSE_CLIENT_ID is configured, so the site behaves exactly
// the same before the account is approved.
export function AdSlot({
  slot,
  format = "auto",
  className,
}: {
  slot: string;
  format?: string;
  className?: string;
}) {
  const clientId = import.meta.env["VITE_GOOGLE_ADSENSE_CLIENT_ID"] as string | undefined;
  const pushed = useRef(false);

  useEffect(() => {
    if (!clientId || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
      pushed.current = true;
    } catch {
      // AdSense script blocked or not yet loaded — nothing to recover here.
    }
  }, [clientId]);

  if (!clientId) return null;

  return (
    <ins
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block" }}
      data-ad-client={clientId}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
