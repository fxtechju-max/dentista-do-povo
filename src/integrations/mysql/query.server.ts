import { randomUUID } from "node:crypto";
import type { PoolConnection, Row as RowDataPacket } from "./pool.server";
import { getPool } from "./pool.server";
import { tableColumns } from "./tables";
import {
  authorize,
  columnName,
  type Query,
  type Actor,
  type DataRow,
  type Result,
} from "./protocol";

const booleans = new Set([
  "active",
  "ai_secretary_enabled",
  "is_smoker",
  "is_pregnant",
  "has_diabetes",
  "has_hypertension",
  "has_heart_condition",
  "flosses_regularly",
  "bleeding_gums",
  "tooth_sensitivity",
  "bruxism",
  "uses_orthodontic_appliance",
  "uses_dental_prosthesis",
  "anesthesia_allergy",
]);
type SqlValue = string | number | boolean | null | Date;
function sqlValue(column: string, value: unknown): SqlValue {
  if (value == null) return null;
  if (column.endsWith("_at") && typeof value === "string") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error("Data inválida.");
    return date;
  }
  if (Array.isArray(value)) return JSON.stringify(value);
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
  )
    return value;
  throw new Error("Valor inválido.");
}
function normalize(row: RowDataPacket): DataRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Date
        ? value.toISOString()
        : booleans.has(key)
          ? Boolean(value)
          : (key === "disabled_modules" || key === "conditions") && typeof value === "string"
            ? JSON.parse(value)
            : value,
    ]),
  ) as DataRow;
}

export function projection(q: Query) {
  const parts =
    q.columns === "*" ? [...tableColumns[q.table]] : q.columns.split(",").map((s) => s.trim());
  let patient = false;
  const columns = parts.filter((part) => {
    if (
      part === "patients(name)" &&
      (tableColumns[q.table] as readonly string[]).includes("patient_id")
    ) {
      patient = true;
      return false;
    }
    columnName(q.table, part);
    return true;
  });
  if (!columns.length) throw new Error("Seleção inválida.");
  return { columns, patient };
}

function predicates(q: Query, actor: Actor) {
  const values: SqlValue[] = [];
  const clauses = q.filters.map((f) => {
    const col = `t.${columnName(q.table, f.column)}`;
    if (f.op === "in") {
      if (!Array.isArray(f.value)) throw new Error("Filtro inválido.");
      if (f.value.length === 0) return "FALSE";
      values.push(...f.value.map((v) => sqlValue(f.column, v)));
      return `${col} IN (${f.value.map(() => "?").join(",")})`;
    }
    if (f.value === null && f.op === "eq") return `${col} IS NULL`;
    if (Array.isArray(f.value)) throw new Error("Filtro inválido.");
    values.push(sqlValue(f.column, f.value));
    return `${col} ${{ eq: "=", gt: ">", lt: "<", gte: ">=", lte: "<=" }[f.op]} ?`;
  });
  if (!actor.admin && q.table === "conversations") {
    clauses.push("t.visitor_token_hash=?");
    values.push(actor.visitorHash);
  }
  if (!actor.admin && q.table === "messages") {
    clauses.push(
      "EXISTS (SELECT 1 FROM conversations c WHERE c.id=t.conversation_id AND c.visitor_token_hash=?)",
    );
    values.push(actor.visitorHash);
  }
  return { sql: clauses.length ? " WHERE " + clauses.join(" AND ") : "", values };
}

async function selectRows(
  conn: PoolConnection,
  q: Query,
  actor: Actor,
): Promise<Result<DataRow[] | DataRow>> {
  const { columns, patient } = projection(q);
  const where = predicates(q, actor);
  let count: number | null = null;
  if (q.count) {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS n FROM \`${q.table}\` t${where.sql}`,
      where.values,
    );
    count = Number(rows[0]?.["n"]);
  }
  if (q.head) return { data: null, error: null, count };
  const fields = columns.map((c) => `t.${columnName(q.table, c)}`);
  if (patient) fields.push("p.id AS __patient_id", "p.name AS __patient_name");
  const join = patient ? " LEFT JOIN patients p ON p.id=t.patient_id" : "";
  const order = q.order.length
    ? " ORDER BY " +
      q.order
        .map((o) => `t.${columnName(q.table, o.column)} ${o.ascending ? "ASC" : "DESC"}`)
        .join(",")
    : "";
  const limit = q.single ? 2 : q.limit;
  const [raw] = await conn.execute<RowDataPacket[]>(
    `SELECT ${fields.join(",")} FROM \`${q.table}\` t${join}${where.sql}${order}${limit ? ` LIMIT ${limit}` : ""}`,
    where.values,
  );
  const rows = raw.map((row) => {
    const result = normalize(row);
    if (patient) {
      result["patients"] = row["__patient_id"] ? { name: String(row["__patient_name"]) } : null;
      delete result["__patient_id"];
      delete result["__patient_name"];
    }
    return result;
  });
  if (q.single && (rows.length > 1 || (q.single === "one" && rows.length !== 1)))
    throw new Error("Registro não encontrado ou seleção ambígua.");
  return { data: q.single ? (rows[0] ?? null) : rows, error: null, count };
}

