import { Injectable } from '@nestjs/common';
import { CircuitBreaker } from 'shared';
import { appConfig } from '../../config';
import type { RunTrigger, RunTriggerRequest } from '../application/ports/run-trigger.port';

@Injectable()
export class HttpRunTriggerAdapter implements RunTrigger {
  @CircuitBreaker()
  async start(request: RunTriggerRequest): Promise<{ engineRef: string }> {
    const base = appConfig.runEngineUrl.replace(/\/$/, '');
    const res = await fetch(`${base}/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`run engine responded ${res.status}`);
    const body = (await res.json()) as { engineRef?: string; id?: string };
    const engineRef = body.engineRef ?? body.id;
    if (!engineRef) throw new Error('run engine returned no engineRef');
    return { engineRef };
  }
}
