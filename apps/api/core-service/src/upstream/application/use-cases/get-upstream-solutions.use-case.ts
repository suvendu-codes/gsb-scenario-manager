import { Inject, Injectable } from '@nestjs/common';
import { UPSTREAM, type UpstreamPort } from '../ports/upstream.port';

@Injectable()
export class GetUpstreamSolutionsUseCase {
  constructor(@Inject(UPSTREAM) private readonly upstream: UpstreamPort) {}

  execute(projectId: string) {
    return this.upstream.getSolutions(projectId);
  }
}
