export type ReplaySource = 'REPLAY' | 'LIVE';

export class ReplayEnvelope {
  source!: ReplaySource;
  occurredAt!: string;
  payload!: unknown;
}
