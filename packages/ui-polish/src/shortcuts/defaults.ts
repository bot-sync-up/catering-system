import type { Shortcut } from '../hooks/useShortcuts';

type ActionMap = Partial<Record<string, (e: KeyboardEvent) => void>>;

/** מחזיר 20 קיצורי ברירת מחדל מקובלים — מקבל מפת actions עבור פעולות אפליקטיביות. */
export function buildDefaultShortcuts(actions: ActionMap = {}): Shortcut[] {
  const noop = (): void => {};
  return [
    { combo: 'mod+k', description: 'פתיחת לוח הפקודות', group: 'ניווט', handler: actions.openPalette ?? noop, enableInInputs: true },
    { combo: 'mod+/', description: 'הצגת קיצורי מקלדת', group: 'ניווט', handler: actions.showHelp ?? noop, enableInInputs: true },
    { combo: '?', description: 'הצגת קיצורי מקלדת', group: 'ניווט', handler: actions.showHelp ?? noop },
    { combo: 'mod+s', description: 'שמירה', group: 'עריכה', handler: actions.save ?? noop, enableInInputs: true },
    { combo: 'mod+shift+s', description: 'שמירה בשם', group: 'עריכה', handler: actions.saveAs ?? noop, enableInInputs: true },
    { combo: 'mod+n', description: 'חדש', group: 'עריכה', handler: actions.new ?? noop },
    { combo: 'mod+f', description: 'חיפוש', group: 'ניווט', handler: actions.find ?? noop, enableInInputs: true },
    { combo: 'mod+g', description: 'חיפוש הבא', group: 'ניווט', handler: actions.findNext ?? noop },
    { combo: 'mod+p', description: 'הדפסה', group: 'עריכה', handler: actions.print ?? noop, enableInInputs: true },
    { combo: 'mod+e', description: 'ייצוא', group: 'נתונים', handler: actions.export ?? noop },
    { combo: 'mod+i', description: 'ייבוא', group: 'נתונים', handler: actions.import ?? noop },
    { combo: 'mod+,', description: 'הגדרות', group: 'ניווט', handler: actions.settings ?? noop },
    { combo: 'mod+b', description: 'הצג/הסתר תפריט צד', group: 'תצוגה', handler: actions.toggleSidebar ?? noop },
    { combo: 'mod+shift+d', description: 'החלפת ערכת נושא', group: 'תצוגה', handler: actions.toggleTheme ?? noop },
    { combo: 'mod+enter', description: 'אישור / שליחה', group: 'עריכה', handler: actions.submit ?? noop, enableInInputs: true },
    { combo: 'escape', description: 'סגירה / ביטול', group: 'ניווט', handler: actions.cancel ?? noop, enableInInputs: true },
    { combo: 'mod+z', description: 'ביטול פעולה', group: 'עריכה', handler: actions.undo ?? noop, enableInInputs: true },
    { combo: 'mod+shift+z', description: 'חזרה על פעולה', group: 'עריכה', handler: actions.redo ?? noop, enableInInputs: true },
    { combo: 'mod+a', description: 'סימון הכל', group: 'עריכה', handler: actions.selectAll ?? noop },
    { combo: 'delete', description: 'מחיקת הנבחרים', group: 'עריכה', handler: actions.deleteSelected ?? noop },
  ];
}