export async function executeQuery(
  input: Query,
  actor: Actor,
): Promise<Result<DataRow[] | DataRow>> {
  const q = authorize(input, actor);
  projection(q); // Validate even when no rows are returned.
  const conn = await getPool().getConnection();
  try {
    if (q.action === "select") return await selectRows(conn, q, actor);
    await conn.beginTransaction();
    const values: Record<string, unknown> = { ...q.values };
    if (q.action !== "delete" && !Object.keys(values).length) throw new Error("Dados vazios.");
    if (["insert", "upsert"].includes(q.action)) {
      const pk = q.table === "patient_anamnesis" ? "patient_id" : "id";
      if (!values[pk]) values[pk] = q.table === "clinic_settings" ? "default" : randomUUID();
      if (q.table === "conversations" && !actor.admin)
        values["visitor_token_hash"] = actor.visitorHash;
      if (q.table === "messages") {
        if (
          typeof values["content"] !== "string" ||
          !values["content"].trim() ||
          values["content"].length > 10000
        )
          throw new Error("Mensagem inválida.");
        if (!actor.admin) {
          const [owned] = await conn.execute<RowDataPacket[]>(
            "SELECT id FROM conversations WHERE id=? AND visitor_token_hash=? FOR UPDATE",
            [sqlValue("conversation_id", values["conversation_id"]), actor.visitorHash],
          );
          if (!owned.length) throw new Error("Conversa não encontrada.");
        }
      }
      if (
        q.table === "conversations" &&
        (typeof values["visitor_name"] !== "string" ||
          !values["visitor_name"].trim() ||
          values["visitor_name"].length > 200)
      )
        throw new Error("Nome inválido.");
      const keys = Object.keys(values);
      let suffix = "";
      if (q.action === "upsert") {
        const expected = q.table === "tooth_records" ? "patient_id,tooth_number" : pk;
        if (q.onConflict && q.onConflict.replace(/\s/g, "") !== expected)
          throw new Error("Chave de atualização inválida.");
        // Only tables with a defined application upsert use this path.
        if (
          !["patient_anamnesis", "tooth_records", "clinic_settings", "profiles"].includes(q.table)
        )
          throw new Error("Atualização não suportada.");
        const protectedKeys = new Set([pk, "created_at", ...expected.split(",")]);
        const mutable = keys.filter((k) => !protectedKeys.has(k));
        suffix =
          ` ON CONFLICT (${expected}) ` +
          (mutable.length
            ? "DO UPDATE SET " + mutable.map((k) => `"${k}"=EXCLUDED."${k}"`).join(",")
            : "DO NOTHING");
      }
      await conn.execute(
        `INSERT INTO \`${q.table}\` (${keys.map((k) => `\`${k}\``).join(",")}) VALUES (${keys.map(() => "?").join(",")})${suffix}`,
        keys.map((k) => sqlValue(k, values[k])),
      );
      if (q.table === "messages")
        await conn.execute("UPDATE conversations SET last_message_at=now() WHERE id=?", [
          sqlValue("conversation_id", values["conversation_id"]),
        ]);
      q.filters =
        q.table === "tooth_records" && q.action === "upsert"
          ? ["patient_id", "tooth_number"].map((column) => ({
              column,
              op: "eq" as const,
              value: values[column] as string | number,
            }))
          : [{ column: pk, op: "eq", value: String(values[pk]) }];
    } else {
      const where = predicates(q, actor);
      if (q.action === "delete")
        await conn.execute(`DELETE FROM \`${q.table}\` t${where.sql}`, where.values);
      else {
        const keys = Object.keys(values);
        await conn.execute(
          `UPDATE \`${q.table}\` t SET ${keys.map((k) => `${columnName(q.table, k)}=?`).join(",")}${where.sql}`,
          [...keys.map((k) => sqlValue(k, values[k])), ...where.values],
        );
      }
    }
    // Admin-only, best-effort transparency log — never exposed through the
    // generic query builder (audit_log isn't in tableColumns), so it can't
    // be tampered with or read by anything other than the dedicated
    // getAuditLog server function.
    if (actor.admin) {
      const label =
        q.action === "delete"
          ? null
          : (["name", "title", "treatment", "medication", "clinic_name", "visitor_name", "email"]
              .map((k) => values[k])
              .find((v): v is string => typeof v === "string" && v.trim().length > 0) ?? null);
      const recordId = q.filters.find((f) => f.op === "eq" && typeof f.value !== "object")?.value;
      await conn.execute(
        "INSERT INTO audit_log (user_id, action, table_name, record_id, record_label) VALUES (?,?,?,?,?)",
        [
          actor.userId,
          q.action === "upsert" ? "update" : q.action,
          q.table,
          recordId != null ? String(recordId) : null,
          label,
        ],
      );
    }
    const result =
      q.returning && q.action !== "delete"
        ? await selectRows(conn, q, actor)
        : { data: null, error: null, count: null };
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
