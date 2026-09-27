import { createHash, randomBytes } from "node:crypto";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import type { Row as RowDataPacket } from "./pool.server";
import { getPool } from "./pool.server";
import type { Actor } from "./protocol";

const SESSION = "ddp_session";
const VISITOR = "ddp_visitor";
const cookieOptions = {
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",
  sameSite: "lax" as const,
  path: "/",
};
export const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function currentUser() {
  const token = getCookie(SESSION);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [rows] = await getPool().execute<RowDataPacket[]>(
    "SELECT u.id, u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>now()",
    [digest(token)],
  );
  const row = rows[0];
  return row ? { id: String(row["id"]), email: String(row["email"]) } : null;
}

export async function requestActor(): Promise<Actor> {
  const user = await currentUser();
  let admin = false;
  if (user) {
    const [rows] = await getPool().execute<RowDataPacket[]>(
      "SELECT id FROM user_roles WHERE user_id=? AND role='admin' LIMIT 1",
      [user.id],
    );
    admin = rows.length > 0;
  }
  const token = getCookie(VISITOR);
  return {
    userId: user?.id ?? null,
    admin,
    visitorHash: token && /^[a-f0-9]{64}$/.test(token) ? digest(token) : null,
  };
}

export function ensureVisitor(): string {
  let token = getCookie(VISITOR);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = randomBytes(32).toString("hex");
    setCookie(VISITOR, token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  }
  return digest(token);
}

export async function createSession(userId: string) {
  await destroySession();
  const token = randomBytes(32).toString("hex");
  await getPool().execute(
    "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,now() + interval '7 days')",
    [digest(token), userId],
  );
  setCookie(SESSION, token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });
}
export async function destroySession() {
  const token = getCookie(SESSION);
  if (token) await getPool().execute("DELETE FROM sessions WHERE token_hash=?", [digest(token)]);
  deleteCookie(SESSION, cookieOptions);
}

// Used after a password change so other logged-in devices are signed out immediately.
export async function destroyOtherSessions(userId: string) {
  const token = getCookie(SESSION);
  await getPool().execute("DELETE FROM sessions WHERE user_id=? AND token_hash<>?", [
    userId,
    token ? digest(token) : "",
  ]);
}

// Shared across serverless instances, unlike an in-memory counter.
export async function rateLimit(bucket: string, maximum: number, seconds: number) {
  const key = digest(bucket);
  await getPool().execute(
    `INSERT INTO rate_limits (bucket,hits,expires_at) VALUES (?,1,now() + make_interval(secs => ?::int))
    ON CONFLICT (bucket) DO UPDATE SET
      hits = CASE WHEN rate_limits.expires_at<=now() THEN 1 ELSE rate_limits.hits+1 END,
      expires_at = CASE WHEN rate_limits.expires_at<=now() THEN EXCLUDED.expires_at ELSE rate_limits.expires_at END`,
    [key, seconds],
  );
  const [rows] = await getPool().execute<RowDataPacket[]>(
    "SELECT hits FROM rate_limits WHERE bucket=?",
    [key],
  );
  if (Number(rows[0]?.["hits"]) > maximum)
    throw new Error("Muitas tentativas. Aguarde alguns minutos.");
}
