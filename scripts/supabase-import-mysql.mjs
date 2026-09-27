// Source is read-only. Import into an EMPTY ddp schema, atomically, preserving IDs and password hashes.
import mysql from "mysql2/promise";
import { connect } from "./supabase-connection.mjs";

if (!process.env.MYSQL_SOURCE_URL)
  throw new Error("Configure MYSQL_SOURCE_URL apenas para a importação.");
const source = await mysql.createConnection({
  uri: process.env.MYSQL_SOURCE_URL,
  timezone: "Z",
  ...(process.env.MYSQL_SOURCE_SSL !== "false" ? { ssl: { rejectUnauthorized: true } } : {}),
});
const target = connect();
const tables = [
  "users",
  "user_roles",
  "profiles",
  "clinic_settings",
  "patients",
  "treatments",
  "services",
  "leads",
  "whatsapp_contacts",
  "blog_posts",
  "appointments",
  "budgets",
  "payments",
  "finance_entries",
  "prescriptions",
  "documents",
  "patient_anamnesis",
  "tooth_records",
  "clinical_notes",
  "conversations",
  "messages",
  "ai_search_history",
  "gallery_photos",
  "audit_log",
];
try {
  await source.query("SET TRANSACTION READ ONLY");
  await source.beginTransaction();
  await target.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(277092026)`;
    for (const table of tables) {
      const [{ count }] = await tx`SELECT count(*) FROM ${tx("ddp", table)}`;
      if (Number(count) && table !== "clinic_settings")
        throw new Error(`Destino não está vazio: ${table}. Importação cancelada.`);
    }
    // The migration creates only this placeholder. Reject real destination settings.
    const [settings] = await tx`SELECT * FROM ddp.clinic_settings WHERE id='default'`;
    if (
      settings &&
      (settings.clinic_name || settings.ai_gateway_api_key || settings.phone || settings.address)
    )
      throw new Error("Destino já possui configurações. Importação cancelada.");
    await tx`DELETE FROM ddp.clinic_settings WHERE id='default'`;
    for (const table of tables) {
      const columns =
        await tx`SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='ddp' AND table_name=${table}`;
      const [rows] = await source.query(`SELECT * FROM \`${table}\``);
      for (const row of rows) {
        const data = {};
        for (const { column_name: key, data_type: type } of columns) {
          if (!(key in row)) continue;
          const value = row[key];
          data[key] =
            value == null
              ? null
              : type === "boolean"
                ? Boolean(value)
                : type === "jsonb"
                  ? typeof value === "string"
                    ? JSON.parse(value)
                    : value
                  : type === "date" && value instanceof Date
                    ? value.toISOString().slice(0, 10)
                    : value;
        }
        // JSON must be tagged explicitly; arrays must not become PostgreSQL arrays.
        for (const { column_name: key, data_type: type } of columns)
          if (type === "jsonb" && data[key] != null) data[key] = tx.json(data[key]);
        await tx`INSERT INTO ${tx("ddp", table)} ${tx(data)}`;
      }
      const [{ count }] = await tx`SELECT count(*) FROM ${tx("ddp", table)}`;
      if (Number(count) !== rows.length) throw new Error(`Contagem divergente: ${table}`);
      console.log(`${table}: ${rows.length} registros conferidos.`);
    }
  });
  await source.commit();
  console.log("Importação concluída. A origem foi preservada. Faça login novamente.");
} finally {
  await source.end();
  await target.end();
}
