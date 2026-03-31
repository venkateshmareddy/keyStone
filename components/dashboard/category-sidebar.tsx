"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/dashboard-store";
import type { CategoryDTO } from "@/types";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";

type Props = {
  categories: CategoryDTO[];
  onCreate: (name: string) => Promise<unknown>;
  onRename: (id: string, name: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
};

export function CategorySidebar({
  categories,
  onCreate,
  onRename,
  onDelete,
}: Props) {
  const {
    sidebarCollapsed,
    toggleSidebar,
    selectedCategoryId,
    setSelectedCategoryId,
  } = useDashboardStore();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function submitNew() {
    const n = newName.trim();
    if (!n) return;
    await onCreate(n);
    setNewName("");
    setAdding(false);
  }

  async function submitRename() {
    if (!renameId) return;
    const n = renameValue.trim();
    if (!n) return;
    await onRename(renameId, n);
    setRenameId(null);
  }

  if (sidebarCollapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/40">
        <Button
          variant="ghost"
          size="icon"
          className="m-1"
          onClick={toggleSidebar}
          aria-label="Expand sidebar"
        >
          <ChevronRight className="size-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/40 transition-[width] duration-200">
      <div className="flex h-12 items-center justify-between gap-2 border-b border-zinc-800 px-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <BookOpen className="size-4 shrink-0 text-emerald-500" />
          <span className="truncate text-sm font-semibold tracking-tight">
            Notebooks
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={toggleSidebar}
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="size-4" />
        </Button>
      </div>
      <div className="p-2">
        {adding ? (
          <div className="flex gap-1">
            <Input
              autoFocus
              placeholder="Notebook name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitNew();
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewName("");
                }
              }}
            />
            <Button size="sm" onClick={() => void submitNew()}>
              Add
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            className="w-full justify-start gap-2"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-4" /> New notebook
          </Button>
        )}
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-1 py-2">
        <ul className="space-y-0.5">
          {categories.map((c) => (
            <li key={c.id}>
              <div
                className={cn(
                  "group flex items-center gap-1 rounded-md px-1 transition-colors",
                  selectedCategoryId === c.id
                    ? "bg-zinc-800"
                    : "hover:bg-zinc-800/60",
                )}
              >
                <button
                  type="button"
                  className="flex flex-1 min-w-0 items-center gap-2 py-2 pl-2 pr-1 text-left text-sm"
                  onClick={() => setSelectedCategoryId(c.id)}
                >
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-zinc-500">
                    {c._count?.notes ?? 0}
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100"
                      aria-label="Notebook actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setRenameId(c.id);
                        setRenameValue(c.name);
                      }}
                    >
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-400 focus:text-red-300"
                      onClick={() => void onDelete(c.id)}
                    >
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {renameId === c.id ? (
                <div className="mt-1 flex gap-1 px-1 pb-2">
                  <Input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void submitRename();
                      if (e.key === "Escape") setRenameId(null);
                    }}
                  />
                  <Button size="sm" onClick={() => void submitRename()}>
                    Save
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </ScrollArea>
    </aside>
  );
}
