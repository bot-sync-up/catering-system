/**
 * @catering/adapter-wiring
 *
 * חיווט מלא של 11 adapters ל-EventBus:
 *  - publishers/ - קוד publishing event לכל מודול עסקי
 *  - subscribers/ - wiring שמפעיל adapters (subscribeAll + per-app)
 */

export * from './publishers/index.js';
export * from './subscribers/index.js';
