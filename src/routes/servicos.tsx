import { createFileRoute } from "@tanstack/react-router";
import { Smile, Sparkles, ShieldCheck, HeartPulse, Baby, Zap } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ChatWidget } from "@/components/site/ChatWidget";

export const Route = createFileRoute("/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços — Dentista do Povo" },
      {
        name: "description",
        content:
          "Limpeza, clareamento, implantes, ortodontia, odontopediatria e urgência 24h. Conheça os serviços da Dentista do Povo.",
      },
      { property: "og:title", content: "Serviços — Dentista do Povo" },
      {
        property: "og:description",
        content: "Limpeza, clareamento, implantes, ortodontia, odontopediatria e urgência 24h.",
      },
    ],
  }),
  component: Servicos,
});

const servicos = [
  {
    icon: Sparkles,
    titulo: "Limpeza e Profilaxia",
    desc: "Prevenção completa para manter seu sorriso saudável o ano todo.",
  },
  {
    icon: Smile,
    titulo: "Clareamento Dental",
    desc: "Resultados visíveis desde a primeira sessão, com segurança.",
  },
  {
    icon: ShieldCheck,
    titulo: "Implantes",
    desc: "Recupere a função e a estética do seu sorriso com tecnologia 3D.",
  },
  {
    icon: Zap,
    titulo: "Ortodontia",
    desc: "Aparelhos convencionais e alinhadores invisíveis.",
  },
  {
    icon: Baby,
    titulo: "Odontopediatria",
    desc: "Atendimento especial e lúdico para as crianças.",
  },
  {
    icon: HeartPulse,
    titulo: "Urgência 24h",
    desc: "Dor de dente não espera. Atendemos emergências todos os dias.",
  },
];

function Servicos() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight">Nossos Serviços</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Cuidado completo para toda a família, do check-up de rotina aos tratamentos mais
          avançados.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {servicos.map((s) => (
            <div
              key={s.titulo}
              className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-lg font-bold">{s.titulo}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </main>
      <ChatWidget />
    </div>
  );
}
