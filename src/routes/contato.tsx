import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Phone, Clock } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChatWidget } from "@/components/site/ChatWidget";
import { db } from "@/integrations/mysql/client";
import { DEFAULT_CLINIC_WHATSAPP, whatsappLink } from "@/lib/whatsapp-link";

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

type ClinicInfo = {
  clinic_name: string | null;
  phone: string | null;
  address: string | null;
  whatsapp_number: string | null;
};

function Contato() {
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);

  useEffect(() => {
    db.from("clinic_settings")
      .select("clinic_name, phone, address, whatsapp_number")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => setClinic(data as ClinicInfo | null));
  }, []);

  // WhatsApp de Configurações; sem ele, o telefone da clínica; por fim o padrão.
  const whatsappHref = whatsappLink(
    clinic?.whatsapp_number || clinic?.phone || DEFAULT_CLINIC_WHATSAPP,
  )!;

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

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Conversar com a clínica no WhatsApp"
            className="group flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/70 p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-900 dark:bg-emerald-950/30"
          >
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-500/30 transition-transform duration-300 group-hover:scale-110">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/40 [animation-duration:2.5s]" />
              <WhatsAppIcon className="relative h-8 w-8" />
            </span>
            <h2 className="mt-4 text-2xl font-extrabold">Fale no WhatsApp</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Sem cadastro, sem espera. Clique aqui e converse agora com nossa equipe pelo WhatsApp.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors group-hover:bg-[#1ebe5b]">
              <WhatsAppIcon className="h-4 w-4" /> Abrir conversa
            </span>
          </a>
        </div>
      </main>
      <SiteFooter />
      <ChatWidget />
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.43 9.43 0 0 1-4.8-1.32l-.35-.2-3.57.93.96-3.48-.23-.36a9.4 9.4 0 0 1-1.44-5.03c0-5.2 4.24-9.43 9.45-9.43a9.4 9.4 0 0 1 6.68 2.77 9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.44-9.45 9.44m8.04-17.48A11.3 11.3 0 0 0 12.05.7C5.78.7.67 5.8.67 12.07c0 2 .52 3.96 1.52 5.69L.57 23.7l6.07-1.6a11.33 11.33 0 0 0 5.4 1.38h.01c6.27 0 11.38-5.1 11.38-11.38 0-3.04-1.18-5.9-3.34-8.05" />
    </svg>
  );
}
