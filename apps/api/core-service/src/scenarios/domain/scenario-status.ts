export const ScenarioStatus = {
  Draft: 'draft',
  Active: 'active',
  Completed: 'completed',
} as const;
export type ScenarioStatus = (typeof ScenarioStatus)[keyof typeof ScenarioStatus];

const TRANSITIONS: Record<ScenarioStatus, readonly ScenarioStatus[]> = {
  draft: ['active'],
  active: ['completed'],
  completed: [],
};

export const canTransition = (from: ScenarioStatus, to: ScenarioStatus) =>
  TRANSITIONS[from].includes(to);

/** Only drafts may be edited or deleted. */
export const isMutable = (status: ScenarioStatus) => status === ScenarioStatus.Draft;
