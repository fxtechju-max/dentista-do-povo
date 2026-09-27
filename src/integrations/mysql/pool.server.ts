import mysql, { type Pool } from "mysql2/promise";

let pool: Pool | undefined;
export function getPool() {
  if (!pool) {
    const uri = process.env["MYSQL_URL"];
    if (!uri) throw new Error("Configure MYSQL_URL no servidor.");
    const ssl = process.env["MYSQL_SSL"] !== "false";
    pool = mysql.createPool({
      uri,
      connectionLimit: 3,
      maxIdle: 1,
      idleTimeout: 30000,
      waitForConnections: true,
      queueLimit: 30,
      connectTimeout: 10000,
      timezone: "Z",
      charset: "utf8mb4",
      decimalNumbers: true,
      ...(ssl
        ? {
            ssl: {
              rejectUnauthorized: true,
              ...(process.env["MYSQL_SSL_CA"]
                ? { ca: process.env["MYSQL_SSL_CA"].replace(/\\n/g, "\n") }
                : {}),
            },
          }
        : {}),
    });
    pool.on("connection", (connection) => {
      connection.query("SET time_zone = '+00:00'");
    });
  }
  return pool;
}
