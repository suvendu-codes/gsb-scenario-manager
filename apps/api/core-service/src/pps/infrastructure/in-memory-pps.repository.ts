import { Injectable } from '@nestjs/common';
import { PpsRepository } from '../application/ports/pps.repository.js';
import { MapPps, Pps } from '../domain/pps.js';

/** Mock upstream: serves fixed stations until the real connection lands. */
const DEFAULT_PPS: Pps[] = [
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

@Injectable()
export class InMemoryPpsRepository implements PpsRepository {
  async findByMap(_projectId: string, mapId: string): Promise<MapPps> {
    return Object.assign(new MapPps(), { mapId, pps: structuredClone(DEFAULT_PPS) });
  }
}
