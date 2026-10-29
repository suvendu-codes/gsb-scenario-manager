import {
  runCommandValues,
  runEngineValues,
  runPriorityValues,
  runStatusValues,
  terminalRunStatusValues,
} from '../../db/schema/enums.js';

export type RunStatus = (typeof runStatusValues)[number];
export type RunEngine = (typeof runEngineValues)[number];
export type RunCommand = (typeof runCommandValues)[number];
export type RunPriority = (typeof runPriorityValues)[number];

export const RUN_ENGINES = runEngineValues;
export const RUN_PRIORITIES = runPriorityValues;

const TERMINAL: ReadonlySet<string> = new Set(terminalRunStatusValues);

/** completed, failed, cancelled (and legacy interrupted) end an execution; a new Run may follow. */
export const isTerminalRunStatus = (status: RunStatus) => TERMINAL.has(status);

/** A persisted SM execution record as the trigger flow sees it. */
export interface Run {
  id: string;
  scenarioId: string;
  correlationId: string;
  engine: RunEngine;
  status: RunStatus;
  priority: RunPriority;
  pendingCommand: RunCommand | null;
  commandSequence: number;
  issuedBy: string | null;
  idempotencyKey: string | null;
  requestHash: string | null;
  createdAt: Date;
}

/** Fields the trigger flow writes for a brand-new execution. */
export type NewRun = Omit<Run, 'createdAt'>;
