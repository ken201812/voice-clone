"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Mic2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AUDIO_FORMATS,
  RECENT_GENERATIONS_LIMIT,
  TTS_MODELS,
} from "@/lib/fish/constants";
import type { GenerationView, VoiceView } from "@/lib/serialize";
import { formatShortDateTime } from "@/lib/format";
import {
  TTS_SPEED_MAX,
  TTS_SPEED_MIN,
  TTS_TEXT_MAX,
} from "@/lib/validation";

export function TtsForm({
  voices,
  initialHistory,
}: {
  voices: VoiceView[];
  initialHistory: GenerationView[];
}) {
  const trainedVoices = useMemo(
    () => voices.filter((voice) => voice.state === "trained"),
    [voices],
  );

  const [text, setText] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState(
    trainedVoices[0]?.id ?? "",
  );
  // Derive a valid id instead of syncing state in an effect: if the selected
  // voice is deleted or stops being trained, fall back to the first one.
  const voiceId = trainedVoices.some((voice) => voice.id === selectedVoiceId)
    ? selectedVoiceId
    : (trainedVoices[0]?.id ?? "");
  const [model, setModel] = useState<string>(TTS_MODELS[0].value);
  const [format, setFormat] = useState<string>(AUDIO_FORMATS[0].value);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  // Start empty: seeding this from initialHistory made the page auto-play the
  // last generated audio on every load.
  const [result, setResult] = useState<GenerationView | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [history, setHistory] = useState<GenerationView[]>(initialHistory);

  const voiceItems = useMemo(
    () =>
      trainedVoices.map((voice) => ({
        value: voice.id,
        label:
          voice.title +
          (voice.languages.length > 0 ? ` · ${voice.languages.join("/")}` : ""),
      })),
    [trainedVoices],
  );

  const modelItems = TTS_MODELS.map((item) => ({
    value: item.value,
    label: item.label,
  }));
  const formatItems = AUDIO_FORMATS.map((item) => ({
    value: item.value,
    label: item.label,
  }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!voiceId) {
      toast.error("请先选择一个可用的声音");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("请输入要合成的文本");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          voiceId,
          model,
          format,
          speed,
        }),
      });
      const data = (await res.json()) as {
        generation?: GenerationView;
        error?: string;
        detail?: string;
      };

      if (!res.ok || !data.generation) {
        throw new Error(data.error || "生成失败");
      }

      setResult(data.generation);
      setAutoPlay(true);
      setHistory((previous) =>
        [data.generation!, ...previous].slice(0, RECENT_GENERATIONS_LIMIT),
      );
      toast.success("生成成功");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  if (trainedVoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic2 className="size-4" />
            还没有可用的声音
          </CardTitle>
          <CardDescription>
            请先到声音库创建一个克隆声音，训练完成后即可在这里使用。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/voices" />}>前往声音库</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" />
            生成语音
          </CardTitle>
          <CardDescription>
            选择声音、输入文本，使用 Fish Audio 合成音频。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>声音</Label>
              <Select
                items={voiceItems}
                value={voiceId}
                onValueChange={(value) =>
                  setSelectedVoiceId(String(value ?? ""))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择一个声音" />
                </SelectTrigger>
                <SelectContent>
                  {voiceItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tts-text">文本</Label>
                <span className="text-xs text-muted-foreground">
                  {text.length} / {TTS_TEXT_MAX}
                </span>
              </div>
              <Textarea
                id="tts-text"
                value={text}
                maxLength={TTS_TEXT_MAX}
                rows={8}
                placeholder="输入要合成的文本，例如：你好，欢迎使用声音克隆工具。"
                onChange={(event) => setText(event.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>模型</Label>
                <Select
                  items={modelItems}
                  value={model}
                  onValueChange={(value) => setModel(String(value ?? ""))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modelItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>输出格式</Label>
                <Select
                  items={formatItems}
                  value={format}
                  onValueChange={(value) => setFormat(String(value ?? ""))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formatItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>语速</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {speed.toFixed(1)}x
                </span>
              </div>
              <Slider
                value={[speed]}
                min={TTS_SPEED_MIN}
                max={TTS_SPEED_MAX}
                step={0.1}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  if (typeof next === "number") setSpeed(next);
                }}
              />
            </div>

            <Separator />

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {loading ? "生成中…" : "生成语音"}
            </Button>
          </form>

          {result && (
            <div className="mt-6 space-y-3 rounded-lg border bg-muted/40 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{result.voiceTitle ?? "未知声音"}</Badge>
                <span className="text-muted-foreground">
                  {result.format.toUpperCase()} · {result.speed.toFixed(1)}x
                </span>
              </div>
              <audio
                key={result.id}
                src={result.audioUrl}
                controls
                autoPlay={autoPlay}
                onPlay={() => setAutoPlay(false)}
                className="w-full"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">最近生成</CardTitle>
          <CardDescription>最多显示最近 12 条。</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有生成记录。</p>
          ) : (
            <ul className="space-y-4">
              {history.map((item) => (
                <li key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">
                      {item.voiceTitle ?? "已删除的声音"}
                    </span>
                    <span className="shrink-0" suppressHydrationWarning>
                      {formatShortDateTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm">{item.text}</p>
                  <audio
                    src={item.audioUrl}
                    controls
                    preload="none"
                    className="h-8 w-full"
                  />
                  <Separator />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
