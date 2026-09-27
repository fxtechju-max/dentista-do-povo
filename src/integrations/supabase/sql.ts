/** Convert internal parameter markers only. Values are always passed separately. */
export function bindParameters(statement: string, valueCount: number): string {
  let quote: "'" | '"' | null = null;
  let count = 0;
  let result = "";
  for (let i = 0; i < statement.length; i++) {
    const ch = statement[i]!;
    if (quote) {
      result += ch;
      if (ch === quote) {
        if (statement[i + 1] === quote) result += statement[++i];
        else quote = null;
      }
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      result += ch;
    } else result += ch === "?" ? `$${++count}` : ch;
  }
  if (quote || count !== valueCount) throw new Error("Parâmetros SQL inválidos.");
  return result;
}
