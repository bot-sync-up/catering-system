/**
 * Standalone worker process (optional — for separating the queue worker from API).
 * Run with: npm run worker
 */
require('dotenv').config();
const { startScheduler } = require('./scheduler');
startScheduler();
console.log('[worker] started, awaiting jobs...');
