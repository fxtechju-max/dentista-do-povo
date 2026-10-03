// Server-only. JSON export/import + wipe for operational data. Deliberately
// excludes accounts (users/sessions/user_roles/profiles), clinic_settings
// (including the AI Gateway credentials columns) and gallery_photos (its
// image_data blob can't round-trip through JSON) — restoring or wiping this
// backup can never lock the admin out of their own system.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Row as RowDataPacket } from "@/integrations/mysql/pool.server";
import { tableColumns, type TableName } from "@/integrations/mysql/tables";
import type { Json } from "@/integrations/mysql/types";
import { placeholder } from "@/integrations/mysql/json-columns";
import { DELETE_MODULES, deletePlan, type DeleteModuleId } from "./backup-modules";

// Parent-first order (for export/restore); reversed gives a safe delete order.
const OPERATIONAL_TABLES = [
  "patients",
  "treatments",
  "services",
  "leads",
  "whatsapp_contacts",
  "blog_posts",
  "appointments",
  "budgets",
  "cash_sessions",
  "cash_movements",
  "payments",
  "finance_entries",
  "prescriptions",
  "documents",
  "patient_anamnesis",
  "tooth_records",
  "tooth_procedures",
  "clinical_notes",
  "conversations",
  "messages",
  "ai_search_history",
] as const satisfies readonly TableName[];
export type OperationalTable = (typeof OPERATIONAL_TABLES)[number];

const PRIMARY_KEY: Partial<Record<OperationalTable, string>> = {
  patient_anamnesis: "patient_id",
};
const BOOLEAN_COLUMNS = new Set([
  "active",
  "is_smoker",
  "is_pregnant",
  "has_diabetes",
  "has_hypertension",
  "has_heart_condition",
]);

export const listBackupTables = createServerFn({ method: "POST" }).handler(async () => {
  const { requestActor } = await import("@/integrations/mysql/auth.server");
  const actor = await requestActor();
  if (!actor.admin) return { data: null, error: { message: "Acesso negado." } };
  return { data: OPERATIONAL_TABLES, error: null };
});

export const exportBackup = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ tables: z.array(z.enum(OPERATIONAL_TABLES)).min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { getPool } = await import("@/integrations/mysql/pool.server");
    const { requestActor } = await import("@/integrations/mysql/auth.server");
    const actor = await requestActor();
    if (!actor.admin) return { data: null, error: { message: "Acesso negado." } };
    const pool = getPool();
    const tables: Record<string, Record<string, Json>[]> = {};
    for (const table of data.tables) {
      const columns = tableColumns[table];
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT ${columns.map((c) => `\`${c}\``).join(",")} FROM \`${table}\``,
      );
      tables[table] = rows.map(
        (row) =>
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              key,
              value instanceof Date ? value.toISOString() : (value as Json),
            ]),
          ) as Record<string, Json>,
      );
    }
    return {
      data: { version: 1, exportedAt: new Date().toISOString(), tables },
      error: null,
    };
  });

const jsonValue: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(z.string(), jsonValue),
  ]),
);
const restoreInput = z.object({
  tables: z.record(z.string(), z.array(z.record(z.string(), jsonValue))),
});

export const restoreBackup = createServerFn({ method: "POST" })
  .validator((data: unknown) => restoreInput.parse(data))
  .handler(async ({ data }) => {
    const { getPool } = await import("@/integrations/mysql/pool.server");
    const { requestActor } = await import("@/integrations/mysql/auth.server");
    const actor = await requestActor();
    if (!actor.admin) return { error: { message: "Acesso negado." }, restored: 0 };

    const entries = Object.entries(data.tables).filter(
      (entry): entry is [OperationalTable, Record<string, Json>[]] =>
        (OPERATIONAL_TABLES as readonly string[]).includes(entry[0]),
    );
    if (!entries.length)
      return { error: { message: "Arquivo sem tabelas reconhecidas." }, restored: 0 };

    const conn = await getPool().getConnection();
    let restored = 0;
    try {
      await conn.beginTransaction();
      // Parent tables first, in the same order as OPERATIONAL_TABLES.
      const ordered = OPERATIONAL_TABLES.map((t) => entries.find((e) => e[0] === t)).filter(
        (e): e is [OperationalTable, Record<string, Json>[]] => !!e,
      );
      for (const [table, rows] of ordered) {
        const allowed = new Set<string>(tableColumns[table]);
        const pk = PRIMARY_KEY[table] ?? "id";
        for (const row of rows) {
          const keys = Object.keys(row).filter((k) => allowed.has(k));
          if (!keys.includes(pk)) continue;
          const values = keys.map((k) => {
            const v = row[k];
            if (v == null) return null;
            if (BOOLEAN_COLUMNS.has(k)) return Boolean(v);
            if (k.endsWith("_at") && typeof v === "string") return new Date(v);
            if (Array.isArray(v)) return JSON.stringify(v);
            return v as string | number;
          });
          const mutable = keys.filter((k) => k !== pk);
          await conn.execute(
            `INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(",")}) VALUES (${keys.map(placeholder).join(",")})
             ON CONFLICT (${pk}) ${mutable.length ? "DO UPDATE SET " + mutable.map((k) => `"${k}"=EXCLUDED."${k}"`).join(",") : "DO NOTHING"}`,
            values,
          );
          restored++;
        }
      }
      await conn.commit();
      return { error: null, restored };
    } catch (error) {
      await conn.rollback();
      return {
        error: { message: error instanceof Error ? error.message : "Falha ao restaurar." },
        restored: 0,
      };
    } finally {
      conn.release();
    }
  });

