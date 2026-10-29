import { Injectable } from '@nestjs/common';
import { PpsRepository } from '../application/ports/pps.repository.js';
import { MapVersionNotFoundError } from '../../maps/domain/errors.js';
import { MapPps, Pps } from '../domain/pps.js';

/** Mock upstream: serves fixed stations per map version until the real connection lands. */
const PPS_V1: Pps[] = [
  {
    ppsId: 'PPS-101',
    type: 'Standard PPS',
    category: 'Fixed',
    location: 'A-01.2',
    pickDirection: 0,
    status: 'connected',
    eligibleSystem: 'rtp',
    ppsUrl: '/v1/pps/pps-101',
    config: {
      modes: ['pick', 'put'],
      schedule: [
        { hours: 4, mode: 'pick' },
        { hours: 4, mode: 'put' },
      ],
    },
  },
  {
    ppsId: 'PPS-105',
    type: 'Easyloop PPS',
    category: 'Fixed',
    location: 'A-05.1',
    pickDirection: 0,
    status: 'connected',
    eligibleSystem: 'rtp',
    ppsUrl: '/v1/pps/pps-105',
    config: { modes: ['pick', 'put'], schedule: [] },
  },
];

/** Version 2 adds a station, so the two versions are distinguishable. */
const PPS_V2: Pps[] = [
  ...PPS_V1,
  {
    ppsId: 'PPS-106',
    type: 'Standard PPS',
    category: 'Fixed',
    location: 'A-06.1',
    pickDirection: 0,
    status: 'connected',
    eligibleSystem: 'rtp',
    ppsUrl: '/v1/pps/pps-106',
    config: { modes: ['pick'], schedule: [] },
  },
];

const PPS_BY_VERSION = new Map<number, Pps[]>([
  [1, PPS_V1],
  [2, PPS_V2],
]);

@Injectable()
export class InMemoryPpsRepository implements PpsRepository {
  async findByMap(_projectId: string, mapId: string, mapVersion: number): Promise<MapPps> {
    const stations = PPS_BY_VERSION.get(mapVersion);
    if (!stations) throw new MapVersionNotFoundError(mapId, mapVersion);
    return Object.assign(new MapPps(), { mapId, mapVersion, pps: structuredClone(stations) });
  }
}
