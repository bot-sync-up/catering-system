/**
 * @catering/event-bus — public API.
 */
export { EventBus } from './EventBus.js';
export type { EventBusOptions } from './EventBus.js';
export { publishEvent, publishMany } from './publish.js';
export { subscribeEvent, subscribeMany } from './subscribe.js';
export * from './types.js';
export { SagaCoordinator } from './saga/SagaCoordinator.js';
export type { SagaStep, SagaDefinition, SagaContext, SagaResult } from './saga/SagaCoordinator.js';
export { buildCancelEventSaga } from './saga/cancelEventSaga.js';
