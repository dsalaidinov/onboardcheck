// src/components/common/Spinner.tsx

import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export function Spinner({ size = 20, className, label = 'Loading...' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={clsx('flex items-center gap-2 text-surface-200', className)}
    >
      <Loader2 className="animate-spin text-accent-400" size={size} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
