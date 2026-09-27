import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { connect } from "./supabase-connection.mjs";

const sql = connect();
try {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(277092026)`;
    await tx`CREATE SCHEMA IF NOT EXISTS ddp`;
    await tx`CREATE TABLE IF NOT EXISTS ddp.schema_migrations (
      name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
    )`;
    const folder = new URL("../supabase/migrations/", import.meta.url);
    for (const name of (await readdir(folder)).filter((f) => f.endsWith(".sql")).sort()) {
      const body = await readFile(new URL(name, folder), "utf8");
      const checksum = createHash("sha256").update(body).digest("hex");
      const [existing] = await tx`SELECT checksum FROM ddp.schema_migrations WHERE name=${name}`;
      if (existing) {
        if (existing.checksum !== checksum)
          throw new Error(`Migração aplicada foi alterada: ${name}`);
        continue;
      }
      await tx.unsafe(body);
      await tx`INSERT INTO ddp.schema_migrations (name,checksum) VALUES (${name},${checksum})`;
      console.log(`Aplicada: ${name}`);
    }
  });
  console.log("Estrutura Supabase atualizada.");
} finally {
  await sql.end();
}
