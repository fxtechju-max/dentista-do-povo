import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

// Gallery photos are stored as bytea in the Supabase database (no object storage),
// so they're served through a plain GET here — outside the TanStack Start
// router/server-function RPC layer — so a normal <img src> just works.
const GALLERY_IMAGE_PATH = /^\/api\/gallery\/([0-9a-f-]{36})$/i;

async function serveGalleryImage(id: string): Promise<Response | null> {
  const { getPool } = await import("./integrations/mysql/pool.server");
  const [rows] = await getPool().execute<import("@/integrations/mysql/pool.server").Row[]>(
    "SELECT image_data, mime_type FROM gallery_photos WHERE id=?",
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return new Response(new Uint8Array(row["image_data"] as Buffer), {
    headers: {
      "content-type": String(row["mime_type"]),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

// Odontogram photos/X-rays are clinical data: served only to a logged-in
// administrator (session cookie checked here, outside the router context).
const TOOTH_ATTACHMENT_PATH = /^\/api\/tooth-attachments\/([0-9a-f-]{36})$/i;

async function serveToothAttachment(request: Request, id: string): Promise<Response> {
  const token = /(?:^|;\s*)ddp_session=([a-f0-9]{64})(?:;|$)/.exec(
    request.headers.get("cookie") ?? "",
  )?.[1];
  const forbidden = new Response("Acesso negado.", { status: 403 });
  if (!token) return forbidden;
  const { digest } = await import("./integrations/mysql/auth.server");
  const { getPool } = await import("./integrations/mysql/pool.server");
  type Row = import("@/integrations/mysql/pool.server").Row;
  const [admins] = await getPool().execute<Row[]>(
    "SELECT 1 FROM sessions s JOIN user_roles r ON r.user_id=s.user_id AND r.role='admin' WHERE s.token_hash=? AND s.expires_at>now() LIMIT 1",
    [digest(token)],
  );
  if (!admins.length) return forbidden;
  const [rows] = await getPool().execute<Row[]>(
    "SELECT image_data, mime_type FROM tooth_attachments WHERE id=?",
    [id],
  );
  const row = rows[0];
  if (!row) return new Response("Não encontrado.", { status: 404 });
  return new Response(new Uint8Array(row["image_data"] as Buffer), {
    headers: {
      "content-type": String(row["mime_type"]),
      "cache-control": "private, max-age=3600",
    },
  });
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      if (request.method === "GET") {
        const attachment = TOOTH_ATTACHMENT_PATH.exec(new URL(request.url).pathname);
        if (attachment?.[1]) return await serveToothAttachment(request, attachment[1]);
        const match = GALLERY_IMAGE_PATH.exec(new URL(request.url).pathname);
        if (match?.[1]) {
          const imageResponse = await serveGalleryImage(match[1]);
          if (imageResponse) return imageResponse;
        }
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
