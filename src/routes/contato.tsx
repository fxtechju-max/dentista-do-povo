import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Phone, Clock, MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChatWidget } from "@/components/site/ChatWidget";
import { db } from "@/integrations/mysql/client";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Dentista do Povo" },
      {
        name: "description",
        content: "Agende sua consulta ou fale com nossa equipe pelo chat online gratuito.",
      },
      { property: "og:title", content: "Contato — Dentista do Povo" },
      {
        property: "og:description",
        content: "Agende sua consulta ou fale com nossa equipe pelo chat online gratuito.",
      },
    ],
  }),
  component: Contato,
});

type ClinicInfo = { clinic_name: string | null; phone: string | null; address: string | null };

function Contato() {
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);

  useEffect(() => {
    db.from("clinic_settings")
      .select("clinic_name, phone, address")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => setClinic(data as ClinicInfo | null));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight">Fale com a gente</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Estamos prontos para cuidar do seu sorriso. Escolha o canal que preferir.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
              <MapPin className="mt-0.5 h-6 w-6 text-primary" />
              <div>
                <p className="font-bold">Endereço</p>
                <p className="text-sm text-muted-foreground">
                  {clinic?.address || "Endereço em breve"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
              <Phone className="mt-0.5 h-6 w-6 text-primary" />
              <div>
                <p className="font-bold">Telefone / WhatsApp</p>
                <p className="text-sm text-muted-foreground">
                  {clinic?.phone || "Telefone em breve"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
              <Clock className="mt-0.5 h-6 w-6 text-primary" />
              <div>
                <p className="font-bold">Horário de atendimento</p>
                <p className="text-sm text-muted-foreground">
                  Seg a Sáb, 8h às 19h · Urgências 24h
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-primary/5 p-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <MessageCircle className="h-8 w-8" />
            </span>
            <h2 className="mt-4 text-2xl font-extrabold">Suporte online grátis</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Sem cadastro, sem espera. Clique no botão azul de chat no canto inferior direito da
              tela e converse agora com nossa equipe.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
      <ChatWidget />
    </div>
  );
}
