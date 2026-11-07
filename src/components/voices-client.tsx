"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic2, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  VOICE_STATE_LABELS,
  VOICE_STATES_IN_PROGRESS,
} from "@/lib/fish/constants";
import { formatDateTime } from "@/lib/format";
import type { VoiceView } from "@/lib/serialize";
import { validateVoiceFiles } from "@/lib/validation";

function stateVariant(state: string) {
  if (state === "trained") return "default" as const;
  if (state === "failed") return "destructive" as const;
  return "secondary" as const;
}

export function VoicesClient({
  initialVoices,
}: {
  initialVoices: VoiceView[];
}) {
  const [voices, setVoices] = useState<VoiceView[]>(initialVoices);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [deleting, setDeleting] = useState<VoiceView | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendingKey = useMemo(
    () =>
      voices
        .filter((voice) => VOICE_STATES_IN_PROGRESS.has(voice.state))
        .map((voice) => voice.id)
        .join(","),
    [voices],
  );

  useEffect(() => {
    if (!pendingKey) return;

    const ids = pendingKey.split(",").filter(Boolean);
    const controller = new AbortController();
    let stopped = false;
    let inFlight = false;
    let consecutiveFailures = 0;

    type PollResult = {
      id: string;
      voice?: VoiceView;
      missing?: boolean;
      failed?: boolean;
    };

    async function pollOne(id: string): Promise<PollResult> {
      try {
        const res = await fetch(`/api/voices/${id}/status`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (res.status === 404) return { id, missing: true };
        if (!res.ok) return { id, failed: true };
        const data = (await res.json()) as { voice?: VoiceView };
        return { id, voice: data.voice };
      } catch {
        return { id, failed: !controller.signal.aborted };
      }
    }

    async function tick() {
      if (inFlight || stopped) return;
      inFlight = true;
      try {
        const results = await Promise.all(ids.map(pollOne));
        if (stopped) return;

        const updates = new Map<string, VoiceView>();
        const missing = new Set<string>();
        let failed = false;

        for (const result of results) {
          if (result.voice) updates.set(result.id, result.voice);
          if (result.missing) missing.add(result.id);
          if (result.failed) failed = true;
        }

        if (updates.size > 0) {
          setVoices((previous) =>
            previous.map((voice) => updates.get(voice.id) ?? voice),
          );
        }

        if (missing.size > 0) {
          setVoices((previous) =>
            previous.map((voice) =>
              missing.has(voice.id) ? { ...voice, state: "failed" } : voice,
            ),
          );
          toast.error("有声音已在 Fish Audio 上不存在，已停止刷新");
        }

        consecutiveFailures = failed ? consecutiveFailures + 1 : 0;
        if (consecutiveFailures >= 6) {
          stopped = true;
          window.clearInterval(timer);
          toast.error("训练状态刷新失败，请手动刷新");
        }
      } finally {
        inFlight = false;
      }
    }

    const timer = window.setInterval(tick, 5000);
    void tick();

    return () => {
      stopped = true;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [pendingKey]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length === 0) {
      setFiles([]);
      return;
    }

    const check = validateVoiceFiles(picked);
    if (!check.ok) {
      toast.error(check.error);
      setFiles([]);
      event.target.value = "";
      return;
    }

    setFiles(picked);
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      toast.error("请填写声音名称");
      return;
    }
    if (files.length === 0) {
      toast.error("请选择至少一个音频文件");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.set("title", title.trim());
      if (description.trim()) form.set("description", description.trim());
      for (const file of files) form.append("voices", file);

      const res = await fetch("/api/voices", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { voice?: VoiceView; error?: string };

      if (!res.ok || !data.voice) {
        throw new Error(data.error || "创建失败");
      }

      setVoices((previous) => [data.voice!, ...previous]);
      toast.success("声音已提交，通常几秒内完成训练");
      setUploadOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    } finally {
      setUploading(false);
    }
  }

  async function refreshVoice(voice: VoiceView) {
    setBusyId(voice.id);
    try {
      const res = await fetch(`/api/voices/${voice.id}/status`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { voice?: VoiceView; error?: string };
      if (!res.ok || !data.voice) {
        throw new Error(data.error || "刷新失败");
      }
      setVoices((previous) =>
        previous.map((item) => (item.id === voice.id ? data.voice! : item)),
      );
      toast.success("状态已刷新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刷新失败");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;

    setDeletingBusy(true);
    try {
      const res = await fetch(`/api/voices/${target.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "删除失败");

      setVoices((previous) =>
        previous.filter((voice) => voice.id !== target.id),
      );
      toast.success("声音已删除");
      setDeleting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">声音库</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            上传 10–30 秒清晰单人音频，创建可复用的克隆声音。
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          创建声音
        </Button>
      </div>

      {voices.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mic2 className="size-4" />
              还没有声音
            </CardTitle>
            <CardDescription>
              支持 wav / mp3 / m4a / opus，单个文件最大 25MB，一次最多 20 个。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setUploadOpen(true)}>
              <Upload className="mr-1.5 size-4" />
              上传第一个声音
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {voices.map((voice) => (
            <Card key={voice.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      {voice.title}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {voice.description || "无描述"}
                    </CardDescription>
                  </div>
                  <Badge variant={stateVariant(voice.state)}>
                    {VOICE_STATE_LABELS[voice.state] ?? voice.state}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span suppressHydrationWarning>
                    创建于 {formatDateTime(voice.createdAt)}
                  </span>
                  {voice.languages.length > 0 && (
                    <span>语言：{voice.languages.join(" / ")}</span>
                  )}
                </div>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {voice.fishModelId}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === voice.id}
                    onClick={() => refreshVoice(voice)}
                  >
                    {busyId === voice.id ? (
                      <Loader2 className="mr-1 size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 size-3.5" />
                    )}
                    刷新状态
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleting(voice)}
                  >
                    <Trash2 className="mr-1 size-3.5" />
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建克隆声音</DialogTitle>
            <DialogDescription>
              音频会上传到 Fish Audio 进行训练。请只克隆你有权使用的声音。
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleUpload}>
            <div className="space-y-2">
              <Label htmlFor="voice-title">名称</Label>
              <Input
                id="voice-title"
                value={title}
                maxLength={100}
                placeholder="例如：我的声音"
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice-desc">描述（可选）</Label>
              <Textarea
                id="voice-desc"
                value={description}
                maxLength={500}
                rows={2}
                placeholder="例如：录音室样本，男声"
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice-files">音频文件</Label>
              <Input
                id="voice-files"
                ref={fileInputRef}
                type="file"
                multiple
                accept=".wav,.mp3,.m4a,.opus"
                onChange={handleFilesSelected}
              />
              <p className="text-xs text-muted-foreground">
                建议 10–30 秒、单人、无背景音乐；留空转写将由 Fish 自动识别。
              </p>
              {files.length > 0 && (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {files.map((file) => (
                    <li key={file.name} className="truncate">
                      {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => setUploadOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading && <Loader2 className="mr-1 size-4 animate-spin" />}
                {uploading ? "提交中…" : "开始克隆"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除声音？</AlertDialogTitle>
            <AlertDialogDescription>
              将同时删除 Fish Audio 上的模型和本地记录。使用该声音的历史生成记录会保留，但无法再用它生成新音频。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingBusy}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deletingBusy && <Loader2 className="mr-1 size-4 animate-spin" />}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
