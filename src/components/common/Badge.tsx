// src/components/common/Badge.tsx
// Single-responsibility: renders a status/label badge.

import { clsx } from 'clsx';

export type BadgeVariant = 'ok' | 'error' | 'warning' | 'pending' | 'checking' | 'info' | 'dry-run';

const variantClasses: Record<BadgeVariant, string> = {
  ok:       'bg-ok/10 text-ok border-ok/25',
  error:    'bg-error/10 text-error border-error/25',
  warning:  'bg-warning/10 text-warning border-warning/25',
  pending:  'bg-surface-700 text-surface-200 border-surface-700',
  checking: 'bg-accent-500/10 text-accent-400 border-accent-500/25',
  info:     'bg-accent-600/10 text-accent-300 border-accent-500/25',
  'dry-run':'bg-warning/10 text-warning border-warning/30',
};

interface BadgeProps {
  variant?: BadgeVariant;
  label: string;
  dot?: boolean;
  className?: string;
}

export function Badge({ variant = 'info', label, dot = false, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5',
        'text-xs font-medium rounded-full border',
        variantClasses[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            variant === 'ok'       && 'bg-ok',
            variant === 'error'    && 'bg-error',
            variant === 'warning'  && 'bg-warning',
            variant === 'pending'  && 'bg-pending',
            variant === 'checking' && 'bg-accent-400 animate-pulse',
          )}
        />
      )}
      {label}
    </span>
  );
}
