// src/components/diagnostics/ProbeRow.tsx
import { clsx } from 'clsx';
import { Globe, Server, Wifi, ChevronRight } from 'lucide-react';
import type { Resource } from '../../types/config';
import type { DiagnosticResult, ProbeStatus } from '../../types/diagnostics';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { useTranslation } from '../../i18n';

const PROBE_ICONS: Record<string, React.ElementType> = {
  http_status: Globe,
  tcp_port:    Server,
  dns_resolve: Wifi,
};

function statusToBadge(status: ProbeStatus) {
  switch (status) {
    case 'ok':       return 'ok'      as const;
    case 'error':    return 'error'   as const;
    case 'warning':  return 'warning' as const;
    case 'checking': return 'checking'as const;
    default:         return 'pending' as const;
  }
}

interface ProbeRowProps {
  resource: Resource;
  projectName?: string;
  result: DiagnosticResult | null;
  onRequestAccess: (resource: Resource) => void;
}

export function ProbeRow({ resource, projectName, result, onRequestAccess }: ProbeRowProps) {
  const { t } = useTranslation();

  const Icon = PROBE_ICONS[resource.type] ?? Globe;
  const status: ProbeStatus = result?.status ?? 'pending';
  const canRequest = result?.status === 'error' || result?.status === 'warning';

  return (
    <tr className="border-b border-surface-700/40 last:border-0 hover:bg-surface-700/20 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-surface-200 shrink-0" />
          <span className="font-medium text-white text-sm">{resource.name}</span>
        </div>
      </td>

      {projectName && (
        <td className="px-4 py-3">
          <span className="text-xs px-2 py-0.5 bg-surface-800 text-surface-200 rounded font-medium border border-surface-700">
            {projectName}
          </span>
        </td>
      )}

      <td className="px-4 py-3">
        <span className="text-xs px-1.5 py-0.5 bg-surface-700/50 text-accent-300 rounded font-mono uppercase">
          {resource.type.replace('_', ' ')}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className="text-xs font-mono text-surface-200 truncate max-w-[200px] block">
          {resource.target}
        </span>
      </td>

      <td className="px-4 py-3">
        <Badge
          variant={statusToBadge(status)}
          label={t('status', status as unknown as any) || status}
          dot
        />
      </td>

      <td className="px-4 py-3 text-xs text-surface-200">
        {result?.latency_ms != null ? `${result.latency_ms} ms` : '—'}
      </td>

      <td className="px-4 py-3 text-xs text-surface-200">
        {resource.responsible_team}
      </td>

      <td className="px-4 py-3 text-xs text-surface-200 max-w-[180px]">
        <span className="line-clamp-2">{result?.message ?? '—'}</span>
      </td>

      <td className="px-4 py-3">
        <Button
          id={`request-access-${resource.id}`}
          variant={canRequest ? 'danger' : 'ghost'}
          size="sm"
          disabled={!canRequest}
          rightIcon={canRequest ? <ChevronRight size={12} /> : undefined}
          onClick={() => onRequestAccess(resource)}
          className={clsx(!canRequest && 'opacity-30')}
        >
          {t('diag', 'requestAccess')}
        </Button>
      </td>
    </tr>
  );
}
