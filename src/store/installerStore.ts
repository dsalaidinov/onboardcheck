// src/store/installerStore.ts
// Zustand store for installer state — complements event listeners in PackageList.

import { create } from 'zustand';
import type { PackageStatus, DownloadProgress, InstallResult } from '../types/installer';

export interface PackageEntry {
  id: string;
  status: PackageStatus;
  progress: DownloadProgress | null;
  message: string;
  result: InstallResult | null;
}

interface InstallerState {
  packages: Record<string, PackageEntry>;
  isRunning: boolean;
  setPackageStatus: (id: string, status: PackageStatus, message?: string) => void;
  setPackageProgress: (id: string, progress: DownloadProgress) => void;
  setPackageResult: (id: string, result: InstallResult) => void;
  setIsRunning: (running: boolean) => void;
  initPackages: (ids: string[]) => void;
  reset: () => void;
}

export const useInstallerStore = create<InstallerState>((set) => ({
  packages: {},
  isRunning: false,

  initPackages: (ids) =>
    set({
      packages: Object.fromEntries(
        ids.map((id) => [
          id,
          { id, status: 'queued', progress: null, message: '', result: null },
        ]),
      ),
    }),

  setPackageStatus: (id, status, message = '') =>
    set((state) => ({
      packages: {
        ...state.packages,
        [id]: { ...state.packages[id], status, message },
      },
    })),

  setPackageProgress: (id, progress) =>
    set((state) => ({
      packages: {
        ...state.packages,
        [id]: { ...state.packages[id], progress, status: 'downloading' },
      },
    })),

  setPackageResult: (id, result) =>
    set((state) => ({
      packages: {
        ...state.packages,
        [id]: {
          ...state.packages[id],
          result,
          status: result.status,
        },
      },
    })),

  setIsRunning: (running) => set({ isRunning: running }),

  reset: () => set({ packages: {}, isRunning: false }),
}));
