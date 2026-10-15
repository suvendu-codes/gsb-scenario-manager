import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { RunRepository } from '../application/ports/run.repository';
import { DuplicateCorrelationIdError } from '../domain/errors';
import type { NewRun, Run, RunStatus } from '../domain/run';

const ENGINES = ['emulator', 'simulator'] as const;

@Injectable()
export class InMemoryRunRepository implements RunRepository {
  private readonly runs: Run[] = [];

  async findByCorrelationId(correlationId: string) {
    return this.runs.find((run) => run.correlationId === correlationId) ?? null;
  }

  async create(input: NewRun) {
    if (!ENGINES.includes(input.engine as (typeof ENGINES)[number])) {
      throw new Error(`unsupported engine: ${input.engine}`);
    }
    if (await this.findByCorrelationId(input.correlationId)) {
      throw new DuplicateCorrelationIdError(input.correlationId);
    }
    const run: Run = {
      runId: randomUUID(),
      scenarioId: input.scenarioId,
      correlationId: input.correlationId,
      engineRunId: null,
      reason: null,
      status: 'accepted',
      engineRef: null,
      createdAt: new Date().toISOString(),
    };
    this.runs.push(run);
    return run;
  }

  async update(
    runId: string,
    patch: { status?: RunStatus; engineRef?: string; engineRunId?: string; reason?: string },
  ) {
    const run = this.runs.find((item) => item.runId === runId);
    if (!run) throw new Error(`run ${runId} not found`);
    Object.assign(run, patch);
    return run;
  }
}
