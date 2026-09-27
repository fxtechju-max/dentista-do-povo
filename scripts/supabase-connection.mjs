import postgres from "postgres";

export function connect() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("Configure SUPABASE_DB_URL no ambiente seguro do servidor.");
  return postgres(url, {
    ssl: "verify-full",
    max: 1,
    prepare: false,
    connect_timeout: 15,
    types: { date: { to: 1082, from: [1082], serialize: String, parse: String } },
  });
}
