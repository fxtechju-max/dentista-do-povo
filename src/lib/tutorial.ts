// Conteúdo do módulo Tutorial (/admin/tutorial).
//
// REGRA DO PROJETO: toda atualização de funcionalidade deve
//   1. adicionar uma entrada NO TOPO de TUTORIAL_UPDATES (Novidades), e
//   2. atualizar/criar a seção do módulo afetado em TUTORIAL_SECTIONS.
// Escreva para a equipe da clínica: linguagem simples, passo a passo.

export type TutorialGroup =
  "comecando" | "atendimento" | "clinico" | "financeiro" | "comunicacao" | "site" | "sistema";

export const TUTORIAL_GROUPS: { id: TutorialGroup; label: string }[] = [
  { id: "comecando", label: "Começando" },
  { id: "atendimento", label: "Atendimento" },
  { id: "clinico", label: "Clínico" },
  { id: "financeiro", label: "Financeiro" },
  { id: "comunicacao", label: "Comunicação" },
  { id: "site", label: "Site" },
  { id: "sistema", label: "Sistema" },
];

export type TutorialStep = { title: string; text: string };

export type TutorialSection = {
  id: string;
  group: TutorialGroup;
  emoji: string;
  title: string;
  /** Rota do módulo, para o botão "Abrir módulo". */
  to?: string;
  summary: string;
  steps: TutorialStep[];
  tips?: string[];
};

export type TutorialUpdate = {
  /** AAAA-MM-DD */
  date: string;
  title: string;
  /** Ids de TUTORIAL_SECTIONS relacionados a esta atualização. */
  sections: string[];
  items: string[];
};

// Mais recente primeiro.
export const TUTORIAL_UPDATES: TutorialUpdate[] = [
  {
    date: "2026-09-27",
    title: "Atalho: módulo Odontograma",
    sections: ["odontograma"],
    items: [
      "Novo módulo Odontograma no painel, ao lado de Receitas.",
      "Busque o paciente pelo nome, CPF, telefone ou código e o odontograma dele abre direto.",
      "Botões para trocar de paciente ou abrir o prontuário completo.",
    ],
  },
  {
    date: "2026-09-27",
    title: "Módulo Tutorial",
    sections: ["tutorial"],
    items: [
      "Novo módulo Tutorial com explicações de todos os módulos, separadas por grupo.",
      "Aba Novidades: cada atualização do sistema ganha um tutorial novo aqui.",
      "Busca para encontrar qualquer explicação pelo nome ou assunto.",
    ],
  },
  {
    date: "2026-09-27",
    title: "Odontograma profissional e janela completa do paciente",
    sections: ["odontograma", "pacientes", "documentos"],
    items: [
      "Odontograma novo com desenho de cada dente, faces (oclusal, mesial, distal, vestibular e palatina/lingual), legenda de cores e histórico por dente.",
      "Painel lateral para registrar situação, procedimento planejado, status, observações, data, dentista e fotos/radiografias.",
      "Clicar no nome do paciente abre uma janela grande com todos os dados.",
      "O ícone de documento na lista de pacientes mostra todos os documentos, receitas e imagens do paciente.",
      "Cadastro do paciente ganhou Sexo, Dentista responsável e um código automático (ex.: #000125).",
    ],
  },
  {
    date: "2026-09-27",
    title: "Cor do painel e preferências salvas no servidor",
    sections: ["configuracoes"],
    items: [
      "Ao trocar a cor da interface, o fundo do painel fica 50% branco e 50% da cor escolhida.",
      "Tema, zoom e modo de visualização ficam salvos na sua conta — valem em qualquer computador.",
    ],
  },
  {
    date: "2026-09-27",
    title: "Banco de dados no Supabase e primeiro acesso",
    sections: ["primeiro-acesso"],
    items: [
      "Os dados da clínica agora ficam no Supabase, com as tabelas criadas automaticamente.",
      "Na primeira vez, a tela Entrar pede para criar o email e a senha do administrador.",
    ],
  },
];

