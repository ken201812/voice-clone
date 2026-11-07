import { desc } from "drizzle-orm";
import { VoicesClient } from "@/components/voices-client";
import { db } from "@/db";
import { voices } from "@/db/schema";
import { toVoiceView } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default function VoicesPage() {
  const rows = db
    .select()
    .from(voices)
    .orderBy(desc(voices.createdAt))
    .all();

  return <VoicesClient initialVoices={rows.map(toVoiceView)} />;
}
