import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { mountPublicZoom } from "@/lib/zoom";

const LINKS = [
  { to: "/", label: "Início" },
  { to: "/servicos", label: "Serviços" },
  { to: "/galeria", label: "Galeria" },
  { to: "/blog", label: "Blog" },
  { to: "/contato", label: "Contato" },
  { to: "/entrar", label: "Área Restrita" },
] as const;

export function SiteHeader() {
  useLayoutEffect(() => mountPublicZoom(), []);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  // Fecha o menu do celular ao trocar de página.
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary font-extrabold text-primary-foreground">
            D
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-extrabold">Dentista do Povo</span>
            <span className="block truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Clínica Odontológica
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`transition-colors hover:text-foreground ${isActive(l.to) ? "text-foreground" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/contato"
            className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 sm:px-5"
          >
            <span className="sm:hidden">Agendar</span>
            <span className="hidden sm:inline">Agendar Consulta</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="menu-celular"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-accent md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="menu-celular"
          className="animate-in fade-in slide-in-from-top-2 border-t border-border bg-background px-4 pb-4 pt-2 duration-200 md:hidden"
        >
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`block rounded-xl px-3 py-3 text-base font-semibold transition-colors hover:bg-accent ${
                isActive(l.to) ? "bg-primary/10 text-primary" : "text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
