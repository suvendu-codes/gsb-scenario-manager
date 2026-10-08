import { Inject, Injectable } from '@nestjs/common';
import { UPSTREAM, type UpstreamPort } from '../ports/upstream.port';

@Injectable()
export class GetUpstreamMapsUseCase {
  constructor(@Inject(UPSTREAM) private readonly upstream: UpstreamPort) {}

  execute(page: number, pageSize: number) {
    return this.upstream.getMaps(page, pageSize);
  }
}
