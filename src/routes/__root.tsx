import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "../components/ui/sonner";
import { refreshPreferences } from "../lib/preferences";
import { clearLegacyStorage } from "../lib/clear-legacy-storage";
import { ADSENSE_OFF, loadAdsense } from "../lib/adsense";
import { installDomGuard } from "../lib/dom-guard";

// Antes do React montar: extensões do navegador não derrubam mais a tela.
if (typeof window !== "undefined") installDomGuard();

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // AdSense (Configurações › Anúncios): só no site público, nunca no painel/login.
  loader: ({ location }) =>
    /^\/(admin|entrar)(\/|$)/.test(location.pathname) ? ADSENSE_OFF : loadAdsense(),
  staleTime: 5 * 60_000,
  head: ({ loaderData }) => {
    const adsense = loaderData ?? ADSENSE_OFF;
    const adsenseClientId = adsense.enabled ? adsense.clientId : null;
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "Dentista do Povo — Clínica Odontológica" },
        {
          name: "description",
          content:
            "Clínica odontológica com atendimento humanizado, tecnologia de ponta e suporte online direto com nossa equipe.",
        },
        { property: "og:title", content: "Dentista do Povo — Clínica Odontológica" },
        {
          property: "og:description",
          content:
            "Clínica odontológica com atendimento humanizado, tecnologia de ponta e suporte online direto com nossa equipe.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(adsenseClientId ? [{ name: "google-adsense-account", content: adsenseClientId }] : []),
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
        },
        { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      ],
      // O script do AdSense é carregado depois da hidratação (ver RootComponent):
      // anúncios automáticos inserem elementos na página e, se rodassem antes do
      // React montar, causariam erro de hidratação. A verificação do Google usa a
      // meta "google-adsense-account" acima, que continua no <head>.
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** Injeta o script do AdSense uma única vez, depois que a página já montou. */
function useAdsenseScript(clientId: string | null) {
  useEffect(() => {
    if (!clientId || document.querySelector("script[data-adsense]")) return;
    // Espera a página terminar de carregar e o navegador ficar livre: o site
    // aparece primeiro e os anúncios (≈1 MB do Google) entram logo depois.
    let cancelled = false;
    let idleId: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const inject = () => {
      if (cancelled || document.querySelector("script[data-adsense]")) return;
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
      script.crossOrigin = "anonymous";
      script.dataset["adsense"] = "";
      document.head.appendChild(script);
    };
    const whenIdle = () => {
      if ("requestIdleCallback" in window)
        idleId = window.requestIdleCallback(inject, { timeout: 3000 });
      else timer = setTimeout(inject, 1500);
    };
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", whenIdle);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timer) clearTimeout(timer);
    };
  }, [clientId]);
}

function RootComponent() {
  useEffect(() => {
    clearLegacyStorage();
    void refreshPreferences();
  }, []);
  const adsense = Route.useLoaderData();
  useAdsenseScript(adsense?.enabled ? adsense.clientId : null);
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster richColors />
    </QueryClientProvider>
  );
}
