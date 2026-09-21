export type ReplaySource = 'REPLAY' | 'LIVE';

export class ReplayEnvelopeDto {
  source!: ReplaySource;
  occurredAt!: string;
  payload!: unknown;
}
