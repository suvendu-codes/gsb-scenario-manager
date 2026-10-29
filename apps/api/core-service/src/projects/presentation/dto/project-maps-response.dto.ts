import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { ProjectMap } from '../../../maps/domain/map.js';

const MapSummarySchema = z.object({
  map_id: z.string().meta({ description: 'Map ID' }),
  name: z.string(),
});

const ProjectMapsResponseSchema = z.object({
  projectId: z.string().meta({ description: 'Project ID' }),
  maps: z.array(MapSummarySchema),
});

export class ProjectMapsResponseDto extends createZodDto(ProjectMapsResponseSchema) {}

export const toProjectMapsResponse = (
  projectId: string,
  maps: ProjectMap[],
): ProjectMapsResponseDto => ({
  projectId,
  maps: maps.map(({ id, name }) => ({ map_id: id, name })),
});
