import { Inject, Injectable } from '@nestjs/common';
import { UPSTREAM, type UpstreamPort } from '../ports/upstream.port';

@Injectable()
export class GetAgentOperationsUseCase {
  constructor(@Inject(UPSTREAM) private readonly upstream: UpstreamPort) {}

  execute(gsbFunctionalAreaId?: number) {
    return this.upstream.getAgentOperations(gsbFunctionalAreaId);
  }
}
