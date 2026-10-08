import { Inject, Injectable } from '@nestjs/common';
import { UPSTREAM, type UpstreamPort } from '../ports/upstream.port';

@Injectable()
export class GetUpstreamProjectsUseCase {
  constructor(@Inject(UPSTREAM) private readonly upstream: UpstreamPort) {}

  execute() {
    return this.upstream.getProjects();
  }
}
