import fs from "node:fs";
import { Readable } from "node:stream";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { generations } from "@/db/schema";
import { jsonError } from "@/lib/api-error";
import { rejectCrossOrigin } from "@/lib/api-guard";
import { mimeForFormat, resolveDataPath } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function toWebStream(filePath: string, options?: { start: number; end: number }) {
  return Readable.toWeb(
    fs.createReadStream(filePath, options),
  ) as unknown as ReadableStream;
}

export async function GET(request: Request, context: RouteContext) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  try {
    const { id } = await context.params;

    const row = db
      .select()
      .from(generations)
      .where(eq(generations.id, id))
      .get();

    if (!row) {
      return Response.json({ error: "音频不存在" }, { status: 404 });
    }

    let filePath: string;
    try {
      filePath = resolveDataPath(row.filePath);
    } catch {
      return Response.json({ error: "音频路径非法" }, { status: 400 });
    }

    if (!fs.existsSync(filePath)) {
      return Response.json({ error: "音频文件已丢失" }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const baseHeaders: Record<string, string> = {
      "Content-Type": mimeForFormat(row.format),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=31536000, immutable",
    };

    const range = request.headers.get("range");
    if (!range) {
      return new Response(toWebStream(filePath), {
        headers: { ...baseHeaders, "Content-Length": String(stat.size) },
      });
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match) {
      return new Response(null, {
        status: 416,
        headers: { ...baseHeaders, "Content-Range": `bytes */${stat.size}` },
      });
    }

    const [, startRaw, endRaw] = match;
    let start = startRaw ? Number(startRaw) : 0;
    let end = endRaw ? Number(endRaw) : stat.size - 1;

    // Suffix range: bytes=-500 means the last 500 bytes.
    if (!startRaw && endRaw) {
      const suffixLength = Number(endRaw);
      start = Math.max(stat.size - suffixLength, 0);
      end = stat.size - 1;
    }

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start > end ||
      start >= stat.size
    ) {
      return new Response(null, {
        status: 416,
        headers: { ...baseHeaders, "Content-Range": `bytes */${stat.size}` },
      });
    }

    end = Math.min(end, stat.size - 1);

    return new Response(toWebStream(filePath, { start, end }), {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
