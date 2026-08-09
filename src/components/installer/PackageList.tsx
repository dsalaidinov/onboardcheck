// src/components/installer/PackageList.tsx
import { useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { Package, ArrowLeft, Play, CheckCircle2, AlertCircle } from 'lucide-react';

import type { Role, PackageDef, AppConfig } from '../../types/config';
import type { DownloadProgress, PackageStatus, InstallResult } from '../../types/installer';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { DownloadProgressBar } from './DownloadProgress';
import { useTranslation } from '../../i18n';

interface PackageState {
  id: string;
  def: PackageDef;
  status: PackageStatus;
  progress: DownloadProgress | null;
  message: string;
}

function badgeVariant(status: PackageStatus) {
  switch (status) {
    case 'done':      return 'ok'      as const;
    case 'error':     return 'error'   as const;
    case 'dry_run':   return 'warning' as const;
    case 'queued':    return 'pending' as const;
    default:          return 'checking'as const;
  }
}

interface PackageListProps {
  role: Role;
  config: AppConfig;
  isDryRun: boolean;
  onBack: () => void;
  onContinue: () => void;
}

export function PackageList({ role, config, isDryRun, onBack, onContinue }: PackageListProps) {
  const { t } = useTranslation();

  const packages: PackageState[] = role.packages
    .map((id) => ({ id, def: config.packages[id] }))
    .filter((p): p is { id: string; def: PackageDef } => p.def !== undefined)
    .map(({ id, def }) => ({ id, def, status: 'queued' as PackageStatus, progress: null, message: '' }));

  const [pkgStates, setPkgStates] = useState<PackageState[]>(packages);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const updatePkg = useCallback(
    (packageId: string, updates: Partial<PackageState>) => {
      setPkgStates((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, ...updates } : p)),
      );
    },
    [],
  );

  const startInstall = useCallback(async () => {
    setIsRunning(true);

    const unlistenDownload = await listen<DownloadProgress>('download-progress', (event) => {
      const d = event.payload;
      updatePkg(d.package_id, { progress: d, status: 'downloading' });
    });

    const unlistenStatus = await listen<{ package_id: string; status: string; message: string }>(
      'install-status',
      (event) => {
        const { package_id, status, message } = event.payload;
        updatePkg(package_id, { status: status as PackageStatus, message });
      },
    );

    try {
      await invoke<InstallResult[]>('install_packages', {
        packageIds: role.packages,
      });
    } finally {
      unlistenDownload();
      unlistenStatus();
      setIsRunning(false);
      setIsDone(true);
    }
  }, [role.packages, updatePkg]);

  return (
    <section aria-labelledby="install-heading">
      <div className="mb-6">
        <Button
          variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />}
          onClick={onBack} id="install-back-btn" className="mb-4"
          disabled={isRunning}
        >
          {t('install', 'back')}
        </Button>
        <h1 id="install-heading" className="text-2xl font-bold text-white mb-1">
          {t('install', 'title')}
        </h1>
        <p className="text-surface-200 text-sm">
          {t('install', 'description')}{' '}
          <span className="text-accent-300 font-medium">{role.name}</span>
          {isDryRun && (
            <span className="ml-2 dry-run-badge">{t('app', 'dryRun')}</span>
          )}
        </p>
      </div>

      <div className="card overflow-hidden mb-6">
        <table className="w-full text-sm hidden sm:table" aria-label="Package installation status">
          <thead>
            <tr className="border-b border-surface-700 text-xs text-surface-200 uppercase tracking-wide">
              <th className="text-left px-4 py-3 w-1/3">{t('install', 'tablePackage')}</th>
              <th className="text-left px-4 py-3 w-1/6">{t('install', 'tableType')}</th>
              <th className="text-left px-4 py-3">{t('install', 'tableProgress')}</th>
              <th className="text-left px-4 py-3 w-24">{t('install', 'tableStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {pkgStates.map(({ id, def, status, progress, message }) => (
              <tr key={id} className="border-b border-surface-700/40 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Package size={14} className="text-accent-400 shrink-0" />
                    <div>
                      <p className="font-medium text-white">{def.title}</p>
                      <p className="text-xs text-surface-200 font-mono">{id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 bg-surface-700/50 text-accent-300 rounded font-mono uppercase">
                    {def.type}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <DownloadProgressBar
                    packageId={id}
                    title={def.title}
                    status={status}
                    progress={progress}
                    message={message}
                  />
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={badgeVariant(status)}
                    label={status === 'dry_run' ? 'Dry-Run' : status}
                    dot
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {!isDone && (
          <Button
            id="start-install-btn"
            onClick={startInstall}
            loading={isRunning}
            disabled={isRunning}
            leftIcon={<Play size={14} />}
          >
            {isDryRun ? t('install', 'simulateInstall') : t('install', 'beginInstall')}
          </Button>
        )}
        {isDone && (
          <>
            <div className="flex items-center gap-2 text-ok text-sm font-medium">
              <CheckCircle2 size={16} />
              {t('install', 'installComplete')}
            </div>
            <Button id="continue-to-diag-btn" onClick={onContinue} size="sm">
              {t('install', 'continueToDiag')}
            </Button>
          </>
        )}
        {!isRunning && !isDone && (
          <p className="text-xs text-surface-200">
            {pkgStates.length} {t('install', 'packagesQueued')}
          </p>
        )}
        {pkgStates.some((p) => p.status === 'error') && isDone && (
          <div className="flex items-center gap-1.5 text-error text-xs">
            <AlertCircle size={13} />
            {t('install', 'someFailed')}
          </div>
        )}
      </div>
    </section>
  );
}
