import type { Database } from "./types";
import type { Query, Result, DataRow } from "./protocol";
import type { TableName } from "./tables";

export type Executor = (query: Query) => Promise<Result<DataRow[] | DataRow>>;
type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"] & { patients: { name: string } | null };

/** Small typed query API shared by UI and trusted server operations. SQL stays on the server. */
class QueryBuilder<T extends TableName, Single extends boolean = false> implements PromiseLike<Result<Single extends true ? Row<T> : Row<T>[]>> {
  private query: Query;
  constructor(private executor: Executor, table: T) {
    this.query = { table, action: "select", columns: "*", filters: [], order: [], count: false, head: false, returning: false };
  }
  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.query.columns = columns; this.query.count = options?.count === "exact"; this.query.head = options?.head ?? false;
    if (this.query.action !== "select") this.query.returning = true;
    return this;
  }
  insert(values: Database["public"]["Tables"][T]["Insert"]) { this.query.action = "insert"; this.query.values = values as Query["values"]; return this; }
  update(values: Database["public"]["Tables"][T]["Update"]) { this.query.action = "update"; this.query.values = values as Query["values"]; return this; }
  upsert(values: Database["public"]["Tables"][T]["Insert"], options?: { onConflict?: string }) {
    this.insert(values); this.query.action = "upsert"; if (options?.onConflict) this.query.onConflict = options.onConflict; return this;
  }
  delete() { this.query.action = "delete"; return this; }
  private filter(column: string, op: Query["filters"][number]["op"], value: Query["filters"][number]["value"]) { this.query.filters.push({ column, op, value }); return this; }
  eq(column: string, value: string | number | boolean | null) { return this.filter(column, "eq", value); }
  gte(column: string, value: string | number) { return this.filter(column, "gte", value); }
  lte(column: string, value: string | number) { return this.filter(column, "lte", value); }
  gt(column: string, value: string | number) { return this.filter(column, "gt", value); }
  lt(column: string, value: string | number) { return this.filter(column, "lt", value); }
  in(column: string, value: string[]) { return this.filter(column, "in", value); }
  order(column: string, options?: { ascending?: boolean }) { this.query.order.push({ column, ascending: options?.ascending ?? true }); return this; }
  limit(limit: number) { this.query.limit = limit; return this; }
  single() { this.query.single = "one"; return this as unknown as QueryBuilder<T, true>; }
  maybeSingle() { this.query.single = "maybe"; return this as unknown as QueryBuilder<T, true>; }
  then<TResult1 = Result<Single extends true ? Row<T> : Row<T>[]>, TResult2 = never>(
    onfulfilled?: ((value: Result<Single extends true ? Row<T> : Row<T>[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return (this.executor(this.query) as unknown as Promise<Result<Single extends true ? Row<T> : Row<T>[]>>).then(onfulfilled, onrejected);
  }
}
export const createDataClient = (executor: Executor) => ({ from: <T extends TableName>(table: T) => new QueryBuilder(executor, table) });
