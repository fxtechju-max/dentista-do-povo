// Conteúdo editável da página inicial (CMS › Página inicial). Fica salvo em
// site_content (id "home") como JSON; o que faltar usa DEFAULT_HOME.

export type Stat = { value: string; label: string };
export type Highlight = { emoji: string; title: string; text: string };
export type Faq = { question: string; answer: string };

export type HomeContent = {
  hero: {
    badge: string;
    titleStart: string;
    titleHighlight: string;
    subtitle: string;
    primaryLabel: string;
    secondaryLabel: string;
    stats: Stat[];
    imageId: string | null;
    imageAlt: string;
    floatingTitle: string;
    floatingSubtitle: string;
  };
  about: {
    enabled: boolean;
    eyebrow: string;
    title: string;
    text: string;
    imageId: string | null;
    highlights: Highlight[];
  };
  why: { enabled: boolean; eyebrow: string; title: string; items: Highlight[] };
  city: {
    enabled: boolean;
    eyebrow: string;
    title: string;
    text: string;
    address: string;
    hours: string;
    phone: string;
  };
  faq: { enabled: boolean; title: string; items: Faq[] };
  cta: { enabled: boolean; title: string; text: string; buttonLabel: string };
};

export const DEFAULT_HOME: HomeContent = {
  hero: {
    badge: "Clínica Odontológica em Cujubim - RO",
    titleStart: "Seu sorriso merece",
    titleHighlight: "cuidado de verdade.",
    subtitle:
      "Tecnologia, profissionais experientes e um atendimento humanizado que faz a diferença desde a primeira consulta — aqui mesmo em Cujubim.",
    primaryLabel: "Agendar Avaliação Grátis",
    secondaryLabel: "Ver Serviços",
    stats: [
      { value: "+15k", label: "Sorrisos" },
      { value: "4.9 ★", label: "Google" },
      { value: "24h", label: "Urgência" },
    ],
    imageId: null,
    imageAlt: "Consultório moderno da clínica Dentista do Povo em Cujubim",
    floatingTitle: "Consulta grátis",
    floatingSubtitle: "Sem compromisso",
  },
  about: {
    enabled: true,
    eyebrow: "Sobre o Dentista do Povo",
    title: "Odontologia de qualidade, perto de você, em Cujubim",
    text: "O Dentista do Povo nasceu com um propósito simples: levar tratamento odontológico completo, moderno e acessível para as famílias de Cujubim e região, sem que ninguém precise viajar para outras cidades para cuidar do sorriso.\n\nSob a responsabilidade do Dr. Álvaro Augusto Battiston (CRO/RO 2853), a clínica une atendimento próximo, explicação clara de cada etapa do tratamento e condições que cabem no bolso.",
    imageId: null,
    highlights: [
      {
        emoji: "🏥",
        title: "Estrutura moderna",
        text: "Consultório equipado para prevenção, tratamentos e estética.",
      },
      {
        emoji: "🤝",
        title: "Atendimento humanizado",
        text: "Tempo para ouvir, explicar e deixar você tranquilo.",
      },
      {
        emoji: "💳",
        title: "Pagamento facilitado",
        text: "PIX, dinheiro, cartão de débito e crédito parcelado.",
      },
      {
        emoji: "📍",
        title: "Aqui em Cujubim",
        text: "Cuidado completo sem precisar sair da cidade.",
      },
    ],
  },
  why: {
    enabled: true,
    eyebrow: "Por que escolher",
    title: "Por que as famílias de Cujubim escolhem o Dentista do Povo",
    items: [
      {
        emoji: "🦷",
        title: "Tratamento completo",
        text: "Limpeza, restaurações, canal, extrações, próteses, implantes e estética em um só lugar.",
      },
      {
        emoji: "👨‍👩‍👧",
        title: "Para toda a família",
        text: "Atendimento de crianças a idosos, com paciência e cuidado em cada fase da vida.",
      },
      {
        emoji: "🗓️",
        title: "Agendamento fácil",
        text: "Marque pelo WhatsApp, telefone ou pelo chat do site, sem complicação.",
      },
      {
        emoji: "💰",
        title: "Preço justo",
        text: "Orçamento claro antes de começar e várias formas de pagamento.",
      },
      {
        emoji: "🧼",
        title: "Biossegurança",
        text: "Materiais esterilizados e protocolos rigorosos em todos os atendimentos.",
      },
      {
        emoji: "⚡",
        title: "Urgências",
        text: "Dor de dente não espera: fale com a gente para atendimento rápido.",
      },
    ],
  },
  city: {
    enabled: true,
    eyebrow: "Referência em Cujubim",
    title: "Orgulho de cuidar dos sorrisos de Cujubim",
    text: "Somos da cidade e atendemos quem vive aqui. Nosso compromisso é oferecer em Cujubim o mesmo padrão de atendimento dos grandes centros, com a proximidade de quem conhece cada bairro e cada família.",
    address: "Avenida Cujubim, nº 2112, Setor 02, Cujubim - RO, CEP 76864-000",
    hours: "Consulte os horários de atendimento pelo WhatsApp.",
    phone: "(69) 98492-0788",
  },
  faq: {
    enabled: true,
    title: "Perguntas frequentes",
    items: [
      {
        question: "Onde fica o Dentista do Povo?",
        answer:
          "Na Avenida Cujubim, nº 2112, Setor 02, em Cujubim - RO. Use o botão Como chegar para abrir o mapa.",
      },
      {
        question: "Como faço para agendar uma consulta?",
        answer:
          "Pelo WhatsApp (69) 98492-0788, pelo telefone ou pelo chat do site. Respondemos o mais rápido possível.",
      },
      {
        question: "A avaliação é gratuita?",
        answer:
          "Sim. Na avaliação examinamos seu sorriso, tiramos suas dúvidas e apresentamos o orçamento, sem compromisso.",
      },
      {
        question: "Quais formas de pagamento vocês aceitam?",
        answer:
          "PIX, dinheiro, cartão de débito e cartão de crédito (com parcelamento). Consulte outras condições na recepção.",
      },
      {
        question: "Atendem urgência?",
        answer:
          "Sim. Em caso de dor ou acidente, entre em contato pelo WhatsApp para verificarmos o primeiro horário disponível.",
      },
    ],
  },
  cta: {
    enabled: true,
    title: "Pronto para cuidar do seu sorriso?",
    text: "Agende sua avaliação gratuita no Dentista do Povo, em Cujubim. É rápido e sem compromisso.",
    buttonLabel: "Agendar agora",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Junta o salvo com o padrão, campo a campo (listas salvas substituem as do padrão). */
function merge<T>(base: T, saved: unknown): T {
  if (!isRecord(base) || !isRecord(saved)) {
    if (Array.isArray(base)) return (Array.isArray(saved) ? saved : base) as T;
    return (
      saved === undefined || (typeof saved !== typeof base && base !== null) ? base : saved
    ) as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base)) out[key] = merge(base[key], saved[key]);
  return out as T;
}

export function parseHomeContent(json: string | null | undefined): HomeContent {
  if (!json) return DEFAULT_HOME;
  try {
    return merge(DEFAULT_HOME, JSON.parse(json));
  } catch {
    return DEFAULT_HOME;
  }
}

export function siteImageUrl(id: string) {
  return `/api/site-images/${id}`;
}

export function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
