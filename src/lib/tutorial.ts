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
    date: "2026-09-28",
    title: "Correção: ads.txt do Google AdSense no site publicado",
    sections: ["configuracoes"],
    items: [
      "O arquivo /ads.txt agora mostra corretamente o seu ID de editor no site publicado na Vercel.",
      "Conferido: o código do AdSense aparece nas páginas públicas e nunca no painel ou no login.",
    ],
  },
  {
    date: "2026-09-28",
    title: "Correções: prontuário do paciente e editor da página inicial",
    sections: ["pacientes", "cms-site"],
    items: [
      "Abrir prontuário voltou a funcionar: a ficha completa do paciente (abas, odontograma, proposta) abre normalmente.",
      "Editor da Página inicial no CMS corrigido (chave Visível/Oculta ao lado de cada seção).",
      "Erros de banco agora ficam registrados no log do servidor para facilitar o suporte.",
    ],
  },
  {
    date: "2026-09-28",
    title: "Política de Privacidade e Termos de Uso",
    sections: ["cms-site"],
    items: [
      "Novas páginas públicas /privacidade e /termos, com links no rodapé do site.",
      "Textos prontos seguindo a LGPD e as exigências do Google AdSense (cookies e anúncios).",
      "Edite tudo em CMS Site › Páginas, com pré-visualização ao lado.",
    ],
  },
  {
    date: "2026-09-28",
    title: "Anúncios do Google AdSense pela área restrita",
    sections: ["configuracoes"],
    items: [
      "Nova seção Configurações › Anúncios (AdSense): cole seu ID de editor e ligue Exibir anúncios.",
      "O código de verificação do Google e o arquivo /ads.txt são publicados automaticamente.",
      "Espaços de anúncio na lista do blog, no final de cada post e na página inicial (opcionais).",
      "Anúncios nunca aparecem no painel nem na tela de login.",
    ],
  },
  {
    date: "2026-09-28",
    title: "Organize os módulos arrastando",
    sections: ["painel"],
    items: [
      "Na tela inicial do painel, segure um módulo e arraste para a posição que quiser.",
      "A ordem é salva automaticamente no projeto (banco de dados), nunca no navegador — vale para todos os administradores e aparelhos.",
      "O menu do topo segue a mesma ordem. Use Ordem padrão para voltar à original.",
    ],
  },
  {
    date: "2026-09-28",
    title: "Blog: 20 posts novos e contador de posts",
    sections: ["cms-site"],
    items: [
      "20 novos posts originais e detalhados sobre cárie, limpeza, tártaro, flúor, selante, bebês, diabetes, cigarro, aftas, dentadura, urgências e mais.",
      "A aba Blog do CMS mostra quantos posts você tem: total, publicados, rascunhos, detalhados e por categoria.",
      "Os posts agora aceitam subtítulos (linha começando com ## ) e listas (linhas começando com - ).",
    ],
  },
  {
    date: "2026-09-28",
    title: "Página inicial do site editável e novas seções sobre Cujubim",
    sections: ["cms-site"],
    items: [
      "Nova aba Página inicial no CMS Site: edite título, texto, botões, números, selo e a foto principal.",
      "Envie a foto direto do computador — o sistema recorta no formato certo (4:3) e otimiza sozinho.",
      "Novas seções no site: Sobre o Dentista do Povo, Por que escolher, Referência em Cujubim (com botão Como chegar), Perguntas frequentes e Chamada final.",
      "Cada seção pode ser mostrada ou escondida e tem o botão Restaurar texto padrão.",
    ],
  },
  {
    date: "2026-09-27",
    title: "Formas de pagamento e Configurações reorganizadas",
    sections: ["financeiro", "contas", "configuracoes"],
    items: [
      "Financeiro e Contas a Pagar/Receber agora registram a forma de pagamento: PIX, dinheiro, cartão de crédito (com parcelas), cartão de débito, boleto, transferência, link de pagamento, cheque, crediário, convênio, depósito e outros.",
      "Filtro por forma de pagamento e resumo do que foi recebido em cada forma.",
      "Em Configurações › Formas de pagamento, ative ou desative cada forma.",
      "Configurações com menu lateral organizado em grupos (Conta, Clínica, Equipe e Sistema) e animações.",
    ],
  },
  {
    date: "2026-09-27",
    title: "Interface salva no projeto",
    sections: ["configuracoes"],
    items: [
      "Tema, cor da interface, zoom e modo de visualização dos tratamentos agora ficam salvos no projeto (banco de dados), nunca no navegador.",
      "A mesma aparência vale para todos os administradores, computadores e celulares.",
      "Só administradores podem alterar; o site público usa o zoom definido pela clínica.",
    ],
  },
  {
    date: "2026-09-27",
    title: "Modelos de Documentos: receituário, atestado e declaração",
    sections: ["modelos"],
    items: [
      "Novo módulo Modelos de Documentos, ao lado de Documentos e Receitas.",
      "Modelos prontos de Receituário, Atestado e Declaração de Comparecimento, com os dados do Dr. Álvaro Augusto Battiston (CRO/RO 2853) e da clínica.",
      "Os dados do paciente (nome, CPF, endereço...) entram sozinhos a partir do cadastro.",
      "Três layouts em preto, azul e branco: Clássico, Moderno e Elegante.",
      "Edite o texto antes de imprimir, e exporte em PDF ou DOCX (Word).",
      "Crie, duplique e edite seus próprios modelos com campos automáticos.",
    ],
  },
  {
    date: "2026-09-27",
    title: "Abertura dos posts do blog corrigida",
    sections: ["cms-site"],
    items: [
      "Clique na foto, no título ou em Ler mais para abrir o conteúdo completo do post.",
      "Use Voltar para o blog para retornar à lista ou compartilhe o endereço do artigo.",
    ],
  },
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
        title: "Mude a ordem dos módulos",
        text: "No computador, clique e arraste o cartão do módulo. No celular, segure o dedo sobre o módulo por um instante e arraste. A nova ordem é salva sozinha no projeto e vale para todos. Para desfazer, clique em Ordem padrão.",
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
    id: "modelos",
    group: "clinico",
    emoji: "🖨️",
    title: "Modelos de Documentos",
    to: "/admin/modelos",
    summary:
      "Receituário, atestado, declaração de comparecimento e seus próprios modelos, prontos para imprimir ou exportar.",
    steps: [
      {
        title: "Abra o módulo",
        text: "Clique em Modelos de Documentos no painel. Pelo prontuário do paciente, use Mais ações › Gerar documento para já abrir com o paciente escolhido.",
      },
      {
        title: "Escolha o modelo e o paciente",
        text: "Na aba Gerar documento, clique no modelo (Receituário, Atestado, Declaração...) e busque o paciente. Nome, CPF, endereço e data entram sozinhos.",
      },
      {
        title: "Escolha o layout",
        text: "Clássico (faixa azul lateral), Moderno (cabeçalho centralizado e contatos no rodapé) ou Elegante (marca d'água e rodapé escuro). Todos em preto, azul e branco.",
      },
      {
        title: "Revise e edite",
        text: "Complete os campos em branco (horários, dias, CID, medicamentos) direto no texto. A pré-visualização A4 mostra como vai sair.",
      },
      {
        title: "Imprima ou exporte",
        text: "Use Imprimir, Baixar PDF ou Baixar DOCX (abre no Word para editar).",
      },
      {
        title: "Edite os modelos",
        text: "Na aba Modelos, altere nome, título, texto e layout padrão. Clique nos campos automáticos (Nome do paciente, CPF, Data...) para inserir no texto. Use Novo modelo ou Duplicar para criar outros.",
      },
      {
        title: "Dados da clínica",
        text: "Na aba Dados da clínica, confira nome do dentista, CRO, telefone, endereço e cidade — eles aparecem em todos os documentos.",
      },
    ],
    tips: [
      "Campos sem informação no cadastro saem como linha em branco para preencher à mão.",
      "As mudanças feitas em Gerar documento valem só para aquele documento; o modelo continua igual.",
      "Na impressão, escolha papel A4 e desative “cabeçalhos e rodapés” do navegador, se aparecerem.",
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
        text: "Registre o valor, o paciente, o status (pendente, pago, cancelado) e a forma de pagamento. No cartão de crédito, link de pagamento e crediário, informe também as parcelas.",
      },
      {
        title: "Recebido por forma",
        text: "O quadro Recebido por forma de pagamento mostra quanto entrou em PIX, dinheiro, cartões etc. Clique em uma forma para filtrar a lista.",
      },
      {
        title: "Filtre",
        text: "Filtre por paciente, status, forma de pagamento ou período para conferir o que falta receber.",
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
        title: "Forma de pagamento",
        text: "Escolha como a conta foi ou será paga (PIX, dinheiro, cartão, boleto...). Use o filtro de forma para ver, por exemplo, só o que é pago no boleto.",
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
    summary: "Tudo que aparece no site público: página inicial, serviços, blog e fotos.",
    steps: [
      {
        title: "Página inicial",
        text: "Na aba Página inicial, abra cada seção (Destaque, Sobre, Por que escolher, Referência em Cujubim, Perguntas frequentes, Chamada final), edite os textos e use a chave Visível/Oculta para mostrar ou esconder.",
      },
      {
        title: "Trocar a foto principal",
        text: "Em Destaque, clique em Enviar foto do computador. Formato ideal: foto horizontal 4:3 (1600 × 1200 px), JPG/PNG/WEBP até 15 MB — mas qualquer foto funciona: o sistema recorta e otimiza sozinho.",
      },
      {
        title: "Publicar",
        text: "Clique em Salvar e publicar no topo. Use Ver site para conferir. Enquanto não salvar, aparece “Alterações não publicadas”.",
      },
      {
        title: "Serviços",
        text: "Cadastre os serviços com descrição e preço (em branco = “sob consulta”) e marque Visível no site.",
      },
      {
        title: "Blog",
        text: "Crie posts com título, link (slug), resumo, conteúdo, imagem de capa e categoria. Salve como Rascunho ou Publicado.",
      },
      {
        title: "Política de Privacidade e Termos de Uso",
        text: "Na aba Páginas, escolha a página, edite o título e o texto (a pré-visualização aparece ao lado) e clique em Salvar e publicar. A data de atualização muda sozinha. Texto padrão restaura o modelo original.",
      },
      {
        title: "Quantos posts eu tenho",
        text: "No topo da aba Blog aparecem o total de posts, publicados, rascunhos, detalhados (300+ palavras) e a quantidade por categoria. Clique em um número ou categoria para filtrar a lista.",
      },
      {
        title: "Formatar o texto do post",
        text: "Separe parágrafos com uma linha em branco. Para um subtítulo, comece a linha com ## (ex.: ## Como prevenir). Para uma lista, comece cada linha com - (hífen e espaço).",
      },
      {
        title: "Ler e compartilhar um post",
        text: "Abra o Blog no site e clique na foto, no título ou em Ler mais. O artigo completo abre em uma página própria. Copie o endereço para compartilhar e use Voltar para o blog para ver os outros posts. Apenas posts salvos como Publicado aparecem no site.",
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
        title: "Navegue pelo menu",
        text: "À esquerda, as configurações estão agrupadas em Conta (perfil e segurança), Clínica (dados, formas de pagamento e módulos), Equipe (administradores) e Sistema (aparência, IA e transparência).",
      },
      {
        title: "Seu perfil",
        text: "Altere nome de exibição, email e senha.",
      },
      {
        title: "Anúncios (Google AdSense)",
        text: "Em Site › Anúncios, siga o passo a passo: cole o ID de editor (ca-pub-…), ligue Exibir anúncios e salve. O ads.txt é criado sozinho. Depois da aprovação do Google, cole os IDs dos blocos (lista do blog, final do post, página inicial) ou ative os anúncios automáticos no próprio AdSense.",
      },
      {
        title: "Formas de pagamento",
        text: "Ative ou desative PIX, dinheiro, cartões, boleto e as demais formas. Só as ativas aparecem ao lançar pagamentos.",
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
    tips: [
      "A aparência fica salva no projeto: vale para todos os administradores e aparelhos.",
      "Nada da interface é guardado no navegador — limpar o histórico não apaga suas escolhas.",
    ],
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
