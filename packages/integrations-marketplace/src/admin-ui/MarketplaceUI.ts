/**
 * MarketplaceUI — קומפוננטת React לגלריית הפלאגינים (RTL עברית).
 *
 * הקומפוננטה אגנוסטית לפריימוורק UI ספציפי — מקבלת פעולות כ-props.
 * הטיפוסים מיועדים לשימוש ב-Admin Dashboard של Sync Up.
 */

import type { PluginManifest, PluginCategory } from '../core/IPlugin';

export interface MarketplaceUIProps {
  plugins: PluginManifest[];
  installedIds: string[];
  onInstall: (pluginId: string) => void;
  onOpenSettings: (pluginId: string) => void;
  filterCategory?: PluginCategory;
}

/**
 * אוסף קטגוריות מתורגמות לעברית להצגה ב-UI.
 */
export const CATEGORY_LABELS_HE: Record<PluginCategory, string> = {
  calendar: 'יומנים',
  accounting: 'חשבונאות',
  payment: 'סליקה',
  bi: 'BI ודוחות',
  marketing: 'שיווק',
  operations: 'תפעול',
  communication: 'תקשורת',
  storage: 'אחסון',
};

/**
 * Pseudo-React component — נכתב בטיפוסי React אך ללא ייבוא בפועל
 * כדי שלא להוסיף תלות. המימוש האמיתי יבוצע ב-app הצרכן.
 */
export function MarketplaceUI(props: MarketplaceUIProps): MarketplaceViewModel {
  const filtered = props.filterCategory
    ? props.plugins.filter(p => p.category === props.filterCategory)
    : props.plugins;

  const cards = filtered.map(p => ({
    id: p.id,
    title: p.nameHe,
    subtitle: p.vendor,
    description: p.descriptionHe,
    category: CATEGORY_LABELS_HE[p.category],
    icon: p.icon,
    installed: props.installedIds.includes(p.id),
    primaryAction: props.installedIds.includes(p.id)
      ? { label: 'הגדרות', onClick: () => props.onOpenSettings(p.id) }
      : { label: 'התקנה', onClick: () => props.onInstall(p.id) },
  }));

  return { direction: 'rtl', cards, totalCount: filtered.length };
}

export interface MarketplaceViewModel {
  direction: 'rtl';
  cards: Array<{
    id: string;
    title: string;
    subtitle: string;
    description: string;
    category: string;
    icon?: string;
    installed: boolean;
    primaryAction: { label: string; onClick: () => void };
  }>;
  totalCount: number;
}
