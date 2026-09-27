// Source is always READ ONLY. Run during a maintenance window against an empty MySQL target.
import postgres from "postgres";
import { connect } from "./mysql-connection.mjs";

if (!process.env.POSTGRES_SOURCE_URL)
  throw new Error("Configure POSTGRES_SOURCE_URL para a origem.");
const write = process.argv.includes("--write");
const source = postgres(process.env.POSTGRES_SOURCE_URL, { max: 1, ssl: "verify-full" });
const target = await connect();
const tables = [
  "user_roles",
  "profiles",
  "patients",
  "conversations",
  "messages",
  "appointments",
  "payments",
  "leads",
  "treatments",
  "budgets",
  "prescriptions",
  "documents",
  "whatsapp_contacts",
  "services",
  "clinic_settings",
  "blog_posts",
  "patient_anamnesis",
  "tooth_records",
  "clinical_notes",
];
try {
  await source.begin("isolation level repeatable read read only", async (sql) => {
    await target.beginTransaction();
    try {
      for (const table of ["users", ...tables, "sessions"]) {
        const [rows] = await target.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
        if (Number(rows[0].n) !== 0)
          throw new Error(
            `Destino não está vazio (${table}). Use um banco novo; nenhum dado será sobrescrito.`,
          );
      }
      for (const table of ["users", ...tables]) {
        const relation = table === "users" ? "auth.users" : `public.${table}`;
        const [count] = await sql`SELECT COUNT(*) AS n FROM ${sql(relation)}`;
        let imported = 0;
        const selection =
          table === "users"
            ? sql`SELECT id,email,encrypted_password AS password_hash,created_at FROM auth.users ORDER BY id`
            : sql`SELECT * FROM ${sql(relation)}`;
        const [targetColumns] = await target.query(`SHOW COLUMNS FROM \`${table}\``);
        const allowed = new Set(targetColumns.map((c) => c.Field));
        for await (const batch of selection.cursor(250)) {
          for (const row of batch) {
            const keys = Object.keys(row).filter((k) => allowed.has(k));
            if (table === "users" && !row.email)
              throw new Error(
                "Existe usuário sem email. Defina seu tratamento antes da importação.",
              );
            const values = keys.map((k) => {
              const value = row[k];
              if (k.endsWith("_at") && value != null) return new Date(value);
              if (
                Array.isArray(value) ||
                (value && typeof value === "object" && !(value instanceof Date))
              )
                return JSON.stringify(value);
              return value;
            });
            if (write)
              await target.execute(
                `INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
                values,
              );
            imported++;
          }
        }
        if (imported !== Number(count.n)) throw new Error(`Contagem divergente: ${table}`);
        if (write) {
          const [actual] = await target.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
          if (Number(actual[0].n) !== imported)
            throw new Error(`Verificação de destino falhou: ${table}`);
        }
        console.log(
          `${table}: ${imported} registros ${write ? "copiados e conferidos" : "verificados (simulação)"}`,
        );
      }
      if (write) await target.commit();
      else await target.rollback();
    } catch (error) {
      await target.rollback();
      throw error;
    }
  });
  console.log(
    write
      ? "Importação concluída. A origem não foi alterada."
      : "Simulação concluída. Use --write para importar.",
  );
} finally {
  await source.end();
  await target.end();
}
