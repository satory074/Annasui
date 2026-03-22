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

interface UIStore {
  isEditMode: boolean;
  openModal: ModalId | null;
  modalData: Record<string, unknown>;

  toggleEditMode: () => void;
  setEditMode: (mode: boolean) => void;
  openModalWith: (id: ModalId, data?: Record<string, unknown>) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      isEditMode: false,
      openModal: null,
      modalData: {},

      toggleEditMode: () =>
        set((s) => ({ isEditMode: !s.isEditMode })),
      setEditMode: (mode) => set({ isEditMode: mode }),
      openModalWith: (id, data = {}) =>
        set({ openModal: id, modalData: data }),
      closeModal: () => set({ openModal: null, modalData: {} }),
    }),
    { name: "ui-store" }
  )
);
