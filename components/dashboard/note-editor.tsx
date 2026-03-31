"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import type { SecretPayload } from "@/lib/validation";
import { useDashboardStore } from "@/stores/dashboard-store";
import type { NoteType } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Save, Star, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

export type NoteDetail = {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
  tags: { id: string; name: string }[];
  files: { id: string; fileUrl: string }[];
  secretPayload?: SecretPayload;
};

type Props = {
  note: NoteDetail | null;
  categoryId: string | null;
};

async function resolveTagIds(names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) continue;
    const tag = (await res.json()) as { id: string };
    ids.push(tag.id);
  }
  return ids;
}

function serialize(
  note: NoteDetail,
  title: string,
  content: string,
  secret: SecretPayload,
  tagsText: string,
): string {
  const sortedTags = tagsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .sort();
  return JSON.stringify({
    title,
    content: note.type === "SECRET" ? "" : content,
    secret: note.type === "SECRET" ? secret : null,
    tags: sortedTags,
    type: note.type,
  });
}

export function NoteEditorPanel({ note, categoryId }: Props) {
  const { editorMode, setEditorMode, setSelectedNoteId } = useDashboardStore();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [secret, setSecret] = useState<SecretPayload>({});
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const skipSync = useRef(true);
  const lastSynced = useRef("");
  const hydratedId = useRef<string | null>(null);

  useEffect(() => {
    if (!note) {
      hydratedId.current = null;
      setTitle("");
      setContent("");
      setTagsText("");
      setSecret({});
      lastSynced.current = "";
      return;
    }
    if (hydratedId.current === note.id) {
      return;
    }
    hydratedId.current = note.id;
    skipSync.current = true;
    setTitle(note.title);
    setContent(note.content);
    setTagsText(note.tags.map((t) => t.name).join(", "));
    setSecret(note.secretPayload ?? {});
    lastSynced.current = serialize(
      note,
      note.title,
      note.content,
      note.secretPayload ?? {},
      note.tags.map((t) => t.name).join(", "),
    );
  }, [note]);

  const debouncedTitle = useDebounce(title, 700);
  const debouncedContent = useDebounce(content, 700);
  const debouncedSecret = useDebounce(secret, 700);
  const debouncedTagsText = useDebounce(tagsText, 900);

  const { mutate: saveNote } = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      if (!note) throw new Error("no note");
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("save failed");
      return res.json() as Promise<{ detail: NoteDetail }>;
    },
    onMutate: () => setSaveState("saving"),
    onSuccess: (data) => {
      setSaveState("saved");
      qc.setQueryData(["note", note?.id], data.detail);
      qc.invalidateQueries({ queryKey: ["notes"] });
      lastSynced.current = serialize(
        data.detail,
        data.detail.title,
        data.detail.content,
        data.detail.secretPayload ?? {},
        data.detail.tags.map((t) => t.name).join(", "),
      );
      window.setTimeout(() => setSaveState("idle"), 1000);
    },
    onError: () => {
      setSaveState("error");
      window.setTimeout(() => setSaveState("idle"), 2000);
    },
  });

  useEffect(() => {
    if (!note) return;
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }

    const next = serialize(
      note,
      debouncedTitle,
      debouncedContent,
      debouncedSecret,
      debouncedTagsText,
    );
    if (next === lastSynced.current) return;

    void (async () => {
      const tagIds = await resolveTagIds(debouncedTagsText.split(","));
      const body: Record<string, unknown> = {
        title: debouncedTitle,
        tagIds,
      };
      if (note.type === "SECRET") {
        body.secretPayload = debouncedSecret;
      } else {
        body.content = debouncedContent;
      }
      saveNote(body);
    })();
  }, [
    note,
    debouncedTitle,
    debouncedContent,
    debouncedSecret,
    debouncedTagsText,
    saveNote,
  ]);

  async function uploadFile(file: File) {
    if (!note || note.type !== "FILE") return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/notes/${note.id}/files`, {
      method: "POST",
      body: fd,
    });
    if (res.ok) qc.invalidateQueries({ queryKey: ["note", note.id] });
  }

  function toggleFavorite() {
    if (!note) return;
    saveNote({ isFavorite: !note.isFavorite });
  }

  async function deleteNote() {
    if (!note) return;
    if (
      !window.confirm(
        `Delete “${note.title}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedNoteId(null);
      qc.removeQueries({ queryKey: ["note", note.id] });
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    }
  }

  if (!note || !categoryId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-950 p-8 text-zinc-500">
        Select a note or create a new one.
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-zinc-950">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-800 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-transparent bg-transparent text-lg font-semibold focus-visible:ring-1"
            placeholder="Title"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {saveState === "saving" ? (
            <span className="flex items-center gap-1 text-amber-200/90">
              <Save className="size-3.5 animate-pulse" /> Saving…
            </span>
          ) : saveState === "saved" ? (
            <span className="text-emerald-400/90">Saved</span>
          ) : saveState === "error" ? (
            <span className="text-red-400">Save failed</span>
          ) : null}
          <Button variant="ghost" size="icon" aria-label="Favorite" onClick={toggleFavorite}>
            <Star
              className={
                note.isFavorite
                  ? "size-4 fill-amber-400 text-amber-400"
                  : "size-4 text-zinc-400"
              }
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-500 hover:text-red-400"
            aria-label="Delete note"
            onClick={() => void deleteNote()}
          >
            <Trash2 className="size-4" />
          </Button>
          {note.type !== "SECRET" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setEditorMode(editorMode === "edit" ? "preview" : "edit")
              }
            >
              {editorMode === "edit" ? (
                <>
                  <Eye className="size-4" /> Preview
                </>
              ) : (
                <>
                  <EyeOff className="size-4" /> Edit
                </>
              )}
            </Button>
          ) : null}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="tags" className="text-zinc-500">
            Tags
          </Label>
          <Input
            id="tags"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="comma separated"
            className="max-w-md"
          />
          <span className="text-xs text-zinc-600">
            {note.type === "NOTE"
              ? "Markdown supported"
              : note.type === "COMMAND"
                ? "Shell / CLI snippets"
                : note.type === "SECRET"
                  ? "Stored encrypted"
                  : "Attachments below"}
          </span>
        </div>
        <Separator />
        {note.type === "SECRET" ? (
          <div className="grid max-w-xl gap-3">
            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={secret.url ?? ""}
                onChange={(e) =>
                  setSecret((s) => ({ ...s, url: e.target.value }))
                }
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={secret.username ?? ""}
                onChange={(e) =>
                  setSecret((s) => ({ ...s, username: e.target.value }))
                }
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="password">Secret</Label>
              <Input
                id="password"
                type="password"
                value={secret.password ?? ""}
                onChange={(e) =>
                  setSecret((s) => ({ ...s, password: e.target.value }))
                }
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={secret.notes ?? ""}
                onChange={(e) =>
                  setSecret((s) => ({ ...s, notes: e.target.value }))
                }
                className="min-h-[100px]"
              />
            </div>
          </div>
        ) : note.type === "FILE" ? (
          <div className="space-y-3">
            <div>
              <Label>Description</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div>
              <Label>Upload</Label>
              <Input
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f);
                  e.target.value = "";
                }}
              />
            </div>
            <ul className="space-y-1 text-sm">
              {note.files.map((f) => (
                <li key={f.id}>
                  <a
                    className="text-emerald-400 hover:underline"
                    href={f.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {f.fileUrl}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : editorMode === "preview" ? (
          <article className="markdown-preview flex-1 overflow-auto rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <ReactMarkdown>{content || "_Nothing to preview_"}</ReactMarkdown>
          </article>
        ) : (
          <Textarea
            className="min-h-[400px] flex-1 font-mono text-sm leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write markdown…"
          />
        )}
      </div>
    </div>
  );
}
