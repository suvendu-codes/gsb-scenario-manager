import { Inject, Injectable } from '@nestjs/common';
import {
  REPLAY_REPOSITORY,
  type ReplayRepositoryPort,
} from '../ports/replay.repository.port';

@Injectable()
export class ReadOrderEventsUseCase {
  constructor(
    @Inject(REPLAY_REPOSITORY)
    private readonly replay: ReplayRepositoryPort,
  ) {}

  execute() {
    return this.replay.readOrderEvents();
  }
}
