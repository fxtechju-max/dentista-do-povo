// Funções puras do Google AdSense, sem dependências — seguras para o
// servidor (src/server.ts gera o /ads.txt com elas) e para o navegador.

export type AdPosition = "home" | "blog_list" | "blog_post";

export const AD_POSITIONS: { id: AdPosition; label: string; description: string }[] = [
  { id: "blog_list", label: "Lista do blog", description: "Entre os posts na página Blog" },
  { id: "blog_post", label: "Final do post", description: "Depois do texto de cada post" },
  { id: "home", label: "Página inicial", description: "Antes das perguntas frequentes" },
];

export type AdsenseSettings = {
  enabled: boolean;
  clientId: string | null;
  slots: Record<AdPosition, string | null>;
};

export const ADSENSE_OFF: AdsenseSettings = {
  enabled: false,
  clientId: null,
  slots: { home: null, blog_list: null, blog_post: null },
};

/** Aceita "ca-pub-123…", "pub-123…" ou só os números; devolve "ca-pub-…" ou null. */
export function normalizeClientId(value: string | null | undefined): string | null {
  const digits = (value ?? "").trim().match(/(?:ca-)?pub-(\d{10,20})$|^(\d{10,20})$/);
  const id = digits?.[1] ?? digits?.[2];
  return id ? `ca-pub-${id}` : null;
}

/** Conteúdo do /ads.txt: linha oficial do Google + linhas extras (outras redes). */
export function buildAdsTxt(clientId: string | null, extra?: string | null): string {
  const lines: string[] = [];
  const id = normalizeClientId(clientId);
  if (id) lines.push(`google.com, ${id.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0`);
  const more = (extra ?? "").trim();
  if (more) lines.push(more);
  if (!lines.length)
    lines.push("# Configure o Google AdSense na área restrita (Configurações › Anúncios).");
  return `${lines.join("\n")}\n`;
}

export type AdsenseRow = {
  adsense_enabled?: boolean | null;
  adsense_client_id?: string | null;
  adsense_slot_home?: string | null;
  adsense_slot_blog_list?: string | null;
  adsense_slot_blog_post?: string | null;
};

export function adsenseFromRow(row: AdsenseRow | null | undefined): AdsenseSettings {
  const clientId = normalizeClientId(row?.adsense_client_id);
  if (!row?.adsense_enabled || !clientId) return ADSENSE_OFF;
  const slot = (v: string | null | undefined) =>
    v && /^\d{6,20}$/.test(v.trim()) ? v.trim() : null;
  return {
    enabled: true,
    clientId,
    slots: {
      home: slot(row.adsense_slot_home),
      blog_list: slot(row.adsense_slot_blog_list),
      blog_post: slot(row.adsense_slot_blog_post),
    },
  };
}
