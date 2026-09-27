import postgres from "postgres";
import { bindParameters } from "./sql";

export type RowDataPacket = Record<string, unknown>;
export type SqlParameter = string | number | boolean | null | Date | Uint8Array;
export interface Executor {
  execute<T extends RowDataPacket[] = RowDataPacket[]>(
    statement: string,
    values?: readonly SqlParameter[],
  ): Promise<[T]>;
}
export interface PoolConnection extends Executor {
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}
export interface DatabasePool extends Executor {
  getConnection(): Promise<PoolConnection>;
}

let pool: DatabasePool | undefined;
export function getPool(): DatabasePool {
  if (pool) return pool;
  const url = process.env["SUPABASE_DB_URL"];
  if (!url) throw new Error("Configure SUPABASE_DB_URL no servidor Vercel.");
  const sql = postgres(url, {
    ssl: "verify-full",
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    types: {
      numeric: { to: 1700, from: [1700], serialize: String, parse: Number },
      date: { to: 1082, from: [1082], serialize: String, parse: String },
    },
  });
  // Scope the schema inside every transaction; never rely on pooled session state.
  pool = {
    async execute<T extends RowDataPacket[]>(
      statement: string,
      values: readonly SqlParameter[] = [],
    ) {
      const rows = await sql.begin(async (tx) => {
        await tx`SET LOCAL search_path TO ddp, pg_catalog`;
        return tx.unsafe(bindParameters(statement, values.length), [...values]);
      });
      return [rows as unknown as T];
    },
    async getConnection() {
      const conn = await sql.reserve();
      let active = false;
      return {
        async beginTransaction() {
          await conn`BEGIN`;
          active = true;
          await conn`SET LOCAL search_path TO ddp, pg_catalog`;
        },
        async execute<T extends RowDataPacket[]>(
          statement: string,
          values: readonly SqlParameter[] = [],
        ) {
          if (!active) throw new Error("A consulta precisa de uma transação.");
          const rows = await conn.unsafe(bindParameters(statement, values.length), [...values]);
          return [rows as unknown as T];
        },
        async commit() {
          await conn`COMMIT`;
          active = false;
        },
        async rollback() {
          if (active) await conn`ROLLBACK`;
          active = false;
        },
        release() {
          conn.release();
        },
      };
    },
  };
  return pool;
}
