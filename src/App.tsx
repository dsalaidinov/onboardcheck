// src/App.tsx
import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { AppConfig } from './types/config';
import { useConfigStore } from './store/configStore';

// Layout
import { WizardLayout } from './components/wizard/WizardLayout';

// Steps
import { RoleSelector }     from './components/wizard/RoleSelector';
import { ProjectSelector }  from './components/wizard/ProjectSelector';
import { PackageList }      from './components/installer/PackageList';
import { DiagMatrix }       from './components/diagnostics/DiagMatrix';

// Common
import { Spinner } from './components/common/Spinner';

export default function App() {
  const {
    config,
    configError,
    isLoading,
    step,
    selectedRole,
    selectedProjects,
    setConfig,
    setConfigError,
    setSelectedRole,
    toggleProject,
    setStep,
  } = useConfigStore();

  useEffect(() => {
    invoke<AppConfig>('load_config')
      .then(setConfig)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setConfigError(message);
      });
  }, [setConfig, setConfigError]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Spinner size={28} label="Loading configuration..." />
      </div>
    );
  }

  if (configError || !config) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-8">
        <div className="card p-8 max-w-lg w-full text-center">
          <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">Configuration Error</h1>
          <p className="text-sm text-surface-200 font-mono bg-surface-900 rounded-lg p-3 text-left break-all">
            {configError ?? 'Unknown error loading config.json'}
          </p>
          <p className="text-xs text-surface-200 mt-4">
            Please check <code className="text-accent-300">config.json</code> and restart the application.
          </p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 'role':
        return (
          <RoleSelector
            roles={config.roles}
            onSelect={setSelectedRole}
          />
        );

      case 'project':
        return (
          <ProjectSelector
            projects={config.projects}
            selectedRoleName={selectedRole?.name ?? ''}
            selectedProjects={selectedProjects}
            onToggleProject={toggleProject}
            onContinue={() => setStep('install')}
            onBack={() => setStep('role')}
          />
        );

      case 'install':
        if (!selectedRole) { setStep('role'); return null; }
        return (
          <PackageList
            role={selectedRole}
            config={config}
            isDryRun={config.dry_run}
            onBack={() => setStep('project')}
            onContinue={() => setStep('diagnostics')}
          />
        );

      case 'diagnostics':
        if (selectedProjects.length === 0) { setStep('project'); return null; }
        return (
          <DiagMatrix
            projects={selectedProjects}
            onBack={() => setStep('install')}
          />
        );
    }
  };

  return (
    <div className="dark">
      <WizardLayout
        currentStep={step}
        companyName={config.company_name}
        isDryRun={config.dry_run}
      >
        {renderStep()}
      </WizardLayout>
    </div>
  );
}
