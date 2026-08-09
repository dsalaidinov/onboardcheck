// src/store/configStore.ts
// Zustand store for app config, role & multi-project selection, and wizard step.

import { create } from 'zustand';
import type { AppConfig, Role, Project } from '../types/config';

export type WizardStep = 'role' | 'project' | 'install' | 'diagnostics';

interface ConfigState {
  config: AppConfig | null;
  configError: string | null;
  isLoading: boolean;

  step: WizardStep;

  selectedRole: Role | null;
  selectedProjects: Project[];

  setConfig: (config: AppConfig) => void;
  setConfigError: (error: string) => void;
  setLoading: (loading: boolean) => void;
  setStep: (step: WizardStep) => void;
  setSelectedRole: (role: Role) => void;
  toggleProject: (project: Project) => void;
  setSelectedProjects: (projects: Project[]) => void;
  reset: () => void;
}

const initialState = {
  config: null,
  configError: null,
  isLoading: true,
  step: 'role' as WizardStep,
  selectedRole: null,
  selectedProjects: [] as Project[],
};

export const useConfigStore = create<ConfigState>((set) => ({
  ...initialState,

  setConfig: (config) => set({ config, isLoading: false, configError: null }),
  setConfigError: (error) => set({ configError: error, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  setStep: (step) => set({ step }),
  setSelectedRole: (role) => set({ selectedRole: role, step: 'project' }),
  
  toggleProject: (project) =>
    set((state) => {
      const exists = state.selectedProjects.some((p) => p.id === project.id);
      const updated = exists
        ? state.selectedProjects.filter((p) => p.id !== project.id)
        : [...state.selectedProjects, project];
      return { selectedProjects: updated };
    }),

  setSelectedProjects: (projects) => set({ selectedProjects: projects }),
  reset: () => set(initialState),
}));
