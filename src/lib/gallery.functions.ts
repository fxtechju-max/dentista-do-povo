// Server-only. Photos are resized/re-encoded here before storage so the
// public gallery stays fast: a consistent max dimension and JPEG quality
// keep files small without visibly losing quality, and normalizes whatever
// the visitor's camera/phone produced (including EXIF rotation). The bytes
// themselves live in the gallery_photos.image_data blob (MySQL) and are
// served by src/server.ts at /api/gallery/:id.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 88;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

async function requireAdmin() {
  const { requestActor } = await import("@/integrations/supabase/auth.server");
  const actor = await requestActor();
  return actor.admin ? actor.userId : null;
}

export const uploadGalleryPhoto = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Envio inválido.");
    return data;
  })
  .handler(async ({ data }) => {
    const { getPool } = await import("@/integrations/supabase/pool.server");
    if (!(await requireAdmin())) return { data: null, error: { message: "Acesso negado." } };

    const file = data.get("file");
    if (!(file instanceof File))
      return { data: null, error: { message: "Nenhum arquivo enviado." } };
    if (!file.type.startsWith("image/")) {
      return { data: null, error: { message: "Envie apenas arquivos de imagem." } };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { data: null, error: { message: "Imagem muito grande (máximo 15MB)." } };
    }
    const title = String(data.get("title") ?? "").trim() || null;

    const sharp = (await import("sharp")).default;
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    let processed;
    try {
      processed = await sharp(inputBuffer)
        .rotate()
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
    } catch {
      return { data: null, error: { message: "Não foi possível processar essa imagem." } };
    }

    const id = randomUUID();
    await getPool().execute(
      "INSERT INTO gallery_photos (id,title,mime_type,width,height,byte_size,image_data) VALUES (?,?,?,?,?,?,?)",
      [
        id,
        title,
        "image/jpeg",
        processed.info.width,
        processed.info.height,
        processed.info.size,
        processed.data,
      ],
    );
    return { data: { id }, error: null };
  });

export const deleteGalleryPhoto = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { getPool } = await import("@/integrations/supabase/pool.server");
    if (!(await requireAdmin())) return { error: { message: "Acesso negado." } };
    await getPool().execute("DELETE FROM gallery_photos WHERE id=?", [data.id]);
    return { error: null };
  });
