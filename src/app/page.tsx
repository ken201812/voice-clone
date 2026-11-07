import { desc, eq } from "drizzle-orm";
import { TtsForm } from "@/components/tts-form";
import { db } from "@/db";
import { generations, voices } from "@/db/schema";
import { RECENT_GENERATIONS_LIMIT } from "@/lib/fish/constants";
import { toGenerationView, toVoiceView } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const voiceRows = db
    .select()
    .from(voices)
    .orderBy(desc(voices.createdAt))
    .all();

  const historyRows = db
    .select({ generation: generations, voiceTitle: voices.title })
    .from(generations)
    .leftJoin(voices, eq(generations.voiceId, voices.id))
    .orderBy(desc(generations.createdAt))
    .limit(RECENT_GENERATIONS_LIMIT)
    .all();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">语音合成</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          选择已克隆的声音，输入文本，生成并下载音频。
        </p>
      </div>

      <TtsForm
        voices={voiceRows.map(toVoiceView)}
        initialHistory={historyRows.map((row) =>
          toGenerationView(row.generation, row.voiceTitle),
        )}
      />
    </div>
  );
}
