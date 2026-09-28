/**
 * Texto do post do blog. Blocos separados por linha em branco:
 * - "## Título" vira subtítulo
 * - bloco em que todas as linhas começam com "- " vira lista
 * - o resto é parágrafo (posts antigos continuam iguais).
 */
export function BlogContent({ content }: { content: string }) {
  const blocks = content
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="mt-6">
      {blocks.map((block, i) => {
        if (block.startsWith("## "))
          return (
            <h2 key={i} className="mb-3 mt-8 text-xl font-extrabold tracking-tight text-foreground">
              {block.slice(3)}
            </h2>
          );
        const lines = block.split("\n");
        if (lines.every((l) => l.trim().startsWith("- ")))
          return (
            <ul key={i} className="mb-5 space-y-2 pl-1">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2.5 leading-relaxed text-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{l.trim().slice(2)}</span>
                </li>
              ))}
            </ul>
          );
        return (
          <p key={i} className="mb-4 whitespace-pre-line leading-relaxed text-foreground">
            {block}
          </p>
        );
      })}
    </div>
  );
}
