import { ReplayEnvelope } from '../../domain/entities/replay-envelope.entity';

export interface ReplayRepositoryPort {
  readOrderEvents(): ReplayEnvelope[];
}

export const REPLAY_REPOSITORY = Symbol('REPLAY_REPOSITORY');
