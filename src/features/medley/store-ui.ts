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

export type VideoDisplayMode = "normal" | "collapsed" | "pip";

interface UIStore {
  isEditMode: boolean;
  openModal: ModalId | null;
  modalData: Record<string, unknown>;
  videoDisplayMode: VideoDisplayMode;

  toggleEditMode: () => void;
  setEditMode: (mode: boolean) => void;
  openModalWith: (id: ModalId, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  setVideoDisplayMode: (mode: VideoDisplayMode) => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      isEditMode: false,
      openModal: null,
      modalData: {},
      videoDisplayMode: "normal",

      toggleEditMode: () =>
        set((s) => ({ isEditMode: !s.isEditMode })),
      setEditMode: (mode) => set({ isEditMode: mode }),
      openModalWith: (id, data = {}) =>
        set({ openModal: id, modalData: data }),
      closeModal: () => set({ openModal: null, modalData: {} }),
      setVideoDisplayMode: (mode) => set({ videoDisplayMode: mode }),
    }),
    { name: "ui-store" }
  )
);
