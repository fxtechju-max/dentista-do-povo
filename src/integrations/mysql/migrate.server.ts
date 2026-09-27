// Cria/atualiza as tabelas no Supabase automaticamente.
//
// Na primeira consulta de cada servidor, conferimos a tabela
// `schema_migrations` e aplicamos, em ordem, os arquivos de
// `supabase/migrations/*.sql` que ainda não rodaram. Assim não é preciso
// rodar nenhum comando manual depois de conectar o banco.
import type { Sql } from "postgres";
import { createHash } from "node:crypto";

// Fora do Vite (ex.: testes com tsx) import.meta.glob não existe.
const files = (
  typeof import.meta.glob === "function"
    ? import.meta.glob("/supabase/migrations/*.sql", {
        query: "?raw",
        import: "default",
        eager: true,
      })
    : {}
) as Record<string, string>;

export const migrations = Object.entries(files)
  .map(([path, sql]) => ({ name: path.split("/").pop()!, sql }))
  .sort((a, b) => a.name.localeCompare(b.name));

export async function ensureSchema(sql: Sql) {
  const [check] = await sql.unsafe<{ exists: boolean }[]>(
    "select to_regclass('public.schema_migrations') is not null as exists",
  );
  if (check?.exists) {
    const applied = await sql.unsafe<{ name: string }[]>("select name from schema_migrations");
    const done = new Set(applied.map((r) => r.name));
    if (migrations.every((m) => done.has(m.name))) return;
  }
  await sql.begin(async (tx) => {
    // Evita que dois servidores apliquem a mesma migração ao mesmo tempo.
    await tx.unsafe("select pg_advisory_xact_lock(7426031)");
    await tx.unsafe(`create table if not exists schema_migrations (
      name varchar(191) primary key,
      checksum char(64) not null,
      applied_at timestamptz(3) not null default now()
    )`);
    await tx.unsafe("alter table schema_migrations enable row level security");
    const applied = await tx.unsafe<{ name: string }[]>("select name from schema_migrations");
    const done = new Set(applied.map((r) => r.name));
    for (const m of migrations) {
      if (done.has(m.name)) continue;
      await tx.unsafe(m.sql).simple();
      await tx.unsafe("insert into schema_migrations (name, checksum) values ($1, $2)", [
        m.name,
        createHash("sha256").update(m.sql).digest("hex"),
      ]);
      console.log(`[banco] Migração aplicada: ${m.name}`);
    }
  });
}
