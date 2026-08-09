// src/components/common/LanguageSwitcher.tsx
import { useState, useRef, useEffect } from 'react';
import { useTranslation, LANGUAGE_NAMES, type SupportedLanguage } from '../../i18n';
import { Globe, ChevronDown } from 'lucide-react';

export function LanguageSwitcher() {
  const { lang, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = LANGUAGE_NAMES[lang];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-surface-100 bg-surface-800 border border-surface-700 rounded-lg hover:border-accent-500/50 hover:bg-surface-750 transition-all duration-150"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe size={13} className="text-accent-400" />
        <span className="mr-0.5">{current.flag}</span>
        <span>{current.name}</span>
        <ChevronDown size={12} className={`text-surface-200 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-36 bg-surface-850 border border-surface-700 rounded-lg shadow-xl py-1 z-50 animate-fade-in"
          role="menu"
          aria-orientation="vertical"
        >
          {(Object.keys(LANGUAGE_NAMES) as SupportedLanguage[]).map((l) => {
            const item = LANGUAGE_NAMES[l];
            const isSelected = l === lang;
            return (
              <button
                key={l}
                onClick={() => {
                  setLanguage(l);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-surface-700 transition-colors ${
                  isSelected ? 'text-accent-300 font-semibold bg-surface-750' : 'text-surface-100'
                }`}
                role="menuitem"
              >
                <span>{item.flag}</span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
