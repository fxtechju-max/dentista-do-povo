import { z } from "zod";
import { tableColumns, type TableName } from "./tables";

const value = z.union([
  z.string().max(200000),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(z.string().max(200)).max(100),
]);
export const querySchema = z
  .object({
    table: z.custom<TableName>((v) => typeof v === "string" && Object.hasOwn(tableColumns, v)),
    action: z.enum(["select", "insert", "update", "upsert", "delete"]),
    columns: z.string().max(2000).default("*"),
    filters: z
      .array(
        z.object({ column: z.string(), op: z.enum(["eq", "gte", "lte", "gt", "lt", "in"]), value }),
      )
      .max(30)
      .default([]),
    order: z
      .array(z.object({ column: z.string(), ascending: z.boolean() }))
      .max(5)
      .default([]),
    limit: z.number().int().min(1).max(10000).optional(),
    values: z.record(value).optional(),
    count: z.boolean().default(false),
    head: z.boolean().default(false),
    returning: z.boolean().default(false),
    single: z.enum(["one", "maybe"]).optional(),
    onConflict: z.string().optional(),
  })
  .strict();
export type Query = z.infer<typeof querySchema>;
export type DataRow = Record<string, import("./types").Json>;
export type Result<T> = { data: T | null; error: { message: string } | null; count: number | null };
export type Actor = { userId: string | null; admin: boolean; visitorHash: string | null };

export function columnName(table: TableName, column: string) {
  if (!(tableColumns[table] as readonly string[]).includes(column))
    throw new Error("Coluna inválida.");
  return `\`${column}\``;
}

/** Fail closed: no SQL or identifiers from the browser are executed verbatim. */
export function authorize(query: Query, actor: Actor): Query {
  const q = structuredClone(query);
  for (const f of q.filters) columnName(q.table, f.column);
  for (const o of q.order) columnName(q.table, o.column);
  for (const key of Object.keys(q.values ?? {})) columnName(q.table, key);
  if ((q.action === "update" || q.action === "delete") && q.filters.length === 0)
    throw new Error("Informe o registro que deseja alterar.");
  if (
    q.action === "update" &&
    (q.values?.["id"] || (q.values?.["patient_id"] && q.table === "patient_anamnesis"))
  )
    throw new Error("Identificador imutável.");
  if (actor.admin) return q;
  const filter = (column: string, value: string | boolean) =>
    q.filters.push({ column, op: "eq", value });
  if (
    q.table === "profiles" &&
    actor.userId &&
    ["select", "insert", "update", "upsert"].includes(q.action)
  ) {
    filter("id", actor.userId);
    if (q.values) q.values["id"] = actor.userId;
    return q;
  }
  if (q.table === "user_roles" && actor.userId && q.action === "select") {
    filter("user_id", actor.userId);
    return q;
  }
  if (q.action === "select" && q.table === "blog_posts") {
    filter("status", "publicado");
    return q;
  }
  if (q.action === "select" && q.table === "services") {
    filter("active", true);
    return q;
  }
  if (q.action === "select" && q.table === "gallery_photos") return q;
  // Conteúdo público do site (textos da página inicial); só admins alteram.
  if (q.action === "select" && q.table === "site_content") return q;
  if (q.action === "select" && q.table === "clinic_settings") {
    // Operational settings are private; public callers only receive contact information.
    q.columns = "id, clinic_name, phone, address, instagram_url, facebook_url, whatsapp_number";
    return q;
  }
  if (actor.visitorHash && ["conversations", "messages"].includes(q.table)) {
    if (q.action === "select") return q; // Ownership is added as an SQL predicate, including nested conversation ownership.
    if (q.action === "insert" && q.values) {
      const allowed =
        q.table === "conversations" ? ["visitor_name"] : ["conversation_id", "sender", "content"];
      if (Object.keys(q.values).some((k) => !allowed.includes(k)))
        throw new Error("Campo não permitido.");
      if (q.table === "messages" && q.values["sender"] !== "visitor")
        throw new Error("Remetente inválido.");
      return q;
    }
  }
  throw new Error("Acesso negado.");
}
