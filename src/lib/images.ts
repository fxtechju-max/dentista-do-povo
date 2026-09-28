// Ajuda a baixar imagens no tamanho certo (fotos do banco gratuito Pexels
// aceitam o parâmetro de largura "w"). Outras URLs voltam como estão.
export function imageUrlForWidth(url: string, width: number): string {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("pexels.com")) return url;
    u.searchParams.set("w", String(width));
    if (!u.searchParams.has("auto")) u.searchParams.set("auto", "compress");
    return u.toString();
  } catch {
    return url;
  }
}
