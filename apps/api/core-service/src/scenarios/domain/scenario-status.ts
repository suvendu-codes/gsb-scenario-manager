export const ScenarioStatus = {
  Draft: 'draft',
  Running: 'running',
  Paused: 'paused',
  Finished: 'finished',
} as const;
export type ScenarioStatus = (typeof ScenarioStatus)[keyof typeof ScenarioStatus];

const TRANSITIONS: Record<ScenarioStatus, readonly ScenarioStatus[]> = {
  draft: ['running'],
  running: ['paused', 'finished'],
  paused: ['running', 'finished'],
  // A scenario may be run again after its previous execution ended (Event Schema §2).
  finished: ['running'],
};

export const canTransition = (from: ScenarioStatus, to: ScenarioStatus) =>
  TRANSITIONS[from].includes(to);

/** Only drafts may be edited or deleted. */
export const isMutable = (status: ScenarioStatus) => status === ScenarioStatus.Draft;
