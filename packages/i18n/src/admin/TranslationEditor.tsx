import React, { useEffect, useMemo, useState } from 'react';
import {
  LOCALE_META,
  NAMESPACES,
  SUPPORTED_LOCALES,
  type Namespace,
  type SupportedLocale,
} from '../types';

interface TranslationMap {
  [key: string]: string;
}

export interface TranslationEditorProps {
  /** טעינת תרגומים לפי שפה+namespace */
  loadTranslations: (locale: SupportedLocale, ns: Namespace) => Promise<TranslationMap>;
  /** שמירת ערך בודד (key→value) */
  saveTranslation: (locale: SupportedLocale, ns: Namespace, key: string, value: string) => Promise<void>;
  /** ברירת מחדל ל-namespace שנפתח */
  initialNamespace?: Namespace;
  /** השפה שמשמשת כמקור (baseline) להשוואה */
  baselineLocale?: SupportedLocale;
}

/**
 * עורך תרגומים — UI לאדמין לערוך מפתחות לכל השפות במקביל.
 * מציג: מפתח | baseline (he) | locale בעריכה | שמירה אינ-ליין.
 */
export function TranslationEditor({
  loadTranslations,
  saveTranslation,
  initialNamespace = 'common',
  baselineLocale = 'he',
}: TranslationEditorProps) {
  const [namespace, setNamespace] = useState<Namespace>(initialNamespace);
  const [targetLocale, setTargetLocale] = useState<SupportedLocale>('en');
  const [baseline, setBaseline] = useState<TranslationMap>({});
  const [target, setTarget] = useState<TranslationMap>({});
  const [filter, setFilter] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadTranslations(baselineLocale, namespace),
      loadTranslations(targetLocale, namespace),
    ]).then(([b, t]) => {
      if (!active) return;
      setBaseline(b);
      setTarget(t);
    });
    return () => { active = false; };
  }, [namespace, targetLocale, baselineLocale, loadTranslations]);

  const rows = useMemo(() => {
    const keys = Array.from(new Set([...Object.keys(baseline), ...Object.keys(target)])).sort();
    const f = filter.trim().toLowerCase();
    return keys.filter((k) => !f || k.toLowerCase().includes(f) || (baseline[k] ?? '').toLowerCase().includes(f));
  }, [baseline, target, filter]);

  async function handleSave(key: string, value: string) {
    setSavingKey(key);
    try {
      await saveTranslation(targetLocale, namespace, key, value);
      setTarget((t) => ({ ...t, [key]: value }));
    } finally {
      setSavingKey(null);
    }
  }

  const missingCount = rows.filter((k) => !target[k] && baseline[k]).length;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <label>
          Namespace:
          <select value={namespace} onChange={(e) => setNamespace(e.target.value as Namespace)}>
            {NAMESPACES.map((ns) => <option key={ns} value={ns}>{ns}</option>)}
          </select>
        </label>
        <label>
          שפת יעד:
          <select value={targetLocale} onChange={(e) => setTargetLocale(e.target.value as SupportedLocale)}>
            {SUPPORTED_LOCALES.filter((l) => l !== baselineLocale).map((l) => (
              <option key={l} value={l}>{LOCALE_META[l].flag} {LOCALE_META[l].nativeName}</option>
            ))}
          </select>
        </label>
        <input
          placeholder="סנן..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <span style={{ color: missingCount > 0 ? 'crimson' : 'green' }}>
          {missingCount > 0 ? `${missingCount} חסרים` : 'הכול מתורגם'}
        </span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>מפתח</th>
            <th style={th}>{LOCALE_META[baselineLocale].nativeName} (מקור)</th>
            <th style={th}>{LOCALE_META[targetLocale].nativeName} (יעד)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((key) => {
            const baseVal = baseline[key] ?? '';
            const tgtVal = target[key] ?? '';
            const missing = !tgtVal && baseVal;
            return (
              <tr key={key} style={{ background: missing ? '#fff5f5' : undefined }}>
                <td style={td}><code>{key}</code></td>
                <td style={td}>{baseVal}</td>
                <td style={td}>
                  <input
                    defaultValue={tgtVal}
                    onBlur={(e) => {
                      if (e.target.value !== tgtVal) handleSave(key, e.target.value);
                    }}
                    disabled={savingKey === key}
                    style={{ width: '100%' }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'start', padding: 8, borderBottom: '2px solid #ddd' };
const td: React.CSSProperties = { padding: 8, borderBottom: '1px solid #eee', verticalAlign: 'top' };
