// src/store/diagnosticsStore.ts
// Zustand store for probe results — allows any component to read diagnostic state.

import { create } from 'zustand';
import type { DiagnosticResult } from '../types/diagnostics';

interface DiagnosticsState {
  results: Record<string, DiagnosticResult>;
  isRunning: boolean;
  setResult: (result: DiagnosticResult) => void;
  setIsRunning: (running: boolean) => void;
  reset: () => void;
}

export const useDiagnosticsStore = create<DiagnosticsState>((set) => ({
  results: {},
  isRunning: false,

  setResult: (result) =>
    set((state) => ({
      results: { ...state.results, [result.resource_id]: result },
    })),

  setIsRunning: (running) => set({ isRunning: running }),

  reset: () => set({ results: {}, isRunning: false }),
}));
