import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import type {
  ConfigSnapshotStore,
  RunUpstream,
  UpstreamResolution,
} from '../application/ports/run-trigger.repository.js';

/**
 * Mock upstream (Foundry API): every map exists with a sizer, at version `v1`.
 * Replace with the real connection; tests can seed missing maps or force an outage.
 */
@Injectable()
export class MockRunUpstream implements RunUpstream {
  readonly missingMaps = new Set<string>();
  readonly mapsWithoutSizer = new Set<string>();
  unavailable = false;

  async resolve({ mapId }: { projectId: string; mapId: string }): Promise<UpstreamResolution> {
    if (this.unavailable) throw new Error('upstream unavailable');
    const issues: ('map_not_found' | 'sizer_not_found')[] = [];
    if (this.missingMaps.has(mapId)) issues.push('map_not_found');
    else if (this.mapsWithoutSizer.has(mapId)) issues.push('sizer_not_found');
    return issues.length ? { ok: false, issues } : { ok: true, mapVersion: 'v1', sizerVersion: 'v1' };
  }
}

/** Keeps snapshots in memory (tests, and local runs without a bucket). Still create-only. */
@Injectable()
export class InMemoryConfigSnapshotStore implements ConfigSnapshotStore {
  readonly objects = new Map<string, Record<string, unknown>>();
  fail = false;

  async writeOnce(path: string, config: Record<string, unknown>) {
    if (this.fail) throw new Error('storage unavailable');
    if (this.objects.has(path)) throw new Error(`snapshot ${path} already exists`);
    this.objects.set(path, structuredClone(config));
    return `memory://${path}`;
  }
}

/** gs://<bucket>/<prefix><path>, written with ifGenerationMatch=0 so it can never be overwritten. */
@Injectable()
export class GcsConfigSnapshotStore implements ConfigSnapshotStore {
  private readonly logger = new Logger(GcsConfigSnapshotStore.name);
  private readonly storage = new Storage();

  constructor(private readonly location: { bucket: string; prefix: string }) {}

  async writeOnce(path: string, config: Record<string, unknown>) {
    const prefix = this.location.prefix ? this.location.prefix.replace(/\/*$/, '/') : '';
    const object = `${prefix}${path}`;
    await this.storage
      .bucket(this.location.bucket)
      .file(object)
      .save(JSON.stringify(config), {
        contentType: 'application/json',
        resumable: false,
        preconditionOpts: { ifGenerationMatch: 0 },
      });
    this.logger.log({ event: 'run_config_snapshot_written', object });
    return `gs://${this.location.bucket}/${object}`;
  }
}
