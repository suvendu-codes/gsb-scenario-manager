import { Inject, Injectable } from '@nestjs/common';
import {
  SCENARIO_REPOSITORY,
  type ScenarioRepository,
} from '../../../scenarios/application/ports/scenario.repository';
import {
  ScenarioConfigNotFoundError,
  ScenarioNotFoundError,
} from '../../../scenarios/domain/errors';
import { DuplicateIdempotencyKeyError, RunTriggerFailedError } from '../../domain/errors';
import type { NewRun } from '../../domain/run';
import { RUN_REPOSITORY, type RunRepository } from '../ports/run.repository';
import { RUN_TRIGGER, type RunTrigger } from '../ports/run-trigger.port';

export interface TriggerRunInput {
  scenarioId: string;
  engine: string;
  triggeredBy: string;
  idempotencyKey: string;
}

@Injectable()
export class TriggerRunUseCase {
  constructor(
    @Inject(RUN_REPOSITORY) private readonly runs: RunRepository,
    @Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository,
    @Inject(RUN_TRIGGER) private readonly trigger: RunTrigger,
  ) {}

  async execute(input: TriggerRunInput) {
    const existing = await this.runs.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    const scenario = await this.scenarios.findById(input.scenarioId);
    if (!scenario) throw new ScenarioNotFoundError(input.scenarioId);
    const version = await this.scenarios.findCurrentVersion(scenario);
    if (!version) throw new ScenarioConfigNotFoundError(input.scenarioId);

    const newRun: NewRun = { ...input, scenarioVersionId: version.id };
    let run;
    try {
      run = await this.runs.create(newRun);
    } catch (error) {
      if (error instanceof DuplicateIdempotencyKeyError) {
        const winner = await this.runs.findByIdempotencyKey(input.idempotencyKey);
        if (winner) return winner;
      }
      throw error;
    }

    try {
      const { engineRef } = await this.trigger.start({
        runId: run.runId,
        engine: input.engine,
        scenarioId: scenario.id,
        scenarioVersionId: version.id,
        configUri: version.configUri,
      });
      return await this.runs.update(run.runId, { engineRef });
    } catch (error) {
      await this.runs.update(run.runId, { status: 'failed' });
      throw new RunTriggerFailedError(
        run.runId,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
