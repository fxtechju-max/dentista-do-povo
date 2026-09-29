// Colunas jsonb: o valor vai como texto e o banco converte (sem o cast, o
// driver gravaria a lista como texto JSON dentro do jsonb).
const JSON_COLUMNS = new Set([
  "surfaces",
  "conditions",
  "disabled_modules",
  "disabled_payment_methods",
  "module_order",
]);

export const placeholder = (column: string) => (JSON_COLUMNS.has(column) ? "?::text::jsonb" : "?");
