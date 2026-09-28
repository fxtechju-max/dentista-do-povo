import {
  Grid2x2,
  Calendar,
  Users,
  Receipt,
  Wallet,
  Handshake,
  MessageCircle,
  Phone,
  FileText,
  Pill,
  BarChart3,
  Bot,
  Globe,
  Settings,
  ArrowLeftRight,
  DatabaseBackup,
  BookOpen,
  Printer,
  type LucideIcon,
} from "lucide-react";
import { ToothIcon } from "@/components/ToothIcon";

export type AdminModule = {
  id: string;
  name: string;
  label: string;
  to: string;
  icon: LucideIcon | typeof ToothIcon;
  description: string;
  iconColor: string;
  iconBg: string;
};

export const DASHBOARD_MODULE: AdminModule = {
  id: "dashboard",
  name: "Dashboard",
  label: "📊 Dashboard",
  to: "/admin/dashboard",
  icon: Grid2x2,
  description: "Visão geral e indicadores",
  iconColor: "text-primary",
  iconBg: "bg-primary/10",
};

export const SETTINGS_MODULE: AdminModule = {
  id: "configuracoes",
  name: "Configurações",
  label: "⚙️ Configurações",
  to: "/admin/configuracoes",
  icon: Settings,
  description: "Perfil, clínica e módulos",
  iconColor: "text-primary",
  iconBg: "bg-primary/10",
};

// Always available (not part of the on/off list): explanations for every
// module plus the "Novidades" changelog — see src/lib/tutorial.ts.
export const TUTORIAL_MODULE: AdminModule = {
  id: "tutorial",
  name: "Tutorial",
  label: "📘 Tutorial",
  to: "/admin/tutorial",
  icon: BookOpen,
  description: "Explicações e novidades",
  iconColor: "text-primary",
  iconBg: "bg-primary/10",
};

// Every module here can be turned on/off from Configurações. Dashboard and
// Configurações themselves are core pages and are not part of this list.
export const ADMIN_MODULES: AdminModule[] = [
  {
    id: "agenda",
    name: "Agenda",
    label: "📅 Agenda",
    to: "/admin/agenda",
    icon: Calendar,
    description: "Consultas e calendário",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "pacientes",
    name: "Pacientes",
    label: "👥 Pacientes",
    to: "/admin/pacientes",
    icon: Users,
    description: "Cadastro e prontuário",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "tratamentos",
    name: "Tratamentos",
    label: "🦷 Tratamentos",
    to: "/admin/tratamentos",
    icon: ToothIcon,
    description: "Catálogo de procedimentos",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "orcamentos",
    name: "Orçamentos",
    label: "🧾 Orçamentos",
    to: "/admin/orcamentos",
    icon: Receipt,
    description: "Propostas de tratamento",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "financeiro",
    name: "Financeiro",
    label: "💰 Financeiro",
    to: "/admin/financeiro",
    icon: Wallet,
    description: "Pagamentos e recebimentos",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "contas",
    name: "Contas a Pagar/Receber",
    label: "📥📤 Contas a Pagar/Receber",
    to: "/admin/contas",
    icon: ArrowLeftRight,
    description: "Despesas e receitas da clínica",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "crm",
    name: "CRM",
    label: "🤝 CRM",
    to: "/admin/crm",
    icon: Handshake,
    description: "Leads e oportunidades",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "suporte",
    name: "Suporte",
    label: "💬 Suporte",
    to: "/admin/suporte",
    icon: MessageCircle,
    description: "Chat com visitantes do site",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    label: "📱 WhatsApp",
    to: "/admin/whatsapp",
    icon: Phone,
    description: "Contatos via WhatsApp",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "documentos",
    name: "Documentos",
    label: "📄 Documentos",
    to: "/admin/documentos",
    icon: FileText,
    description: "Exames e arquivos",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "receitas",
    name: "Receitas",
    label: "💊 Receitas",
    to: "/admin/receitas",
    icon: Pill,
    description: "Prescrições",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "modelos",
    name: "Modelos de Documentos",
    label: "🖨️ Modelos de Documentos",
    to: "/admin/modelos",
    icon: Printer,
    description: "Receituário, atestado e declarações",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "odontograma",
    name: "Odontograma",
    label: "🦷 Odontograma",
    to: "/admin/odontograma",
    icon: ToothIcon,
    description: "Atalho para o odontograma do paciente",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "relatorios",
    name: "Relatórios",
    label: "📈 Relatórios",
    to: "/admin/relatorios",
    icon: BarChart3,
    description: "Gráficos e métricas",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "ia",
    name: "IA",
    label: "🤖 IA",
    to: "/admin/ia",
    icon: Bot,
    description: "Secretária virtual",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "cms-site",
    name: "CMS Site",
    label: "🌐 CMS Site",
    to: "/admin/cms-site",
    icon: Globe,
    description: "Serviços e blog do site",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    id: "backup",
    name: "Backup",
    label: "💾 Backup",
    to: "/admin/backup",
    icon: DatabaseBackup,
    description: "Exportar, restaurar e apagar dados",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
];

/** Aplica a ordem salva (ids); módulos novos ou fora da lista vão para o fim. */
export function sortModules<T extends { id: string }>(modules: T[], order: string[]): T[] {
  const position = new Map(order.map((id, i) => [id, i]));
  return [...modules].sort(
    (a, b) =>
      (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (position.get(b.id) ?? Number.MAX_SAFE_INTEGER) || modules.indexOf(a) - modules.indexOf(b),
  );
}
