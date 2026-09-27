import { Link } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { mountPublicZoom } from "@/lib/zoom";

export function SiteHeader() {
  useLayoutEffect(() => mountPublicZoom(), []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-extrabold text-primary-foreground">
            D
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-extrabold">Dentista do Povo</span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Clínica Odontológica
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex">
          <Link to="/" className="transition-colors hover:text-foreground">
            Início
          </Link>
          <Link to="/servicos" className="transition-colors hover:text-foreground">
            Serviços
          </Link>
          <Link to="/galeria" className="transition-colors hover:text-foreground">
            Galeria
          </Link>
          <Link to="/blog" className="transition-colors hover:text-foreground">
            Blog
          </Link>
          <Link to="/contato" className="transition-colors hover:text-foreground">
            Contato
          </Link>
          <Link to="/entrar" className="transition-colors hover:text-foreground">
            Área Restrita
          </Link>
        </nav>

        <Link
          to="/contato"
          className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Agendar Consulta
        </Link>
      </div>
    </header>
  );
}
