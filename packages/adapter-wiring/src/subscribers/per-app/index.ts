/**
 * Per-app subscription helpers.
 *
 * כל helper מותאם לשירות מסוים ורושם רק את ה-adapters הרלוונטיים לו.
 * שימושי לפריסה במיקרו-שירותים נפרדים (CRM service, Orders service וכו').
 */
export * from './crm.js';
export * from './orders.js';
export * from './finance.js';
export * from './portal.js';
export * from './inventory.js';
export * from './hr.js';
