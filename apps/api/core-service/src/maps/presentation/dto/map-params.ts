import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** Postgres `integer` upper bound; keeps versions within what any store can hold. */
const MAX_MAP_VERSION = 2_147_483_647;

const MapVersionParamsSchema = z.object({
  id: z.string().min(1),
  // Strict digits only: rejects "1.5", "1e2", "0x10", " 1", "-1", "0" and "01".
  version: z
    .string()
    .regex(/^[1-9]\d*$/, 'version must be a positive integer')
    .transform(Number)
    .pipe(z.int().max(MAX_MAP_VERSION)),
});

export class MapVersionParams extends createZodDto(MapVersionParamsSchema) {}

const MapFolderParamsSchema = z.object({
  id: z.string().min(1),
  folderId: z.string().min(1),
});

export class MapFolderParams extends createZodDto(MapFolderParamsSchema) {}
