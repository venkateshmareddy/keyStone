"use client";

import { CategorySidebar } from "@/components/dashboard/category-sidebar";
import { NoteEditorPanel } from "@/components/dashboard/note-editor";
import { NoteListPanel } from "@/components/dashboard/note-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useNetworkStatus } from "@/hooks/use-network-status";
import {
  incrementCategoryNotes,
  mergeNoteListItems,
  putNoteDetailCache,
  purgeNotesForCategory,
  readCategoriesCache,
  readNoteDetailCache,
  readNotesCache,
  removeCategoryCache,
  replaceCategoriesCache,
  replaceNoteListForCategory,
  upsertCategoryCache,
} from "@/lib/offline/cache";
import { enqueueOutbox, outboxLength } from "@/lib/offline/outbox";
import { drainOutbox } from "@/lib/offline/sync";
import { useDashboardStore } from "@/stores/dashboard-store";
import type { CategoryDTO, NoteDetail, NoteListItem, NoteType } from "@/types";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { KeyRound, LogOut, Terminal, FileText, Paperclip, WifiOff } from "lucide-react";
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
  const online = useNetworkStatus();
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

  const userId = session?.user?.id;

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const uid = session!.user!.id;
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("categories");
        const data = (await res.json()) as CategoryDTO[];
        await replaceCategoriesCache(uid, data);
        return data;
      } catch {
        if (!navigator.onLine) {
          const cached = await readCategoriesCache(uid);
          if (cached.length) return cached;
        }
        throw new Error("categories");
      }
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (!online || !userId) return;
    let cancelled = false;
    void (async () => {
      if ((await outboxLength(userId)) === 0) return;
      await drainOutbox(userId);
      if (!cancelled) await qc.invalidateQueries();
    })();
    return () => {
      cancelled = true;
    };
  }, [online, userId, qc]);

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
      const uid = session!.user!.id;
      const cat = selectedCategoryId!;
      const sp = new URLSearchParams();
      sp.set("categoryId", cat);
      if (debouncedSearch.trim()) sp.set("q", debouncedSearch.trim());
      try {
        const res = await fetch(`/api/notes?${sp.toString()}`);
        if (!res.ok) throw new Error("notes");
        const data = (await res.json()) as NoteListItem[];
        await replaceNoteListForCategory(uid, cat, data);
        return data;
      } catch {
        if (!navigator.onLine) {
          return readNotesCache(uid, cat, debouncedSearch);
        }
        throw new Error("notes");
      }
    },
    enabled: !!userId && !!selectedCategoryId,
    placeholderData: keepPreviousData,
  });

  const noteQuery = useQuery({
    queryKey: ["note", selectedNoteId],
    queryFn: async () => {
      const uid = session!.user!.id;
      const id = selectedNoteId!;
      try {
        const res = await fetch(`/api/notes/${id}`);
        if (!res.ok) throw new Error("note");
        const data = (await res.json()) as NoteDetail;
        await putNoteDetailCache(uid, data);
        return data;
      } catch {
        if (!navigator.onLine) {
          const cached = await readNoteDetailCache(uid, id);
          if (cached) return cached;
        }
        throw new Error("note");
      }
    },
    enabled: !!userId && !!selectedNoteId,
  });

  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const uid = session!.user!.id;
      if (!navigator.onLine) {
        const id = crypto.randomUUID();
        const cat: CategoryDTO = { id, name, _count: { notes: 0 } };
        await upsertCategoryCache(uid, cat);
        await enqueueOutbox(uid, "createCategory", { id, name });
        return cat;
      }
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("create category");
      const cat = (await res.json()) as CategoryDTO;
      await upsertCategoryCache(uid, cat);
      return cat;
    },
    onSuccess: (cat) => {
      qc.setQueryData(["categories"], (old: CategoryDTO[] | undefined = []) => {
        const next = [...old.filter((c) => c.id !== cat.id), cat];
        next.sort((a, b) => a.name.localeCompare(b.name));
        return next;
      });
    },
  });

  const renameCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const uid = session!.user!.id;
      if (!navigator.onLine) {
        const rows = await readCategoriesCache(uid);
        const prev = rows.find((c) => c.id === id);
        if (!prev) throw new Error("rename");
        const next = { ...prev, name };
        await upsertCategoryCache(uid, next);
        await enqueueOutbox(uid, "renameCategory", { id, name });
        return next;
      }
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("rename");
      const updated = (await res.json()) as CategoryDTO;
      await upsertCategoryCache(uid, updated);
      return updated;
    },
    onSuccess: (cat) => {
      qc.setQueryData(["categories"], (old: CategoryDTO[] | undefined = []) => {
        const next = old.map((c) => (c.id === cat.id ? cat : c));
        next.sort((a, b) => a.name.localeCompare(b.name));
        return next;
      });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const uid = session!.user!.id;
      if (!navigator.onLine) {
        await purgeNotesForCategory(uid, id);
        await removeCategoryCache(uid, id);
        await enqueueOutbox(uid, "deleteCategory", { id });
        return id;
      }
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
      await purgeNotesForCategory(uid, id);
      await removeCategoryCache(uid, id);
      return id;
    },
    onSuccess: (id) => {
      qc.setQueryData(["categories"], (old: CategoryDTO[] | undefined) =>
        (old ?? []).filter((c) => c.id !== id),
      );
      qc.setQueriesData({ queryKey: ["notes"], exact: false }, (old) =>
        Array.isArray(old)
          ? (old as NoteListItem[]).filter((n) => n.categoryId !== id)
          : old,
      );
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null);
        setSelectedNoteId(null);
      }
      if (navigator.onLine) {
        qc.invalidateQueries({ queryKey: ["categories"] });
        qc.invalidateQueries({ queryKey: ["notes"] });
      }
    },
  });

  const createNote = useMutation({
    mutationFn: async (type: NoteType) => {
      if (!selectedCategoryId) throw new Error("no category");
      const uid = session!.user!.id;
      const sp =
        type === "SECRET"
          ? { secretPayload: { username: "", password: "", url: "", notes: "" } }
          : {};
      if (!navigator.onLine) {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const listItem: NoteListItem = {
          id,
          title: "Untitled",
          type,
          isFavorite: false,
          updatedAt: now,
          categoryId: selectedCategoryId,
          tags: [],
        };
        const detail: NoteDetail = {
          id,
          title: "Untitled",
          content: "",
          type,
          isFavorite: false,
          createdAt: now,
          updatedAt: now,
          categoryId: selectedCategoryId,
          tags: [],
          files: [],
          ...(type === "SECRET"
            ? {
                secretPayload: {
                  username: "",
                  password: "",
                  url: "",
                  notes: "",
                },
              }
            : {}),
        };
        await mergeNoteListItems(uid, [listItem]);
        await putNoteDetailCache(uid, detail);
        await incrementCategoryNotes(uid, selectedCategoryId, 1);
        await enqueueOutbox(uid, "createNote", {
          id,
          title: "Untitled",
          content: "",
          type,
          categoryId: selectedCategoryId,
          ...(type === "SECRET" ? sp : {}),
        });
        return { listItem, detail };
      }
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled",
          content: "",
          type,
          categoryId: selectedCategoryId,
          ...sp,
        }),
      });
      if (!res.ok) throw new Error("create note");
      const listItem = (await res.json()) as NoteListItem;
      await mergeNoteListItems(uid, [listItem]);
      return { listItem, detail: null as NoteDetail | null };
    },
    onSuccess: (result) => {
      const { listItem, detail } = result;
      if (detail) {
        qc.setQueryData(["note", listItem.id], detail);
        qc.setQueriesData({ queryKey: ["notes"], exact: false }, (old) => {
          if (!Array.isArray(old)) return old;
          const rows = old as NoteListItem[];
          if (rows.length && rows[0].categoryId !== listItem.categoryId)
            return old;
          return [listItem, ...rows.filter((n) => n.id !== listItem.id)];
        });
        qc.setQueryData(
          ["categories"],
          (old: CategoryDTO[] | undefined = []) =>
            old.map((c) =>
              c.id === listItem.categoryId
                ? {
                    ...c,
                    _count: { notes: (c._count?.notes ?? 0) + 1 },
                  }
                : c,
            ),
        );
      } else {
        qc.invalidateQueries({ queryKey: ["notes"] });
        qc.invalidateQueries({ queryKey: ["categories"] });
      }
      setSelectedNoteId(listItem.id);
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
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
            signed in as{" "}
            <span className="font-medium text-zinc-200">
              {session?.user?.email}
            </span>
            {!online ? (
              <span className="flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200/90">
                <WifiOff className="size-3.5" />
                Offline — notes saved on this device; syncs when you reconnect
              </span>
            ) : null}
            <span className="text-zinc-600">
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
