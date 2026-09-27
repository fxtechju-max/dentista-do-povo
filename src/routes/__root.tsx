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
import { THEME_COLORS } from "../lib/theme";

// Runs before hydration so the admin panel paints with the saved mode/color
// immediately — without this, SSR always renders the light/default-blue
// theme first and the real theme only appears after React mounts, which
// looks like "the color/dark mode doesn't work" on every hard refresh.
const THEME_INIT_SCRIPT = `(function(){
  try {
    if (!location.pathname.startsWith('/admin')) return;
    var raw = localStorage.getItem('ddp-admin-theme');
    var prefs = raw ? JSON.parse(raw) : {};
    var colors = ${JSON.stringify(Object.fromEntries(THEME_COLORS.map((c) => [c.id, c.primary])))};
    var primary = colors[prefs.color] || colors['azul'];
    var isDark = prefs.mode === 'dark' || (prefs.mode !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    var m = /oklch\\(\\s*[\\d.]+\\s+[\\d.]+\\s+([\\d.]+)/.exec(primary);
    var hue = m ? m[1] : '262.9';
    var root = document.documentElement.style;
    root.setProperty('--primary', primary);
    root.setProperty('--primary-foreground', 'oklch(0.984 0.003 247.858)');
    root.setProperty('--ring', primary);
    root.setProperty('--sidebar-primary', primary);
    root.setProperty('--sidebar-ring', primary);
    root.setProperty('--chart-1', primary);
    var accent = isDark ? 'oklch(0.32 0.07 ' + hue + ')' : 'oklch(0.955 0.03 ' + hue + ')';
    var accentFg = isDark ? 'oklch(0.93 0.02 ' + hue + ')' : 'oklch(0.32 0.09 ' + hue + ')';
    root.setProperty('--accent', accent);
    root.setProperty('--accent-foreground', accentFg);
    root.setProperty('--sidebar-accent', accent);
    root.setProperty('--sidebar-accent-foreground', accentFg);
  } catch (e) {}
})();`;

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
  head: () => {
    const adsenseClientId = import.meta.env["VITE_GOOGLE_ADSENSE_CLIENT_ID"] as string | undefined;
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
      scripts: adsenseClientId
        ? [
            {
              async: true,
              src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`,
              crossOrigin: "anonymous" as const,
            },
          ]
        : [],
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
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster richColors />
    </QueryClientProvider>
  );
}
