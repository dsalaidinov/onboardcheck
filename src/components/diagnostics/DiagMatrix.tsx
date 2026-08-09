// src/components/diagnostics/DiagMatrix.tsx
import { useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';

import type { Project, Resource } from '../../types/config';
import type { DiagnosticResult, ProbeStatus } from '../../types/diagnostics';
import { Button } from '../common/Button';
import { ProbeRow } from './ProbeRow';
import { ActionModal } from './ActionModal';
import { useTranslation } from '../../i18n';

interface DiagMatrixProps {
  projects: Project[];
  onBack: () => void;
}

export function DiagMatrix({ projects, onBack }: DiagMatrixProps) {
  const { t } = useTranslation();

  const [results, setResults] = useState<Record<string, DiagnosticResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [activeResource, setActiveResource] = useState<Resource | null>(null);

  // Combine resources from all selected projects
  const allResources: Array<{ resource: Resource; projectName: string }> = projects.flatMap(
    (p) => p.resources.map((res) => ({ resource: res, projectName: p.name }))
  );

  const initChecking = useCallback(() => {
    const init: Record<string, DiagnosticResult> = {};
    allResources.forEach(({ resource }) => {
      init[resource.id] = {
        resource_id: resource.id,
        resource_name: resource.name,
        status: 'checking' as ProbeStatus,
        latency_ms: null,
        message: 'Running probe…',
      };
    });
    setResults(init);
  }, [allResources]);

  const runChecks = useCallback(async () => {
    setIsRunning(true);
    initChecking();

    const unlisten = await listen<DiagnosticResult>('probe-result', (event) => {
      const r = event.payload;
      setResults((prev) => ({ ...prev, [r.resource_id]: r }));
    });

    try {
      const projectIds = projects.map((p) => p.id);
      await invoke('run_diagnostics', { projectIds });
    } finally {
      unlisten();
      setIsRunning(false);
    }
  }, [projects, initChecking]);

  const okCount = Object.values(results).filter((r) => r.status === 'ok').length;
  const errorCount = Object.values(results).filter((r) => r.status === 'error').length;
  const totalChecked = Object.keys(results).length;

  const projectNames = projects.map((p) => p.name).join(', ');

  return (
    <section aria-labelledby="diag-heading">
      <div className="mb-6">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={onBack} id="diag-back-btn" className="mb-4" disabled={isRunning}>
          {t('diag', 'back')}
        </Button>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 id="diag-heading" className="text-2xl font-bold text-white mb-1">
              {t('diag', 'title')}
            </h1>
            <p className="text-surface-200 text-sm">
              {t('diag', 'project')}{' '}
              <span className="text-accent-300 font-medium">{projectNames}</span>
            </p>
          </div>

          {totalChecked > 0 && (
            <div className="flex items-center gap-2 text-xs">
              {okCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-ok/10 text-ok border border-ok/25 font-medium">
                  {okCount} {t('diag', 'reachable')}
                </span>
              )}
              {errorCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-error/10 text-error border border-error/25 font-medium">
                  {errorCount} {t('diag', 'failed')}
                </span>
              )}
            </div>
          )}

          <Button
            id="run-diag-btn"
            variant={isRunning ? 'secondary' : 'primary'}
            leftIcon={isRunning ? undefined : <RefreshCw size={14} />}
            loading={isRunning}
            disabled={isRunning}
            onClick={runChecks}
          >
            {isRunning ? t('diag', 'runningChecks') : t('diag', 'runChecks')}
          </Button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm" aria-label="Diagnostic results">
          <thead>
            <tr className="border-b border-surface-700 text-xs text-surface-200 uppercase tracking-wide">
              <th className="text-left px-4 py-3">{t('diag', 'tableResource')}</th>
              {projects.length > 1 && (
                <th className="text-left px-4 py-3">{t('diag', 'tableProject')}</th>
              )}
              <th className="text-left px-4 py-3">{t('diag', 'tableType')}</th>
              <th className="text-left px-4 py-3">{t('diag', 'tableTarget')}</th>
              <th className="text-left px-4 py-3">{t('diag', 'tableStatus')}</th>
              <th className="text-left px-4 py-3">{t('diag', 'tableLatency')}</th>
              <th className="text-left px-4 py-3">{t('diag', 'tableTeam')}</th>
              <th className="text-left px-4 py-3">{t('diag', 'tableInfo')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {allResources.map(({ resource, projectName }) => (
              <ProbeRow
                key={resource.id}
                resource={resource}
                projectName={projects.length > 1 ? projectName : undefined}
                result={results[resource.id] ?? null}
                onRequestAccess={setActiveResource}
              />
            ))}
          </tbody>
        </table>
      </div>

      {totalChecked === 0 && (
        <div className="text-center py-12 text-surface-200">
          <ShieldCheck size={32} className="mx-auto mb-3 text-surface-700" />
          <p className="text-sm">{t('diag', 'emptyState')}</p>
        </div>
      )}

      {activeResource && (
        <ActionModal
          resource={activeResource}
          onClose={() => setActiveResource(null)}
        />
      )}
    </section>
  );
}
