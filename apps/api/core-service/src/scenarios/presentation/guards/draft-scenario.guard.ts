import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { SCENARIO_REPOSITORY, type ScenarioRepository } from '../../application/ports/scenario.repository.js';
import { ScenarioNotFoundError } from '../../domain/errors.js';

/** Allows the request only when the target scenario (`:id`) is a draft; otherwise throws ScenarioLockedError. */
@Injectable()
export class DraftScenarioGuard implements CanActivate {
  constructor(@Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository) {}

  async canActivate(context: ExecutionContext) {
    const id: string | undefined = context.switchToHttp().getRequest().params?.id;
    // Guards run before pipes: let ParseUUIDPipe reject malformed ids.
    if (!id || !isUUID(id)) return true;

    const scenario = await this.scenarios.findById(id);
    if (!scenario) throw new ScenarioNotFoundError(id);
    scenario.assertEditable();
    return true;
  }
}
