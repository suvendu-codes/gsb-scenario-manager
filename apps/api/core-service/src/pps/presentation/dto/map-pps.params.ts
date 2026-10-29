import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** Postgres `integer` upper bound; keeps versions within what any store can hold. */
const MAX_MAP_VERSION = 2_147_483_647;

const MapPpsParamsSchema = z.object({
  projectId: z.string().min(1),
  mapId: z.string().min(1),
  // Strict digits only: rejects "1.5", "1e2", "0x10", " 1", "-1", "0" and "01" that coercion would let through.
  map_version: z
    .string()
    .regex(/^[1-9]\d*$/, 'map_version must be a positive integer')
    .transform(Number)
    .pipe(z.int().max(MAX_MAP_VERSION)),
});

export class MapPpsParams extends createZodDto(MapPpsParamsSchema) {}
