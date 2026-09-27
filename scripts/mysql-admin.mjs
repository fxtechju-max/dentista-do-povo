import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { connect } from "./mysql-connection.mjs";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (
  !email ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  !password ||
  password.length < 12 ||
  Buffer.byteLength(password) > 72
) {
  throw new Error(
    "Defina ADMIN_EMAIL e ADMIN_PASSWORD (12 caracteres no mínimo; até 72 bytes) no ambiente local.",
  );
}
const conn = await connect();
try {
  await conn.beginTransaction();
  const [existing] = await conn.execute("SELECT id FROM users WHERE email=? FOR UPDATE", [email]);
  if (existing.length && !process.argv.includes("--reset-password"))
    throw new Error(
      "Usuário já existe. Para redefinir sua senha, use --reset-password explicitamente.",
    );
  const id = existing[0]?.id ?? randomUUID();
  const passwordHash = await hash(password, 12);
  if (existing.length)
    await conn.execute("UPDATE users SET password_hash=? WHERE id=?", [passwordHash, id]);
  else
    await conn.execute("INSERT INTO users (id,email,password_hash) VALUES (?,?,?)", [
      id,
      email,
      passwordHash,
    ]);
  await conn.execute(
    "INSERT INTO user_roles (id,user_id,role) VALUES (?,?,'admin') ON DUPLICATE KEY UPDATE role='admin'",
    [randomUUID(), id],
  );
  await conn.commit();
  console.log("Administrador configurado. A senha não foi exibida.");
} catch (error) {
  await conn.rollback();
  throw error;
} finally {
  await conn.end();
}
