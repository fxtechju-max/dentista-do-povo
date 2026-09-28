import {
  ChevronRight,
  Building2,
  CreditCard,
  Grid2x2,
  History,
  Palette,
  ShieldCheck,
  Sparkles,
  Users,
  User as UserIcon,
  Megaphone,
} from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

// Seções de Configurações, agrupadas no menu lateral.
export const SECTIONS = [
  {
    id: "perfil",
    group: "Conta",
    label: "Perfil",
    description: "Seu nome de exibição",
    icon: UserIcon,
  },
  {
    id: "seguranca",
    group: "Conta",
    label: "Segurança",
    description: "Email e senha de acesso",
    icon: ShieldCheck,
  },
  {
    id: "clinica",
    group: "Clínica",
    label: "Dados da clínica",
    description: "Nome, contatos e redes sociais",
    icon: Building2,
  },
  {
    id: "pagamentos",
    group: "Clínica",
    label: "Formas de pagamento",
    description: "PIX, dinheiro, cartões e outras",
    icon: CreditCard,
  },
  {
    id: "modulos",
    group: "Clínica",
    label: "Módulos",
    description: "Ative o que a clínica usa",
    icon: Grid2x2,
  },
  {
    id: "usuarios",
    group: "Equipe",
    label: "Administradores",
    description: "Quem acessa o painel",
    icon: Users,
  },
  {
    id: "anuncios",
    group: "Site",
    label: "Anúncios (AdSense)",
    description: "Google AdSense e ads.txt",
    icon: Megaphone,
  },
  {
    id: "aparencia",
    group: "Sistema",
    label: "Aparência",
    description: "Tema, cor e zoom",
    icon: Palette,
  },
  {
    id: "ia",
    group: "Sistema",
    label: "Inteligência Artificial",
    description: "Provedor, modelo e chave",
    icon: Sparkles,
  },
  {
    id: "transparencia",
    group: "Sistema",
    label: "Transparência",
    description: "Histórico de atividades",
    icon: History,
  },
] as const;
export type SectionId = (typeof SECTIONS)[number]["id"];
export const SECTION_GROUPS = ["Conta", "Clínica", "Equipe", "Site", "Sistema"] as const;

export function SectionHeader({ id }: { id: SectionId }) {
  const section = SECTIONS.find((x) => x.id === id)!;
  const Icon = section.icon;
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {section.group}
        </p>
        <h2 className="text-xl font-extrabold leading-tight">{section.label}</h2>
      </div>
    </div>
  );
}

/** Menu lateral das Configurações (usar dentro de <Tabs orientation="vertical">). */
export function SettingsNav() {
  return (
    <>
      {/* Celular/tablet: faixa deslizante de atalhos no topo */}
      <TabsList className="sticky top-0 z-10 flex h-auto w-full gap-1.5 rounded-2xl border border-border bg-card p-1.5 shadow-sm lg:hidden">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <TabsTrigger
              key={section.id}
              value={section.id}
              className="shrink-0 gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground"
            >
              <Icon className="h-3.5 w-3.5" /> {section.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {/* Computador: menu lateral agrupado */}
      <TabsList className="hidden h-auto w-full flex-col items-stretch gap-0 rounded-2xl border border-border bg-card p-2 shadow-sm lg:sticky lg:top-4 lg:flex">
        {SECTION_GROUPS.map((group, gi) => (
          <div
            key={group}
            className="animate-in fade-in slide-in-from-left-2 fill-mode-both"
            style={{ animationDelay: `${gi * 60}ms`, animationDuration: "400ms" }}
          >
            <p className="px-3 pb-1 pt-3 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground first:pt-1">
              {group}
            </p>
            {SECTIONS.filter((x) => x.group === group).map((section) => {
              const Icon = section.icon;
              return (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="group flex w-full items-center justify-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 hover:bg-accent data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground data-[state=active]:shadow-md"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-data-[state=active]:bg-white/20 group-data-[state=active]:text-primary-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{section.label}</span>
                    <span className="block truncate text-[11px] font-normal opacity-70">
                      {section.description}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-60 group-data-[state=active]:opacity-100" />
                </TabsTrigger>
              );
            })}
          </div>
        ))}
      </TabsList>
    </>
  );
}
