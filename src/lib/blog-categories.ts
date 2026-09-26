export const BLOG_CATEGORIES = [
  "Prevenção",
  "Tratamentos",
  "Fases da Vida",
  "Especialidades Odontológicas",
  "Cuidado Profissional",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];
