// Server-only. Imagens do site público (foto principal, foto "Sobre"...).
// O servidor recorta no formato do espaço (4:3, 1600×1200), corrige a
// rotação da câmera e otimiza — o admin envia qualquer foto do computador.
// Bytes em site_images.image_data, servidos em /api/site-images/:id.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const SITE_IMAGE_SIZE = { width: 1600, height: 1200 } as const;

async function isAdmin() {
  const { requestActor } = await import("@/integrations/mysql/auth.server");
  return (await requestActor()).admin;
}

export const uploadSiteImage = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Envio inválido.");
    return data;
  })
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return { data: null, error: { message: "Acesso negado." } };
    const file = data.get("file");
    const slot = String(data.get("slot") ?? "hero").slice(0, 40);
    if (!(file instanceof File))
      return { data: null, error: { message: "Nenhum arquivo enviado." } };
    if (!/^image\/(jpeg|png|webp)$/.test(file.type))
      return { data: null, error: { message: "Envie uma imagem JPG, PNG ou WEBP." } };
    if (file.size > MAX_UPLOAD_BYTES)
      return { data: null, error: { message: "Imagem muito grande (máximo 15MB)." } };

    const sharp = (await import("sharp")).default;
    let processed;
    try {
      processed = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize({ ...SITE_IMAGE_SIZE, fit: "cover", position: "attention" })
        .jpeg({ quality: 86, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
    } catch {
      return { data: null, error: { message: "Não foi possível processar essa imagem." } };
    }

    const id = randomUUID();
    const { getPool } = await import("@/integrations/mysql/pool.server");
    await getPool().execute(
      "INSERT INTO site_images (id,slot,mime_type,width,height,byte_size,image_data) VALUES (?,?,?,?,?,?,?)",
      [
        id,
        slot,
        "image/jpeg",
        processed.info.width,
        processed.info.height,
        processed.info.size,
        processed.data,
      ],
    );
    return { data: { id }, error: null };
  });

export const deleteSiteImage = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().min(1).max(64) }).parse(data))
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return { error: { message: "Acesso negado." } };
    const { getPool } = await import("@/integrations/mysql/pool.server");
    await getPool().execute("DELETE FROM site_images WHERE id=?", [data.id]);
    return { error: null };
  });
