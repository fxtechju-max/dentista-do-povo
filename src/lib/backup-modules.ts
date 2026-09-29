// Módulos que o administrador pode apagar em Backup › Apagar dados. Cada um
// lista as tabelas dele; "requires" diz o que precisa sair junto por causa das
// ligações no banco (ex.: apagar pacientes apaga a agenda deles).

export type DeleteModuleId =
  | "pacientes"
  | "agenda"
  | "orcamentos"
  | "financeiro"
  | "contas"
  | "receitas"
  | "documentos"
  | "odontograma"
  | "prontuario"
  | "tratamentos"
  | "crm"
  | "whatsapp"
  | "blog"
  | "servicos"
  | "suporte"
  | "ia";

export type DeleteModule = {
  id: DeleteModuleId;
  label: string;
  emoji: string;
  description: string;
  /** Tabelas apagadas por inteiro. */
  tables: string[];
  /** Tabela principal para mostrar a contagem. */
  main: string;
  /** Módulos que saem junto. */
  requires?: DeleteModuleId[];
};

export const DELETE_MODULES: DeleteModule[] = [
  {
    id: "pacientes",
    label: "Pacientes",
    emoji: "👥",
    description: "Cadastros e tudo ligado a eles (agenda, orçamentos, prontuário, odontograma...).",
    tables: ["patients"],
    main: "patients",
    requires: ["agenda", "orcamentos", "receitas", "odontograma", "prontuario"],
  },
  {
    id: "agenda",
    label: "Agenda",
    emoji: "📅",
    description: "Consultas marcadas.",
    tables: ["appointments"],
    main: "appointments",
  },
  {
    id: "orcamentos",
    label: "Orçamentos",
    emoji: "🧾",
    description: "Orçamentos dos pacientes.",
    tables: ["budgets"],
    main: "budgets",
  },
  {
    id: "financeiro",
    label: "Financeiro",
    emoji: "💰",
    description: "Pagamentos recebidos e a receber.",
    tables: ["payments"],
    main: "payments",
  },
  {
    id: "contas",
    label: "Contas a pagar/receber",
    emoji: "📒",
    description: "Contas e despesas lançadas.",
    tables: ["finance_entries"],
    main: "finance_entries",
  },
  {
    id: "receitas",
    label: "Receitas",
    emoji: "💊",
    description: "Receitas emitidas (e os documentos gerados delas).",
    tables: ["prescriptions"],
    main: "prescriptions",
  },
  {
    id: "documentos",
    label: "Documentos",
    emoji: "📄",
    description: "Atestados, termos e outros documentos.",
    tables: ["documents"],
    main: "documents",
  },
  {
    id: "odontograma",
    label: "Odontograma",
    emoji: "🦷",
    description: "Registros dos dentes, planos de tratamento e fotos.",
    tables: ["tooth_attachments", "tooth_procedures", "tooth_records"],
    main: "tooth_procedures",
  },
  {
    id: "prontuario",
    label: "Prontuário e anamnese",
    emoji: "🩺",
    description: "Evoluções clínicas e fichas de anamnese.",
    tables: ["clinical_notes", "patient_anamnesis"],
    main: "clinical_notes",
  },
  {
    id: "tratamentos",
    label: "Tratamentos",
    emoji: "🩹",
    description: "Catálogo de tratamentos e preços.",
    tables: ["treatments"],
    main: "treatments",
  },
  {
    id: "crm",
    label: "CRM (contatos)",
    emoji: "📈",
    description: "Leads e contatos do CRM.",
    tables: ["leads"],
    main: "leads",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    emoji: "💬",
    description: "Contatos salvos do WhatsApp.",
    tables: ["whatsapp_contacts"],
    main: "whatsapp_contacts",
  },
  {
    id: "blog",
    label: "Blog",
    emoji: "📰",
    description: "Posts do blog do site.",
    tables: ["blog_posts"],
    main: "blog_posts",
  },
  {
    id: "servicos",
    label: "Serviços do site",
    emoji: "✨",
    description: "Serviços mostrados no site público.",
    tables: ["services"],
    main: "services",
  },
  {
    id: "suporte",
    label: "Suporte (chat)",
    emoji: "🗨️",
    description: "Conversas e mensagens do chat do site.",
    tables: ["messages", "conversations"],
    main: "conversations",
  },
  {
    id: "ia",
    label: "Histórico da IA",
    emoji: "🤖",
    description: "Pesquisas feitas no assistente de IA.",
    tables: ["ai_search_history"],
    main: "ai_search_history",
  },
];

// Filhos antes dos pais, para as ligações do banco não bloquearem.
const DELETE_ORDER = [
  "messages",
  "conversations",
  "tooth_attachments",
  "tooth_procedures",
  "tooth_records",
  "clinical_notes",
  "patient_anamnesis",
  "documents",
  "prescriptions",
  "payments",
  "budgets",
  "appointments",
  "finance_entries",
  "patients",
  "treatments",
  "leads",
  "whatsapp_contacts",
  "blog_posts",
  "services",
  "ai_search_history",
];

/** Módulos escolhidos + os que precisam sair junto. */
export function withRequired(ids: DeleteModuleId[]): DeleteModuleId[] {
  const out = new Set<DeleteModuleId>();
  const visit = (id: DeleteModuleId) => {
    if (out.has(id)) return;
    out.add(id);
    for (const r of DELETE_MODULES.find((m) => m.id === id)?.requires ?? []) visit(r);
  };
  ids.forEach(visit);
  return DELETE_MODULES.map((m) => m.id).filter((id) => out.has(id));
}

export type DeleteStep = { table: string; where?: string };

/** Ordem segura de DELETEs para os módulos escolhidos. */
export function deletePlan(ids: DeleteModuleId[]): DeleteStep[] {
  const modules = withRequired(ids);
  const full = new Set(
    DELETE_MODULES.filter((m) => modules.includes(m.id)).flatMap((m) => m.tables),
  );
  const partial = new Map<string, string>();
  if (modules.includes("pacientes")) {
    // Pagamentos e documentos avulsos (sem paciente) continuam.
    if (!full.has("payments")) partial.set("payments", "patient_id IS NOT NULL");
    if (!full.has("documents")) partial.set("documents", "patient_id IS NOT NULL");
  }
  return DELETE_ORDER.flatMap((table): DeleteStep[] => {
    if (full.has(table)) return [{ table }];
    const where = partial.get(table);
    return where ? [{ table, where }] : [];
  });
}
