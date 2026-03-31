"use client";

import { CategorySidebar } from "@/components/dashboard/category-sidebar";
import { NoteEditorPanel, type NoteDetail } from "@/components/dashboard/note-editor";
import { NoteListPanel } from "@/components/dashboard/note-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useDashboardStore } from "@/stores/dashboard-store";
import type { CategoryDTO, NoteListItem, NoteType } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { KeyRound, LogOut, Terminal, FileText, Paperclip } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const typeOptions: { type: NoteType; label: string; icon: typeof FileText }[] =
  [
    { type: "NOTE", label: "Note", icon: FileText },
    { type: "SECRET", label: "Secret", icon: KeyRound },
    { type: "COMMAND", label: "Command", icon: Terminal },
    { type: "FILE", label: "File", icon: Paperclip },
  ];

export function DashboardApp() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    selectedCategoryId,
    setSelectedCategoryId,
    selectedNoteId,
    setSelectedNoteId,
    search,
  } = useDashboardStore();

  const debouncedSearch = useDebounce(search, 350);
  const [newOpen, setNewOpen] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("categories");
      return res.json() as Promise<CategoryDTO[]>;
    },
  });

  useEffect(() => {
    const list = categoriesQuery.data;
    if (!list?.length) return;
    if (!selectedCategoryId || !list.some((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(list[0].id);
    }
  }, [categoriesQuery.data, selectedCategoryId, setSelectedCategoryId]);

  const notesQuery = useQuery({
    queryKey: ["notes", selectedCategoryId, debouncedSearch],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (selectedCategoryId) sp.set("categoryId", selectedCategoryId);
      if (debouncedSearch.trim()) sp.set("q", debouncedSearch.trim());
      const res = await fetch(`/api/notes?${sp.toString()}`);
      if (!res.ok) throw new Error("notes");
      return res.json() as Promise<NoteListItem[]>;
    },
    enabled: !!selectedCategoryId,
  });

  const noteQuery = useQuery({
    queryKey: ["note", selectedNoteId],
    queryFn: async () => {
      const res = await fetch(`/api/notes/${selectedNoteId}`);
      if (!res.ok) throw new Error("note");
      return res.json() as Promise<NoteDetail>;
    },
    enabled: !!selectedNoteId,
  });

  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("create category");
      return res.json() as Promise<CategoryDTO>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  const renameCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("rename");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["notes"] });
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null);
        setSelectedNoteId(null);
      }
    },
  });

  const createNote = useMutation({
    mutationFn: async (type: NoteType) => {
      if (!selectedCategoryId) throw new Error("no category");
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled",
          content: "",
          type,
          categoryId: selectedCategoryId,
          ...(type === "SECRET"
            ? { secretPayload: { username: "", password: "", url: "", notes: "" } }
            : {}),
        }),
      });
      if (!res.ok) throw new Error("create note");
      return res.json() as Promise<NoteListItem>;
    },
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      setSelectedNoteId(item.id);
      setNewOpen(false);
    },
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setNewOpen(true);
      }
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const categories = categoriesQuery.data ?? [];

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <CategorySidebar
        categories={categories}
        onCreate={(name) => createCategory.mutateAsync(name)}
        onRename={(id, name) =>
          renameCategory.mutateAsync({ id, name })
        }
        onDelete={(id) => deleteCategory.mutateAsync(id)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/30 px-4">
          <span className="text-sm text-zinc-400">
            signed in as{" "}
            <span className="font-medium text-zinc-200">
              {session?.user?.email}
            </span>
            <span className="ml-3 text-zinc-600">
              ⌘N new · ⌘K search
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-zinc-400"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </header>
        <div className="flex min-h-0 flex-1">
          <NoteListPanel
            notes={notesQuery.data ?? []}
            searchInputRef={searchInputRef}
            onNewNote={() => setNewOpen(true)}
          />
          <NoteEditorPanel
            note={noteQuery.data ?? null}
            categoryId={selectedCategoryId}
          />
        </div>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New note</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">Choose a note type.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {typeOptions.map(({ type, label, icon: Icon }) => (
              <Button
                key={type}
                variant="secondary"
                className="h-auto justify-start gap-3 py-3"
                disabled={!selectedCategoryId || createNote.isPending}
                onClick={() => createNote.mutate(type)}
              >
                <Icon className="size-5 text-emerald-400" />
                <span>{label}</span>
              </Button>
            ))}
          </div>
          {!selectedCategoryId ? (
            <p className="text-xs text-amber-400">
              Create a notebook first.
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
