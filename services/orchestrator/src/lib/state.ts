import { randomUUID } from 'crypto';

/**
 * Lightweight in-memory state store for orchestration runs.
 * Replace with Postgres/Redis Hash later — interface is intentionally small.
 */
export interface RunRecord {
  id: string;
  type: 'new-event-order' | 'approve-and-bill' | 'cancel-event';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'compensated';
  startedAt: string;
  finishedAt?: string;
  steps: StepRecord[];
  context: Record<string, unknown>;
  error?: string;
}

export interface StepRecord {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'compensated' | 'skipped';
  startedAt?: string;
  finishedAt?: string;
  output?: unknown;
  error?: string;
}

const runs = new Map<string, RunRecord>();

export function createRun(type: RunRecord['type'], context: Record<string, unknown> = {}): RunRecord {
  const run: RunRecord = {
    id: randomUUID(),
    type,
    status: 'pending',
    startedAt: new Date().toISOString(),
    steps: [],
    context,
  };
  runs.set(run.id, run);
  return run;
}

export function getRun(id: string): RunRecord | undefined {
  return runs.get(id);
}

export function listRuns(): RunRecord[] {
  return [...runs.values()];
}

export function updateRun(id: string, patch: Partial<RunRecord>): RunRecord {
  const cur = runs.get(id);
  if (!cur) throw new Error(`run not found: ${id}`);
  const next = { ...cur, ...patch };
  runs.set(id, next);
  return next;
}

export function recordStep(runId: string, step: StepRecord): void {
  const run = runs.get(runId);
  if (!run) throw new Error(`run not found: ${runId}`);
  const idx = run.steps.findIndex((s) => s.name === step.name);
  if (idx >= 0) run.steps[idx] = step;
  else run.steps.push(step);
}

export function resetForTests(): void {
  runs.clear();
}
