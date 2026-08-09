// src/components/wizard/WizardLayout.tsx
import { clsx } from 'clsx';
import {
  UserCheck,
  FolderKanban,
  Download,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import type { WizardStep } from '../../store/configStore';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { useTranslation } from '../../i18n';

interface WizardLayoutProps {
  currentStep: WizardStep;
  children: React.ReactNode;
  companyName: string;
  isDryRun: boolean;
}

export function WizardLayout({
  currentStep,
  children,
  companyName,
  isDryRun,
}: WizardLayoutProps) {
  const { t } = useTranslation();

  const STEPS: Array<{ key: WizardStep; label: string; Icon: React.ElementType }> = [
    { key: 'role',        label: t('steps', 'role'),        Icon: UserCheck },
    { key: 'project',     label: t('steps', 'project'),     Icon: FolderKanban },
    { key: 'install',     label: t('steps', 'install'),     Icon: Download },
    { key: 'diagnostics', label: t('steps', 'diagnostics'), Icon: ShieldCheck },
  ];

  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col animate-fade-in">
      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <header className="border-b border-surface-700 bg-surface-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-600/30">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white">{t('app', 'title')}</span>
              <span className="text-surface-200 text-xs ml-2">· {companyName}</span>
            </div>
          </div>

          {/* Right section: Dry-run badge & Language Switcher */}
          <div className="flex items-center gap-3">
            {isDryRun && (
              <span className="dry-run-badge">
                <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                {t('app', 'dryRun')}
              </span>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* ── Step Indicator ──────────────────────────────────────────────────── */}
      <nav
        aria-label="Wizard steps"
        className="border-b border-surface-700/50 bg-surface-900/40"
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-1 overflow-x-auto">
          {STEPS.map((step, idx) => {
            const isDone    = idx < currentIndex;
            const isActive  = idx === currentIndex;
            const isDisabled = idx > currentIndex;

            return (
              <div key={step.key} className="flex items-center">
                <div
                  className={clsx(
                    'step-pill',
                    isActive   && 'bg-accent-600 text-white',
                    isDone     && 'bg-ok/10 text-ok',
                    isDisabled && 'bg-surface-850 text-surface-200/50',
                  )}
                >
                  <step.Icon size={12} />
                  <span>{step.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <ChevronRight size={14} className="text-surface-700 mx-1 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 animate-slide-up">
        {children}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-surface-700/40 py-2 px-6">
        <p className="text-xs text-surface-200/40 text-center">
          {t('app', 'footer')}
        </p>
      </footer>
    </div>
  );
}
