// src/components/wizard/ProjectSelector.tsx
import {
  Globe,
  CreditCard,
  Building2,
  ArrowLeft,
  Network,
  Check,
  ArrowRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Project } from '../../types/config';
import { Button } from '../common/Button';
import { useTranslation } from '../../i18n';

const PROJECT_ICON_MAP: Record<string, React.ElementType> = {
  payment_service: CreditCard,
  core_banking:    Building2,
};

function getProjectIcon(projectId: string): React.ElementType {
  return PROJECT_ICON_MAP[projectId] ?? Globe;
}

const PROBE_TYPE_LABELS: Record<string, string> = {
  http_status: 'HTTP',
  tcp_port:    'TCP',
  dns_resolve: 'DNS',
};

interface ProjectSelectorProps {
  projects: Project[];
  selectedRoleName: string;
  selectedProjects: Project[];
  onToggleProject: (project: Project) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function ProjectSelector({
  projects,
  selectedRoleName,
  selectedProjects,
  onToggleProject,
  onContinue,
  onBack,
}: ProjectSelectorProps) {
  const { t } = useTranslation();

  const selectedIds = new Set(selectedProjects.map((p) => p.id));

  return (
    <section aria-labelledby="project-heading">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft size={14} />}
          onClick={onBack}
          id="project-back-btn"
          className="mb-4"
        >
          {t('project', 'back')}
        </Button>

        <div className="text-center">
          <h1 id="project-heading" className="text-3xl font-bold text-white mb-2">
            {t('project', 'title')}
            <span className="gradient-text">{t('project', 'titleAccent')}</span>
          </h1>
          <p className="text-surface-200 text-sm max-w-md mx-auto">
            {t('project', 'description')}{' '}
            <span className="text-accent-300 font-medium">{selectedRoleName}</span>.{' '}
            {t('project', 'descriptionSub')}
          </p>
        </div>
      </div>

      {/* Project checkable card grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {projects.map((project, idx) => {
          const Icon = getProjectIcon(project.id);
          const isSelected = selectedIds.has(project.id);

          return (
            <div
              key={project.id}
              onClick={() => onToggleProject(project)}
              className={clsx(
                'group text-left p-5 flex flex-col gap-4 rounded-xl border transition-all cursor-pointer select-none animate-fade-in',
                isSelected
                  ? 'bg-surface-800 border-accent-500 shadow-lg shadow-accent-500/10 ring-1 ring-accent-500'
                  : 'bg-surface-850/60 border-surface-700/80 hover:border-surface-600 hover:bg-surface-800/80',
              )}
              style={{ animationDelay: `${idx * 80}ms` }}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onToggleProject(project);
                }
              }}
            >
              {/* Header row with Checkbox */}
              <div className="flex items-start gap-3">
                <div className={clsx(
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0',
                  isSelected ? 'bg-accent-600/30 text-accent-300' : 'bg-surface-700/60 text-surface-200 group-hover:bg-surface-700'
                )}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white truncate">{project.name}</h2>
                    {/* Checkbox indicator */}
                    <div className={clsx(
                      'w-5 h-5 rounded flex items-center justify-center transition-all border shrink-0',
                      isSelected
                        ? 'bg-accent-600 border-accent-500 text-white'
                        : 'border-surface-600 bg-surface-900 group-hover:border-surface-500'
                    )}>
                      {isSelected && <Check size={13} strokeWidth={3} />}
                    </div>
                  </div>
                  <p className="text-xs text-surface-200 mt-0.5 line-clamp-2">
                    {project.description}
                  </p>
                </div>
              </div>

              {/* Resource list preview */}
              <div className="border-t border-surface-700/40 pt-3 space-y-2">
                <p className="text-xs text-surface-200 font-medium flex items-center gap-1.5">
                  <Network size={11} />
                  {project.resources.length} {t('project', 'resourcesToCheck')}
                </p>
                {project.resources.map((res) => (
                  <div key={res.id} className="flex items-center gap-2 text-xs text-surface-200">
                    <span className="px-1.5 py-0.5 bg-surface-700/50 text-accent-300 rounded font-mono text-[10px]">
                      {PROBE_TYPE_LABELS[res.type] ?? res.type}
                    </span>
                    <span className="truncate">{res.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Continue Action Bar */}
      <div className="flex items-center justify-between p-4 bg-surface-900 border border-surface-700 rounded-xl">
        <span className="text-xs text-surface-200 font-medium">
          {selectedProjects.length} {t('project', 'selectedCount')}
        </span>
        <Button
          id="project-continue-btn"
          disabled={selectedProjects.length === 0}
          rightIcon={<ArrowRight size={14} />}
          onClick={onContinue}
        >
          {t('project', 'continueBtn')}
        </Button>
      </div>
    </section>
  );
}
