// src/components/installer/DownloadProgress.tsx
// Shows live download progress for a single package, driven by Tauri events.

import { clsx } from 'clsx';
import type { DownloadProgress, PackageStatus } from '../../types/installer';

interface DownloadProgressProps {
  packageId: string;
  title: string;
  status: PackageStatus;
  progress: DownloadProgress | null;
  message?: string;
}

const STATUS_COLORS: Record<PackageStatus, string> = {
  queued:      'bg-surface-700',
  downloading: 'bg-accent-500',
  verifying:   'bg-warning',
  installing:  'bg-accent-400',
  done:        'bg-ok',
  error:       'bg-error',
  dry_run:     'bg-warning/70',
};

const STATUS_LABELS: Record<PackageStatus, string> = {
  queued:      'Queued',
  downloading: 'Downloading…',
  verifying:   'Verifying SHA-256…',
  installing:  'Installing…',
  done:        'Done',
  error:       'Error',
  dry_run:     'Dry-Run Complete',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatSpeed(bps: number): string {
  return `${formatBytes(bps)}/s`;
}

export function DownloadProgressBar({
  title,
  status,
  progress,
  message,
}: DownloadProgressProps) {
  const percent =
    progress && progress.total_bytes > 0
      ? Math.round((progress.bytes_downloaded / progress.total_bytes) * 100)
      : status === 'done' || status === 'dry_run'
      ? 100
      : 0;

  const barColor = STATUS_COLORS[status] ?? 'bg-surface-700';
  const isActive = status === 'downloading' || status === 'verifying' || status === 'installing';

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-white truncate">{title}</span>
        <span
          className={clsx(
            'shrink-0 ml-2',
            status === 'done' || status === 'dry_run' ? 'text-ok' : 'text-surface-200',
            status === 'error' && 'text-error',
          )}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-300',
            barColor,
            isActive && 'animate-pulse-slow',
          )}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Stats row */}
      {progress && status === 'downloading' && (
        <div className="flex items-center justify-between text-xs text-surface-200">
          <span>
            {formatBytes(progress.bytes_downloaded)}
            {progress.total_bytes > 0 && ` / ${formatBytes(progress.total_bytes)}`}
          </span>
          <span>{formatSpeed(progress.speed_bps)}</span>
        </div>
      )}

      {/* Error message */}
      {status === 'error' && message && (
        <p className="text-xs text-error font-mono bg-error/5 rounded p-1.5">{message}</p>
      )}
    </div>
  );
}
