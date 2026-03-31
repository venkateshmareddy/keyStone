"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/dashboard-store";
import type { NoteListItem } from "@/types";
import { FileText, KeyRound, Search, Star, Terminal } from "lucide-react";

const typeIcons = {
  NOTE: FileText,
  SECRET: KeyRound,
  COMMAND: Terminal,
  FILE: FileText,
} as const;

type Props = {
  notes: NoteListItem[];
  onNewNote: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
};

export function NoteListPanel({ notes, onNewNote, searchInputRef }: Props) {
  const { selectedNoteId, setSelectedNoteId, search, setSearch } =
    useDashboardStore();

  return (
    <div className="flex w-80 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/50">
      <div className="flex h-12 items-center justify-between gap-2 border-b border-zinc-800 px-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="pl-8"
          />
        </div>
        <Button size="sm" onClick={onNewNote}>
          New
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <ul className="p-1">
          {notes.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-zinc-500">
              No notes yet. Press ⌘N or New.
            </li>
          ) : (
            notes.map((n) => {
              const Icon = typeIcons[n.type];
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedNoteId(n.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
                      selectedNoteId === n.id
                        ? "bg-emerald-950/50 ring-1 ring-emerald-800/60"
                        : "hover:bg-zinc-900",
                    )}
                  >
      <Icon className="mt-0.5 size-4 shrink-0 text-zinc-400" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1">
                        {n.isFavorite ? (
                          <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                        ) : null}
                        <span className="truncate text-sm font-medium">
                          {n.title}
                        </span>
                      </span>
                      {n.tags.length ? (
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">
                          {n.tags.map((t) => t.name).join(" · ")}
                        </span>
                      ) : null}
                      <span className="mt-0.5 block text-[11px] text-zinc-600">
                        {new Date(n.updatedAt).toLocaleString()}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}
