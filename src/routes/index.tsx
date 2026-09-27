import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ShieldCheck, Star, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChatWidget } from "@/components/site/ChatWidget";
import heroImg from "@/assets/clinica-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dentista do Povo — Clínica Odontológica" },
      {
        name: "description",
        content:
          "Seu sorriso merece cuidado de verdade. Tecnologia de ponta, especialistas premiados e suporte online gratuito.",
      },
      { property: "og:title", content: "Dentista do Povo — Clínica Odontológica" },
      {
        property: "og:description",
        content:
          "Seu sorriso merece cuidado de verdade. Tecnologia de ponta, especialistas premiados e suporte online gratuito.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Clínica Odontológica
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Seu sorriso merece <span className="text-primary">cuidado de verdade.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Tecnologia de ponta, especialistas premiados e um atendimento humanizado que faz a
            diferença desde a primeira consulta.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/contato"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02]"
            >
              Agendar Avaliação Grátis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/servicos"
              className="inline-flex items-center rounded-full border border-border bg-card px-7 py-3.5 font-bold transition-colors hover:bg-accent"
            >
              Ver Serviços
            </Link>
          </div>
          <div className="mt-10 flex gap-10">
            <div>
              <p className="text-2xl font-extrabold">+15k</p>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Sorrisos
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-2xl font-extrabold">
                4.9 <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              </p>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Google
              </p>
            </div>
            <div>
              <p className="text-2xl font-extrabold">24h</p>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Urgência
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <img
            src={heroImg}
            alt="Consultório moderno da clínica Dentista do Povo"
            className="w-full rounded-3xl object-cover shadow-2xl"
          />
          <div className="absolute -bottom-5 left-6 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-xl">
            <ShieldCheck className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-sm font-bold">Consulta grátis</p>
              <p className="text-xs text-muted-foreground">Sem compromisso</p>
            </div>
          </div>
        </div>
      </section>

      {/* Suporte online */}
      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Ficou com dúvida? Fale com a gente agora
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Nosso suporte online é gratuito e sem cadastro. Clique no botão de chat no canto da tela
            e converse direto com nossa equipe.
          </p>
        </div>
      </section>

      <SiteFooter />
      <ChatWidget />
    </div>
  );
}
