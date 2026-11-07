import { eq } from "drizzle-orm";
import { db } from "@/db";
import { voices } from "@/db/schema";
import { jsonError } from "@/lib/api-error";
import { rejectCrossOrigin } from "@/lib/api-guard";
import { deleteVoiceModel, updateVoiceModel } from "@/lib/fish/client";
import { toVoiceView } from "@/lib/serialize";
import { voicePatchSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const row = db.select().from(voices).where(eq(voices.id, id)).get();
    if (!row) {
      return Response.json({ error: "声音不存在" }, { status: 404 });
    }
    return Response.json({ voice: toVoiceView(row) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const row = db.select().from(voices).where(eq(voices.id, id)).get();
    if (!row) {
      return Response.json({ error: "声音不存在" }, { status: 404 });
    }

    const patch = voicePatchSchema.parse(await request.json());
    if (Object.keys(patch).length === 0) {
      return Response.json({ error: "没有需要更新的字段" }, { status: 400 });
    }

    // PATCH /model/{id} returns an empty 200 body; the client re-reads the
    // model so we store the effective values (Fish can downgrade visibility).
    const model = await updateVoiceModel(row.fishModelId, patch);

    const description =
      model.description !== undefined
        ? model.description || null
        : patch.description !== undefined
          ? patch.description || null
          : row.description;

    const now = new Date();
    db.update(voices)
      .set({
        title: model.title ?? patch.title ?? row.title,
        description,
        visibility: model.visibility ?? patch.visibility ?? row.visibility,
        state: model.state ?? row.state,
        languages: model.languages
          ? JSON.stringify(model.languages)
          : row.languages,
        updatedAt: now,
      })
      .where(eq(voices.id, id))
      .run();

    const updated = db.select().from(voices).where(eq(voices.id, id)).get();
    return Response.json({ voice: updated ? toVoiceView(updated) : null });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const row = db.select().from(voices).where(eq(voices.id, id)).get();
    if (!row) {
      return Response.json({ error: "声音不存在" }, { status: 404 });
    }

    await deleteVoiceModel(row.fishModelId);
    db.delete(voices).where(eq(voices.id, id)).run();

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
