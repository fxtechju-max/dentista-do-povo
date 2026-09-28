// Conexão com o banco PostgreSQL (Supabase).
//
// O restante do código foi escrito no estilo "mysql2" (`execute(sql, params)`
// devolvendo `[rows]`, placeholders `?`). Este módulo mantém essa mesma
// interface por cima do driver `postgres`, para que as consultas continuem
// simples — mas agora falando com o Supabase.
import postgres, { type Sql, type ReservedSql } from "postgres";

export type Row = Record<string, unknown>;
type Param = string | number | boolean | null | Date | Buffer | Uint8Array | undefined;

/** Lê a URL do banco. Aceita os nomes criados pela integração Supabase ↔ Vercel. */
export function databaseUrl() {
  return (
    process.env["SUPABASE_DB_URL"] ||
    process.env["DATABASE_URL"] ||
    process.env["POSTGRES_URL"] ||
    process.env["POSTGRES_PRISMA_URL"] ||
    process.env["POSTGRES_URL_NON_POOLING"] ||
    ""
  );
}

/** Converte placeholders `?` (estilo MySQL) em `$1, $2...` (PostgreSQL). */
export function toPg(sql: string) {
  let i = 0;
  let out = "";
  let quote: string | null = null;
  for (const ch of sql) {
    if (quote) {
      if (ch === quote) quote = null;
      out += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
    } else if (ch === "`") {
      out += '"';
    } else if (ch === "?") {
      out += `$${++i}`;
    } else out += ch;
  }
  return out;
}

function params(values?: readonly Param[]) {
  return (values ?? []).map((v) => (v === undefined ? null : v)) as never[];
}

export type Executor = {
  execute<T = Row[]>(sql: string, values?: readonly Param[]): Promise<[T]>;
  query<T = Row[]>(sql: string, values?: readonly Param[]): Promise<[T]>;
};
export type PoolConnection = Executor & {
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
};
export type Pool = Executor & { getConnection(): Promise<PoolConnection>; end(): Promise<void> };

function executor(sql: Sql | ReservedSql, ready: () => Promise<void>): Executor {
  const run = async <T>(text: string, values?: readonly Param[]) => {
    await ready();
    const rows = await sql.unsafe(toPg(text), params(values));
    return [Array.from(rows) as T] as [T];
  };
  return { execute: run, query: run };
}

let client: Sql | undefined;
let pool: Pool | undefined;
let schemaReady: Promise<void> | undefined;

export function getSql() {
  if (!client) {
    const raw = databaseUrl();
    // A integração Supabase ↔ Vercel acrescenta parâmetros como
    // "?sslmode=require&supa=base-pooler.x" que o driver repassaria ao
    // servidor (e ele recusa). O SSL já é configurado abaixo, então removemos.
    const url = raw.split("?")[0] ?? "";
    if (!url)
      throw new Error(
        "Banco de dados não configurado. Neste computador, preencha SUPABASE_DB_URL no arquivo .env; na Vercel, conecte o Supabase ao projeto (variável POSTGRES_URL).",
      );
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    client = postgres(url, {
      // Conexões simultâneas por servidor (DB_POOL_MAX, padrão 3).
      max: Math.min(10, Math.max(1, Number(process.env["DB_POOL_MAX"]) || 3)),
      idle_timeout: 20,
      connect_timeout: 10,
      // O pooler do Supabase (porta 6543) não suporta prepared statements.
      prepare: false,
      ssl: local || process.env["DB_SSL"] === "false" ? false : { rejectUnauthorized: false },
      onnotice: () => {},
      types: {
        // numeric/decimal e bigint voltam como number (como no MySQL com decimalNumbers).
        pgNumeric: {
          to: 1700,
          from: [1700, 20],
          serialize: (x: unknown) => String(x),
          parse: (x: string) => Number(x),
        },
        // Colunas "date" voltam como texto AAAA-MM-DD, sem conversão de fuso.
        pgDateOnly: {
          to: 1082,
          from: [1082],
          serialize: (x: unknown) => (x instanceof Date ? x.toISOString().slice(0, 10) : String(x)),
          parse: (x: string) => x,
        },
      },
    });
  }
  return client;
}

function ready() {
  if (!schemaReady)
    schemaReady = import("./migrate.server")
      .then(({ ensureSchema }) => ensureSchema(getSql()))
      .catch((error) => {
        schemaReady = undefined;
        throw error;
      });
  return schemaReady;
}

export function getPool(): Pool {
  if (!pool) {
    const sql = getSql();
    pool = {
      ...executor(sql, ready),
      async end() {
        await sql.end();
        client = undefined;
        pool = undefined;
        schemaReady = undefined;
      },
      async getConnection() {
        await ready();
        const reserved = await sql.reserve();
        let open = false;
        return {
          ...executor(reserved, async () => {}),
          async beginTransaction() {
            await reserved.unsafe("BEGIN");
            open = true;
          },
          async commit() {
            await reserved.unsafe("COMMIT");
            open = false;
          },
          async rollback() {
            if (open) await reserved.unsafe("ROLLBACK").catch(() => {});
            open = false;
          },
          release() {
            reserved.release();
          },
        };
      },
    };
  }
  return pool;
}

/** Códigos de erro do PostgreSQL usados pela aplicação. */
export const PG_FOREIGN_KEY_VIOLATION = "23503";
