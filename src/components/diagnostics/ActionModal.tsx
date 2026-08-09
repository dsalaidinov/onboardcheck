// src/components/diagnostics/ActionModal.tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  User,
  Users,
  ExternalLink,
  Copy,
} from 'lucide-react';
import type { Resource } from '../../types/config';
import type { ActionRequest, ActionResult, TargetUserType } from '../../types/actions';
import { Button } from '../common/Button';
import { useTranslation } from '../../i18n';

interface ActionModalProps {
  resource: Resource;
  onClose: () => void;
}

export function ActionModal({ resource, onClose }: ActionModalProps) {
  const { t } = useTranslation();

  const [targetType, setTargetType] = useState<TargetUserType>('self');
  const [employeeFullName, setEmployeeFullName] = useState('');
  const [employeeTabNum, setEmployeeTabNum] = useState('');
  const [employeeDept, setEmployeeDept] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const req: ActionRequest = {
      resource_id: resource.id,
      resource_name: resource.name,
      request_template: resource.request_template,
      target_user_type: targetType,
      employee_full_name: targetType === 'employee' ? employeeFullName : undefined,
      employee_tab_num: targetType === 'employee' ? employeeTabNum : undefined,
      employee_dept: targetType === 'employee' ? employeeDept : undefined,
    };

    try {
      const res = await invoke<ActionResult>('submit_action', { request: req });
      setResult(res);
      if (res.provider_used === 'clipboard_fallback') {
        setCopied(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedPreviewText = () => {
    if (targetType === 'self') {
      return resource.request_template;
    }
    const empInfo = `[Для сотрудника: ${employeeFullName || '___'} (Таб. № ${employeeTabNum || '___'}, ${employeeDept || '___'})]`;
    return `${empInfo}\n${resource.request_template}`;
  };

  const getLocalizedMessage = (res: ActionResult) => {
    const key = res.provider_used as 'clipboard_fallback' | 'dms_jwt' | 'edms_rest_api' | 'webhook_proxy';
    return t('providerMessages', key as any) || res.message;
  };

  const getLocalizedProviderName = (providerKey: string) => {
    const key = providerKey as 'clipboard_fallback' | 'dms_jwt' | 'edms_rest_api' | 'webhook_proxy';
    return t('providers', key as any) || providerKey;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="card w-full max-w-lg animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-surface-700">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-white flex items-center gap-2">
              {t('actionModal', 'title')}
            </h2>
            <p className="text-xs text-surface-200 mt-0.5">
              {resource.name} · {t('actionModal', 'team')} <span className="text-accent-300 font-medium">{resource.responsible_team}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-surface-200 hover:text-white transition-colors p-1 rounded-lg hover:bg-surface-700"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Target Selection: Self vs Employee */}
          <div>
            <label className="text-xs font-medium text-surface-200 uppercase tracking-wide block mb-2">
              {t('actionModal', 'requestFor')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('self')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  targetType === 'self'
                    ? 'bg-accent-600/20 border-accent-500 text-white shadow-sm'
                    : 'bg-surface-850 border-surface-700 text-surface-200 hover:border-surface-600'
                }`}
              >
                <User size={14} className={targetType === 'self' ? 'text-accent-300' : ''} />
                {t('actionModal', 'forSelf')}
              </button>
              <button
                type="button"
                onClick={() => setTargetType('employee')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  targetType === 'employee'
                    ? 'bg-accent-600/20 border-accent-500 text-white shadow-sm'
                    : 'bg-surface-850 border-surface-700 text-surface-200 hover:border-surface-600'
                }`}
              >
                <Users size={14} className={targetType === 'employee' ? 'text-accent-300' : ''} />
                {t('actionModal', 'forEmployee')}
              </button>
            </div>
          </div>

          {/* Additional fields if "For Employee" */}
          {targetType === 'employee' && (
            <div className="space-y-3 p-3.5 bg-surface-850/80 border border-surface-700/70 rounded-lg animate-fade-in">
              <div>
                <label className="text-xs text-surface-200 block mb-1">
                  {t('actionModal', 'employeeFullName')} <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={employeeFullName}
                  onChange={(e) => setEmployeeFullName(e.target.value)}
                  placeholder={t('actionModal', 'employeeFullNamePlaceholder')}
                  className="w-full bg-surface-900 border border-surface-700 rounded-md px-3 py-1.5 text-xs text-white placeholder-surface-200/50 focus:outline-none focus:border-accent-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-surface-200 block mb-1">
                    {t('actionModal', 'employeeTabNum')}
                  </label>
                  <input
                    type="text"
                    value={employeeTabNum}
                    onChange={(e) => setEmployeeTabNum(e.target.value)}
                    placeholder={t('actionModal', 'employeeTabNumPlaceholder')}
                    className="w-full bg-surface-900 border border-surface-700 rounded-md px-3 py-1.5 text-xs text-white placeholder-surface-200/50 focus:outline-none focus:border-accent-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-200 block mb-1">
                    {t('actionModal', 'employeeDept')}
                  </label>
                  <input
                    type="text"
                    value={employeeDept}
                    onChange={(e) => setEmployeeDept(e.target.value)}
                    placeholder={t('actionModal', 'employeeDeptPlaceholder')}
                    className="w-full bg-surface-900 border border-surface-700 rounded-md px-3 py-1.5 text-xs text-white placeholder-surface-200/50 focus:outline-none focus:border-accent-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Request text preview */}
          <div>
            <label className="text-xs font-medium text-surface-200 uppercase tracking-wide block mb-1.5">
              {t('actionModal', 'previewTitle')}
            </label>
            <pre className="text-xs text-surface-100 bg-surface-900 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed border border-surface-700/50 max-h-36 overflow-y-auto">
              {formattedPreviewText()}
            </pre>
          </div>

          {/* Result / error feedback */}
          {result && (
            <div className="p-3.5 bg-ok/10 border border-ok/30 rounded-lg space-y-2 animate-fade-in">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-ok shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-ok">{getLocalizedMessage(result)}</p>
                  <p className="text-[11px] text-surface-200 mt-1">
                    {t('actionModal', 'providerUsed')}{' '}
                    <span className="font-medium text-accent-300">{getLocalizedProviderName(result.provider_used)}</span>
                  </p>
                </div>
              </div>

              {copied && (
                <div className="flex items-center gap-1.5 text-xs text-warning font-medium pt-1">
                  <Copy size={13} />
                  {t('actionModal', 'copySuccess')}
                </div>
              )}

              {result.dms_document_url && (
                <a
                  href={result.dms_document_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-300 hover:text-accent-200 underline mt-1"
                >
                  <ExternalLink size={13} />
                  {t('actionModal', 'openInEdms')}
                </a>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-error/10 border border-error/25 rounded-lg animate-fade-in">
              <AlertCircle size={15} className="text-error shrink-0 mt-0.5" />
              <p className="text-xs text-error">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-surface-700 bg-surface-900/50">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {result ? t('actionModal', 'closeBtn') : t('actionModal', 'cancelBtn')}
          </Button>

          {!result && (
            <Button
              id={`submit-action-${resource.id}`}
              size="sm"
              loading={isSubmitting}
              disabled={isSubmitting || (targetType === 'employee' && !employeeFullName.trim())}
              leftIcon={<Send size={13} />}
              onClick={handleSubmit}
            >
              {t('actionModal', 'submitBtn')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
