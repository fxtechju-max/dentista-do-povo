import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { connect } from "./supabase-connection.mjs";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (
  !email ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  !password ||
  password.length < 12 ||
  Buffer.byteLength(password) > 72
)
  throw new Error(
    "Configure ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 12 caracteres, máximo 72 bytes).",
  );
const sql = connect();
try {
  await sql.begin(async (tx) => {
    const [existing] = await tx`SELECT id FROM ddp.users WHERE email=${email} FOR UPDATE`;
    if (existing && !process.argv.includes("--reset-password"))
      throw new Error("Usuário já existe. Redefinição exige --reset-password.");
    const id = existing?.id ?? randomUUID();
    const passwordHash = await hash(password, 12);
    await tx`INSERT INTO ddp.users (id,email,password_hash) VALUES (${id},${email},${passwordHash})
      ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash`;
    await tx`INSERT INTO ddp.user_roles (user_id,role) VALUES (${id},'admin') ON CONFLICT (user_id,role) DO NOTHING`;
    if (existing) await tx`DELETE FROM ddp.sessions WHERE user_id=${id}`;
  });
  console.log("Administrador configurado. A senha não foi exibida.");
} finally {
  await sql.end();
}