export const TUTORIAL_SECTIONS: TutorialSection[] = [
  // ─── Começando ────────────────────────────────────────────────
  {
    id: "primeiro-acesso",
    group: "comecando",
    emoji: "🔑",
    title: "Primeiro acesso e login",
    to: "/entrar",
    summary: "Como entrar na área restrita e criar o primeiro administrador.",
    steps: [
      {
        title: "Abra a área restrita",
        text: "No site, acesse /entrar (ou o link Área Restrita no rodapé).",
      },
      {
        title: "Primeiro acesso",
        text: "Se ainda não existe administrador, a tela mostra “Primeiro acesso”. Informe um email e uma senha com pelo menos 12 caracteres e clique em Criar administrador.",
      },
      {
        title: "Acessos seguintes",
        text: "Entre com o email e a senha cadastrados. Você será levado ao painel com todos os módulos.",
      },
    ],
    tips: [
      "Outros administradores são criados em Configurações › Administradores.",
      "Use Sair (no topo do painel) ao terminar em computadores compartilhados.",
    ],
  },
  {
    id: "painel",
    group: "comecando",
    emoji: "🏠",
    title: "Painel e navegação",
    to: "/admin",
    summary: "A tela inicial com os módulos e como se movimentar pelo sistema.",
    steps: [
      {
        title: "Escolha um módulo",
        text: "A tela inicial mostra um cartão para cada módulo ativo. Clique para abrir.",
      },
      {
        title: "Trocar de módulo",
        text: "Dentro de um módulo, use o menu do topo para ir a outro ou voltar ao início.",
      },
      {
        title: "Módulos ligados/desligados",
        text: "Módulos que a clínica não usa podem ser escondidos em Configurações › Módulos do sistema.",
      },
    ],
  },
  {
    id: "tutorial",
    group: "comecando",
    emoji: "📘",
    title: "Como usar este Tutorial",
    to: "/admin/tutorial",
    summary: "Onde encontrar explicações e as novidades de cada atualização.",
    steps: [
      {
        title: "Navegue pelos grupos",
        text: "À esquerda, as explicações estão separadas por grupo (Atendimento, Clínico, Financeiro...). Clique em um item para abrir.",
      },
      {
        title: "Busque",
        text: "Digite na busca qualquer palavra (ex.: “receita”, “faces”, “backup”) para filtrar.",
      },
      {
        title: "Veja as Novidades",
        text: "A aba Novidades lista cada atualização do sistema, da mais recente para a mais antiga, com link para o tutorial do módulo.",
      },
    ],
    tips: ["Itens atualizados recentemente aparecem com a etiqueta NOVO."],
  },
  {
    id: "dashboard",
    group: "comecando",
    emoji: "📊",
    title: "Dashboard",
    to: "/admin/dashboard",
    summary: "Visão geral do dia: consultas, solicitações e indicadores.",
    steps: [
      {
        title: "Acompanhe o dia",
        text: "Veja as próximas consultas e as solicitações recebidas pelo site.",
      },
      {
        title: "Aprofunde",
        text: "Para detalhes, abra o módulo correspondente (Agenda, CRM, Financeiro).",
      },
    ],
  },

  // ─── Atendimento ──────────────────────────────────────────────
  {
    id: "agenda",
    group: "atendimento",
    emoji: "📅",
    title: "Agenda",
    to: "/admin/agenda",
    summary: "Marcar, confirmar e acompanhar as consultas da clínica.",
    steps: [
      {
        title: "Nova consulta",
        text: "Clique em Nova consulta, selecione o paciente, informe o tratamento (ex.: Limpeza), a data/hora e o status.",
      },
      {
        title: "Visualize",
        text: "Alterne entre dia, semana e mês. Use as setas para navegar e Hoje para voltar à data atual.",
      },
      {
        title: "Filtre e busque",
        text: "Filtre por status e período (Hoje, Próximos 7 dias) ou busque pelo paciente/tratamento.",
      },
      {
        title: "Atualize o status",
        text: "Edite a consulta para marcar como confirmada, concluída ou cancelada.",
      },
    ],
    tips: [
      "Também é possível agendar pelo prontuário do paciente em Mais ações › Agendar consulta.",
    ],
  },
  {
    id: "pacientes",
    group: "atendimento",
    emoji: "👥",
    title: "Pacientes",
    to: "/admin/pacientes",
    summary: "Cadastro, janela completa de dados, documentos e prontuário.",
    steps: [
      {
        title: "Cadastrar",
        text: "Clique em Novo paciente e preencha nome, sexo, dentista responsável, CPF, nascimento, telefone, email e endereço. Para menores de idade, aparecem os campos do responsável.",
      },
      {
        title: "Ver todos os dados",
        text: "Clique no NOME do paciente: abre uma janela grande com dados pessoais, alertas de saúde, consultas, orçamentos, financeiro, plano de tratamento e últimas evoluções.",
      },
      {
        title: "Ver documentos",
        text: "Clique no ícone de documento na linha do paciente para ver todos os arquivos, receitas e fotos/radiografias.",
      },
      {
        title: "Abrir o prontuário",
        text: "Na janela do paciente, clique em Abrir prontuário. Ali ficam as abas Resumo, Dados do Paciente, Prontuário (anamnese), Odontograma, Plano de Tratamento, Evoluções, Consultas, Documentos, Receitas, Orçamentos e Financeiro.",
      },
      {
        title: "Nova evolução",
        text: "No prontuário, o botão Nova Evolução leva à aba Evoluções para registrar o atendimento do dia.",
      },
    ],
    tips: [
      "A busca aceita nome, telefone, email, CPF ou código (ex.: #000125).",
      "Pacientes com histórico (consultas, pagamentos...) não podem ser excluídos, para proteger os registros.",
    ],
  },
  {
    id: "crm",
    group: "atendimento",
    emoji: "🤝",
    title: "CRM",
    to: "/admin/crm",
    summary: "Solicitações e oportunidades de novos pacientes (leads).",
    steps: [
      {
        title: "Acompanhe os leads",
        text: "Pedidos de contato do site entram aqui. Você também pode cadastrar manualmente (nome, telefone, origem).",
      },
      {
        title: "Atualize o status",
        text: "Mova o lead conforme o andamento do contato.",
      },
      {
        title: "Converta em paciente",
        text: "Quando a pessoa agendar, use Converter em paciente para criar o cadastro automaticamente.",
      },
    ],
  },

  // ─── Clínico ──────────────────────────────────────────────────
  {
    id: "odontograma",
    group: "clinico",
    emoji: "🦷",
    title: "Odontograma",
    to: "/admin/odontograma",
    summary:
      "Registrar a situação de cada dente, as faces afetadas, procedimentos, fotos e radiografias.",
    steps: [
      {
        title: "Abra o odontograma",
        text: "Pelo atalho: clique no módulo Odontograma (ao lado de Receitas), busque o paciente e clique no nome. Ou, em Pacientes, abra o prontuário e clique na aba Odontograma.",
      },
      {
        title: "Escolha a dentição e a vista",
        text: "Alterne entre Dentição Permanente e Decídua, e entre Vista Completa, Superior ou Inferior.",
      },
      {
        title: "Selecione o dente",
        text: "Clique no dente. À direita abre o painel com o desenho do dente e o nome (ex.: 1º Molar Superior Direito).",
      },
      {
        title: "Marque as faces",
        text: "Clique nas faces no diagrama ou nos botões Oclusal/Incisal, Mesial, Distal, Vestibular e Palatina/Lingual.",
      },
      {
        title: "Preencha o registro",
        text: "Escolha a Situação atual (cárie, restauração, canal, coroa...), o Procedimento planejado, o status em Procedimento realizado (Planejado, Em andamento, Concluído), observações, data e dentista.",
      },
      {
        title: "Anexe imagens",
        text: "Em Anexos, clique em Adicionar foto para incluir fotos ou radiografias (JPG/PNG até 10MB). Elas são enviadas ao clicar em Salvar Registro.",
      },
      {
        title: "Consulte o histórico",
        text: "Abaixo do odontograma aparece o Histórico do dente. Use o botão ⋯ para editar ou excluir um registro.",
      },
    ],
    tips: [
      "No módulo Odontograma, use Trocar paciente para atender o próximo sem sair da tela.",
      "As cores de cada situação estão na Legenda (botão Legenda para mostrar/esconder).",
      "O quadradinho abaixo de cada dente mostra as faces já registradas, coloridas.",
      "A aba Plano de Tratamento lista todos os procedimentos do paciente com o status.",
    ],
  },
  {
    id: "prontuario",
    group: "clinico",
    emoji: "📋",
    title: "Prontuário e anamnese",
    to: "/admin/pacientes",
    summary: "Anamnese, condições de saúde, evoluções e resumo com IA.",
    steps: [
      {
        title: "Anamnese",
        text: "Na aba Prontuário, preencha queixa principal, hábitos, alergias, medicamentos e condições de saúde. Clique em Salvar anamnese.",
      },
      {
        title: "Evoluções",
        text: "Na aba Evoluções, descreva o que foi observado ou feito em cada atendimento e clique em Adicionar anotação.",
      },
      {
        title: "Resumo com IA",
        text: "Na aba Resumo, clique em Resumir histórico com IA para um resumo das consultas, orçamentos, pagamentos e receitas.",
      },
      {
        title: "Imprimir",
        text: "Use o botão Imprimir no topo do prontuário.",
      },
    ],
    tips: ["Alergias e doenças marcadas aparecem como alerta na janela do paciente."],
  },
  {
    id: "tratamentos",
    group: "clinico",
    emoji: "🧪",
    title: "Tratamentos",
    to: "/admin/tratamentos",
    summary: "Catálogo de procedimentos com preço e duração.",
    steps: [
      {
        title: "Cadastre",
        text: "Clique em Novo tratamento e informe nome, descrição, duração (min) e preço.",
      },
      {
        title: "Ative/desative",
        text: "Marque Tratamento ativo para aparecer nas opções; desative os que não são mais oferecidos.",
      },
      {
        title: "Visualize",
        text: "Troque o modo de exibição (lista ou cartões) e filtre por status ou faixa de preço.",
      },
    ],
  },
  {
    id: "receitas",
    group: "clinico",
    emoji: "💊",
    title: "Receitas",
    to: "/admin/receitas",
    summary: "Prescrições emitidas para os pacientes.",
    steps: [
      {
        title: "Nova receita",
        text: "Selecione o paciente, informe a medicação e as instruções (posologia e duração).",
      },
      {
        title: "Sugestão com IA",
        text: "Descreva o caso e use Sugerir com IA para um rascunho — sempre revise antes de salvar.",
      },
      {
        title: "Onde aparece",
        text: "A receita fica no prontuário (aba Receitas) e na janela de documentos do paciente.",
      },
    ],
  },
  {
    id: "documentos",
    group: "clinico",
    emoji: "📄",
    title: "Documentos",
    to: "/admin/documentos",
    summary: "Exames, contratos e arquivos ligados aos pacientes.",
    steps: [
      {
        title: "Novo documento",
        text: "Informe título, categoria (Exame, Contrato, Atestado...), o paciente e o link do arquivo.",
      },
      {
        title: "Ver tudo de um paciente",
        text: "Em Pacientes, clique no ícone de documento: aparecem arquivos, receitas e fotos/radiografias do odontograma, em abas.",
      },
      {
        title: "Abrir imagens",
        text: "Na aba Fotos e radiografias, clique na imagem para ver em tela cheia.",
      },
    ],
  },

  // ─── Financeiro ───────────────────────────────────────────────
  {
    id: "orcamentos",
    group: "financeiro",
    emoji: "🧾",
    title: "Orçamentos",
    to: "/admin/orcamentos",
    summary: "Propostas de tratamento para os pacientes.",
    steps: [
      {
        title: "Novo orçamento",
        text: "Selecione o paciente, descreva o tratamento, o valor e as observações (condições de pagamento).",
      },
      {
        title: "Acompanhe",
        text: "Atualize o status conforme o paciente aprova ou recusa.",
      },
      {
        title: "Proposta completa",
        text: "No prontuário, aba Orçamentos, clique em Gerar proposta completa para uma versão pronta para imprimir.",
      },
    ],
  },
  {
    id: "financeiro",
    group: "financeiro",
    emoji: "💰",
    title: "Financeiro",
    to: "/admin/financeiro",
    summary: "Pagamentos e recebimentos dos pacientes.",
    steps: [
      {
        title: "Lançamento",
        text: "Registre o valor, o paciente, a data e o status (pendente, pago, cancelado).",
      },
      {
        title: "Filtre",
        text: "Filtre por paciente ou status para conferir o que falta receber.",
      },
    ],
  },
  {
    id: "contas",
    group: "financeiro",
    emoji: "📥",
    title: "Contas a Pagar/Receber",
    to: "/admin/contas",
    summary: "Despesas e receitas da clínica com vencimento.",
    steps: [
      {
        title: "Nova conta",
        text: "Escolha o tipo (pagar ou receber), descrição, categoria, valor, vencimento e, se quiser, o paciente.",
      },
      {
        title: "Dê baixa",
        text: "Ao pagar ou receber, altere o status da conta.",
      },
    ],
  },
  {
    id: "relatorios",
    group: "financeiro",
    emoji: "📈",
    title: "Relatórios",
    to: "/admin/relatorios",
    summary: "Gráficos de receita, consultas e leads.",
    steps: [
      {
        title: "Escolha o período",
        text: "Selecione os últimos 6 ou 12 meses.",
      },
      {
        title: "Leia os gráficos",
        text: "Receita por mês, consultas por status e leads por status.",
      },
    ],
  },

  // ─── Comunicação ──────────────────────────────────────────────
  {
    id: "suporte",
    group: "comunicacao",
    emoji: "💬",
    title: "Suporte (chat do site)",
    to: "/admin/suporte",
    summary: "Responder as conversas iniciadas pelos visitantes do site.",
    steps: [
      {
        title: "Abra a conversa",
        text: "Selecione uma conversa na lista à esquerda.",
      },
      {
        title: "Responda",
        text: "Digite a resposta ou use o botão de IA para redigir um rascunho a partir da conversa.",
      },
      {
        title: "Compartilhe",
        text: "Use o botão de link para copiar o endereço direto da conversa.",
      },
    ],
  },
  {
    id: "whatsapp",
    group: "comunicacao",
    emoji: "📱",
    title: "WhatsApp",
    to: "/admin/whatsapp",
    summary: "Registro interno dos contatos e conversas por WhatsApp.",
    steps: [
      {
        title: "Registre o contato",
        text: "Informe nome, telefone e um resumo da última mensagem.",
      },
      {
        title: "Consulte",
        text: "Busque por nome ou telefone para ver o histórico.",
      },
    ],
  },
  {
    id: "ia",
    group: "comunicacao",
    emoji: "🤖",
    title: "IA (assistente)",
    to: "/admin/ia",
    summary: "Assistente interno para tarefas do dia a dia da clínica.",
    steps: [
      {
        title: "Pergunte",
        text: "Escreva a pergunta (ex.: consultas de hoje, resumo da semana). A IA responde com base nos dados da clínica.",
      },
      {
        title: "Histórico",
        text: "As perguntas anteriores ficam salvas; use a busca para encontrá-las.",
      },
    ],
    tips: [
      "O provedor e a chave da IA são configurados em Configurações › Inteligência Artificial.",
    ],
  },

  // ─── Site ─────────────────────────────────────────────────────
  {
    id: "cms-site",
    group: "site",
    emoji: "🌐",
    title: "CMS do Site",
    to: "/admin/cms-site",
    summary: "Tudo que aparece no site público: serviços, blog e fotos.",
    steps: [
      {
        title: "Serviços",
        text: "Cadastre os serviços com descrição e preço (em branco = “sob consulta”) e marque Visível no site.",
      },
      {
        title: "Blog",
        text: "Crie posts com título, link (slug), resumo, conteúdo, imagem de capa e categoria. Salve como Rascunho ou Publicado.",
      },
      {
        title: "Fotos da clínica",
        text: "Envie fotos para a galeria do site; elas são otimizadas automaticamente.",
      },
    ],
  },

  // ─── Sistema ──────────────────────────────────────────────────
  {
    id: "configuracoes",
    group: "sistema",
    emoji: "⚙️",
    title: "Configurações",
    to: "/admin/configuracoes",
    summary: "Perfil, aparência, dados da clínica, módulos, administradores e IA.",
    steps: [
      {
        title: "Seu perfil",
        text: "Altere nome de exibição, email e senha.",
      },
      {
        title: "Aparência",
        text: "Escolha o tema (claro, escuro ou do sistema), a cor da interface e o zoom. No tema claro, o fundo do painel fica 50% branco e 50% da cor escolhida.",
      },
      {
        title: "Dados da clínica",
        text: "Nome, telefone, endereço e redes sociais usados no site.",
      },
      {
        title: "Módulos do sistema",
        text: "Ligue ou desligue os módulos que a clínica usa.",
      },
      {
        title: "Administradores",
        text: "Cadastre ou remova quem pode acessar o painel.",
      },
      {
        title: "Inteligência Artificial",
        text: "Informe provedor, URL, modelo e chave para ativar os recursos de IA e o atendente virtual do chat.",
      },
    ],
    tips: ["As preferências de aparência ficam salvas na sua conta, em qualquer computador."],
  },
  {
    id: "backup",
    group: "sistema",
    emoji: "💾",
    title: "Backup",
    to: "/admin/backup",
    summary: "Exportar, restaurar ou apagar os dados operacionais.",
    steps: [
      {
        title: "Exportar",
        text: "Baixe um arquivo com os dados da clínica. Faça isso com frequência e guarde em local seguro.",
      },
      {
        title: "Restaurar",
        text: "Envie um arquivo de backup para recuperar os dados.",
      },
      {
        title: "Apagar dados",
        text: "Remove os dados operacionais. É preciso digitar APAGAR para confirmar — não pode ser desfeito.",
      },
    ],
    tips: ["Contas de acesso e configurações da clínica não entram no backup nem são apagadas."],
  },
];
