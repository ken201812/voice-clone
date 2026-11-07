import { eq } from "drizzle-orm";
import { db } from "@/db";
import { voices } from "@/db/schema";
import { jsonError } from "@/lib/api-error";
import { rejectCrossOrigin } from "@/lib/api-guard";
import { getVoiceModel } from "@/lib/fish/client";
import { toVoiceView } from "@/lib/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const row = db.select().from(voices).where(eq(voices.id, id)).get();
    if (!row) {
      return Response.json({ error: "声音不存在" }, { status: 404 });
    }

    const model = await getVoiceModel(row.fishModelId);

    db.update(voices)
      .set({
        state: model.state ?? row.state,
        languages: JSON.stringify(model.languages ?? []),
        updatedAt: new Date(),
      })
      .where(eq(voices.id, id))
      .run();

    const updated = db.select().from(voices).where(eq(voices.id, id)).get();
    return Response.json({ voice: updated ? toVoiceView(updated) : null });
  } catch (error) {
    return jsonError(error);
  }
}
