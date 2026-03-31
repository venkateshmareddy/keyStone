import { create } from "zustand";

type DashboardState = {
  sidebarCollapsed: boolean;
  search: string;
  selectedCategoryId: string | null;
  selectedNoteId: string | null;
  editorMode: "edit" | "preview";

  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  setSearch: (v: string) => void;
  setSelectedCategoryId: (id: string | null) => void;
  setSelectedNoteId: (id: string | null) => void;
  setEditorMode: (m: "edit" | "preview") => void;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  sidebarCollapsed: false,
  search: "",
  selectedCategoryId: null,
  selectedNoteId: null,
  editorMode: "edit",

  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSearch: (search) => set({ search }),
  setSelectedCategoryId: (selectedCategoryId) =>
    set({ selectedCategoryId, selectedNoteId: null }),
  setSelectedNoteId: (selectedNoteId) => set({ selectedNoteId }),
  setEditorMode: (editorMode) => set({ editorMode }),
}));
