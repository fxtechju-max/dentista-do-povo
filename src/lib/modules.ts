import {
  Calendar,
  Users,
  Activity,
  Receipt,
  DollarSign,
  TrendingUp,
  MessageCircle,
  Phone,
  FileText,
  ClipboardList,
  BarChart3,
  Sparkles,
  Globe,
  type LucideIcon,
} from "lucide-react";

export type AdminModule = {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  description: string;
};

// Every module here can be turned on/off from Configurações. Dashboard and
// Configurações themselves are core pages and are not part of this list.
export const ADMIN_MODULES: AdminModule[] = [
  {
    id: "agenda",
    label: "📅 Agenda",
    to: "/admin/agenda",
    icon: Calendar,
    description: "Consultas e calendário",
  },
  {
    id: "pacientes",
    label: "👥 Pacientes",
    to: "/admin/pacientes",
    icon: Users,
    description: "Cadastro e prontuário",
  },
  {
    id: "tratamentos",
    label: "🦷 Tratamentos",
    to: "/admin/tratamentos",
    icon: Activity,
    description: "Catálogo de procedimentos",
  },
  {
    id: "orcamentos",
    label: "🧾 Orçamentos",
    to: "/admin/orcamentos",
    icon: Receipt,
    description: "Propostas de tratamento",
  },
  {
    id: "financeiro",
    label: "💰 Financeiro",
    to: "/admin/financeiro",
    icon: DollarSign,
    description: "Pagamentos e recebimentos",
  },
  {
    id: "crm",
    label: "🤝 CRM",
    to: "/admin/crm",
    icon: TrendingUp,
    description: "Leads e oportunidades",
  },
  {
    id: "suporte",
    label: "💬 Suporte",
    to: "/admin/suporte",
    icon: MessageCircle,
    description: "Chat com visitantes do site",
  },
  {
    id: "whatsapp",
    label: "📱 WhatsApp",
    to: "/admin/whatsapp",
    icon: Phone,
    description: "Contatos via WhatsApp",
  },
  {
    id: "documentos",
    label: "📄 Documentos",
    to: "/admin/documentos",
    icon: FileText,
    description: "Exames e arquivos",
  },
  {
    id: "receitas",
    label: "💊 Receitas",
    to: "/admin/receitas",
    icon: ClipboardList,
    description: "Prescrições",
  },
  {
    id: "relatorios",
    label: "📈 Relatórios",
    to: "/admin/relatorios",
    icon: BarChart3,
    description: "Gráficos e métricas",
  },
  { id: "ia", label: "🤖 IA", to: "/admin/ia", icon: Sparkles, description: "Secretária virtual" },
  {
    id: "cms-site",
    label: "🌐 CMS Site",
    to: "/admin/cms-site",
    icon: Globe,
    description: "Serviços e blog do site",
  },
];
