import { randomUUID } from "node:crypto";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { voices } from "@/db/schema";
import { jsonError } from "@/lib/api-error";
import { rejectCrossOrigin } from "@/lib/api-guard";
import {
  createVoiceModel,
  deleteVoiceModel,
  type FishVisibility,
} from "@/lib/fish/client";
import { toVoiceView } from "@/lib/serialize";
import {
  validateVoiceFiles,
  VISIBILITY_VALUES,
  VOICE_MAX_DESCRIPTION,
  VOICE_MAX_TITLE,
} from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = db
      .select()
      .from(voices)
      .orderBy(desc(voices.createdAt))
      .all();

    return Response.json({ voices: rows.map(toVoiceView) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  try {
    const form = await request.formData();

    const title = String(form.get("title") ?? "").trim();
    if (!title) {
      return Response.json({ error: "请填写声音名称" }, { status: 400 });
    }
    if (title.length > VOICE_MAX_TITLE) {
      return Response.json(
        { error: `声音名称不能超过 ${VOICE_MAX_TITLE} 字` },
        { status: 400 },
      );
    }

    const description =
      String(form.get("description") ?? "").trim() || undefined;
    if (description && description.length > VOICE_MAX_DESCRIPTION) {
      return Response.json(
        { error: `描述不能超过 ${VOICE_MAX_DESCRIPTION} 字` },
        { status: 400 },
      );
    }

    const visibilityRaw = String(form.get("visibility") ?? "private");
    if (!VISIBILITY_VALUES.includes(visibilityRaw as FishVisibility)) {
      return Response.json({ error: "无效的可见性" }, { status: 400 });
    }
    const visibility = visibilityRaw as FishVisibility;

    const files = form
      .getAll("voices")
      .filter((item): item is File => item instanceof File);

    const fileCheck = validateVoiceFiles(files);
    if (!fileCheck.ok) {
      return Response.json({ error: fileCheck.error }, { status: 400 });
    }

    const model = await createVoiceModel({
      title,
      description,
      visibility,
      files,
    });

    const now = new Date();
    const row = {
      id: randomUUID(),
      fishModelId: model._id,
      title,
      description: description ?? null,
      state: model.state ?? "created",
      visibility: model.visibility ?? visibility,
      languages: JSON.stringify(model.languages ?? []),
      createdAt: now,
      updatedAt: now,
    };

    try {
      db.insert(voices).values(row).run();
    } catch (error) {
      // Avoid leaving an orphaned Fish model when the local write fails.
      try {
        await deleteVoiceModel(model._id);
      } catch (cleanupError) {
        console.error(
          "[voices] failed to clean up Fish model after DB error",
          cleanupError,
        );
      }
      throw error;
    }

    return Response.json({ voice: toVoiceView(row) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
