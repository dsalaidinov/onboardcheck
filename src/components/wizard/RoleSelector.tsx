// src/components/wizard/RoleSelector.tsx
import {
  Code2,
  Container,
  TestTube2,
  Database,
  Shield,
  BarChart3,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Role } from '../../types/config';
import { useTranslation } from '../../i18n';

const ROLE_ICON_MAP: Record<string, React.ElementType> = {
  java_dev:    Code2,
  devops_eng:  Container,
  qa_eng:      TestTube2,
  dba:         Database,
  security:    Shield,
  analyst:     BarChart3,
};

function getRoleIcon(roleId: string): React.ElementType {
  return ROLE_ICON_MAP[roleId] ?? UserCheck;
}

const CARD_GRADIENTS = [
  'from-accent-600/20 to-accent-500/5',
  'from-emerald-600/20 to-emerald-500/5',
  'from-violet-600/20 to-violet-500/5',
  'from-cyan-600/20 to-cyan-500/5',
  'from-rose-600/20 to-rose-500/5',
  'from-amber-600/20 to-amber-500/5',
];

interface RoleSelectorProps {
  roles: Role[];
  onSelect: (role: Role) => void;
}

export function RoleSelector({ roles, onSelect }: RoleSelectorProps) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="role-heading">
      <div className="mb-8 text-center">
        <h1 id="role-heading" className="text-3xl font-bold text-white mb-2">
          {t('role', 'title')}
          <span className="gradient-text">{t('role', 'titleAccent')}</span>
        </h1>
        <p className="text-surface-200 text-sm max-w-md mx-auto">
          {t('role', 'description')}
        </p>
      </div>

      <ul
        role="list"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        aria-label="Available roles"
      >
        {roles.map((role, idx) => {
          const Icon = getRoleIcon(role.id);
          const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];

          return (
            <li key={role.id}>
              <button
                id={`role-card-${role.id}`}
                onClick={() => onSelect(role)}
                className={clsx(
                  'group w-full text-left card-hover p-5',
                  'flex flex-col gap-4 animate-fade-in',
                  'bg-gradient-to-br', gradient,
                )}
                style={{ animationDelay: `${idx * 60}ms` }}
                aria-label={`Select role: ${role.name}`}
              >
                <div className="w-10 h-10 rounded-lg bg-surface-700/60 flex items-center justify-center group-hover:bg-accent-600/20 transition-colors duration-200">
                  <Icon size={20} className="text-accent-300 group-hover:text-accent-200 transition-colors" />
                </div>

                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-white mb-1">{role.name}</h2>
                  <p className="text-xs text-surface-200">
                    {role.packages.length} {t('role', 'requiredPackages')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {role.packages.slice(0, 4).map((pkg) => (
                    <span
                      key={pkg}
                      className="text-xs px-2 py-0.5 bg-surface-700/60 text-surface-100 rounded-full"
                    >
                      {pkg}
                    </span>
                  ))}
                  {role.packages.length > 4 && (
                    <span className="text-xs px-2 py-0.5 bg-surface-700/60 text-surface-200 rounded-full">
                      +{role.packages.length - 4}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-accent-400 font-medium group-hover:text-accent-300 transition-colors">
                    {t('role', 'selectRole')}
                  </span>
                  <ChevronRight size={14} className="text-accent-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
