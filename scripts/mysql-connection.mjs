import mysql from "mysql2/promise";
export function mysqlOptions() {
  if (!process.env.MYSQL_URL) throw new Error("Configure MYSQL_URL. Nenhuma alteração foi feita.");
  return {
    uri: process.env.MYSQL_URL,
    timezone: "Z",
    charset: "utf8mb4",
    decimalNumbers: true,
    ssl:
      process.env.MYSQL_SSL === "false"
        ? undefined
        : {
            rejectUnauthorized: true,
            ...(process.env.MYSQL_SSL_CA
              ? { ca: process.env.MYSQL_SSL_CA.replace(/\\n/g, "\n") }
              : {}),
          },
  };
}
export async function connect() {
  const connection = await mysql.createConnection(mysqlOptions());
  await connection.query("SET time_zone = '+00:00'");
  return connection;
}