export const wipeOperationalData = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ confirm: z.literal("APAGAR") }).parse(data))
  .handler(async () => {
    const { getPool } = await import("@/integrations/mysql/pool.server");
    const { requestActor } = await import("@/integrations/mysql/auth.server");
    const actor = await requestActor();
    if (!actor.admin) return { error: { message: "Acesso negado." } };
    const conn = await getPool().getConnection();
    try {
      await conn.beginTransaction();
      // Anexos do odontograma dependem dos pacientes e ficam fora do backup.
      await conn.execute("DELETE FROM tooth_attachments");
      for (const table of [...OPERATIONAL_TABLES].reverse()) {
        await conn.execute(`DELETE FROM \`${table}\``);
      }
      await conn.commit();
      return { error: null };
    } catch (error) {
      await conn.rollback();
      return { error: { message: error instanceof Error ? error.message : "Falha ao apagar." } };
    } finally {
      conn.release();
    }
  });

const moduleIds = DELETE_MODULES.map((m) => m.id) as [DeleteModuleId, ...DeleteModuleId[]];
const COUNT_TABLES = [...new Set(DELETE_MODULES.flatMap((m) => m.tables))];

/** Quantidade de registros de cada tabela usada pelos módulos. */
export const getDeleteCounts = createServerFn({ method: "POST" }).handler(async () => {
  const { getPool } = await import("@/integrations/mysql/pool.server");
  const { requestActor } = await import("@/integrations/mysql/auth.server");
  if (!(await requestActor()).admin) return { data: null, error: { message: "Acesso negado." } };
  const sql = COUNT_TABLES.map((t) => `SELECT '${t}' AS t, count(*)::int AS n FROM "${t}"`).join(
    " UNION ALL ",
  );
  const [rows] = await getPool().execute<RowDataPacket[]>(sql);
  const counts: Record<string, number> = {};
  for (const r of rows) counts[String(r["t"])] = Number(r["n"]);
  return { data: counts, error: null };
});

/** Apaga só os módulos escolhidos (e o que depende deles), numa transação. */
export const wipeModules = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ modules: z.array(z.enum(moduleIds)).min(1), confirm: z.literal("APAGAR") })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { getPool } = await import("@/integrations/mysql/pool.server");
    const { requestActor } = await import("@/integrations/mysql/auth.server");
    if (!(await requestActor()).admin) return { error: { message: "Acesso negado." }, deleted: 0 };
    const conn = await getPool().getConnection();
    let deleted = 0;
    try {
      await conn.beginTransaction();
      for (const step of deletePlan(data.modules)) {
        const where = step.where ? ` WHERE ${step.where}` : "";
        const [rows] = await conn.execute<RowDataPacket[]>(
          `WITH d AS (DELETE FROM "${step.table}"${where} RETURNING 1) SELECT count(*)::int AS n FROM d`,
        );
        deleted += Number(rows[0]?.["n"] ?? 0);
      }
      await conn.commit();
      return { error: null, deleted };
    } catch (error) {
      await conn.rollback();
      return {
        error: { message: error instanceof Error ? error.message : "Falha ao apagar." },
        deleted: 0,
      };
    } finally {
      conn.release();
    }
  });
