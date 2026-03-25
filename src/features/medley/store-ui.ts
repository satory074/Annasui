"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type ModalId =
  | "songEdit"
  | "songSearch"
  | "manualAdd"
  | "login"
  | "restore"
  | "createMedley"
  | "importSetlist";

export type ViewMode = "list" | "timeline";

interface UIStore {
  isEditMode: boolean;
  viewMode: ViewMode;
  openModal: ModalId | null;
  modalData: Record<string, unknown>;

  toggleEditMode: () => void;
  setEditMode: (mode: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  openModalWith: (id: ModalId, data?: Record<string, unknown>) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      isEditMode: false,
      viewMode: "list" as ViewMode,
      openModal: null,
      modalData: {},

      toggleEditMode: () =>
        set((s) => ({ isEditMode: !s.isEditMode })),
      setEditMode: (mode) => set({ isEditMode: mode }),
      setViewMode: (mode) => set({ viewMode: mode }),
      openModalWith: (id, data = {}) =>
        set({ openModal: id, modalData: data }),
      closeModal: () => set({ openModal: null, modalData: {} }),
    }),
    { name: "ui-store" }
  )
);
