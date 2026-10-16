import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';
import { sortPattern } from '../../../common/dto/sort.dto.js';
import { SCENARIO_SORT_FIELDS } from '../../application/ports/scenario.repository.js';
import { ScenarioStatus } from '../../domain/scenario-status.js';

export class ListAllScenariosQuery {
  @ApiPropertyOptional({ enum: Object.values(ScenarioStatus) })
  @IsOptional()
  @IsIn(Object.values(ScenarioStatus))
  status?: ScenarioStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  map_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @ApiPropertyOptional({
    description: `Sort field; prefix with \`-\` for descending. Allowed: ${SCENARIO_SORT_FIELDS.join(', ')}`,
    example: '-updated_at',
  })
  @IsOptional()
  @Matches(sortPattern(SCENARIO_SORT_FIELDS), {
    message: `sort must be one of ${SCENARIO_SORT_FIELDS.join(', ')} (prefix with - for descending)`,
  })
  sort?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Opaque `next_cursor` from the previous response' })
  @IsOptional()
  @IsString()
  cursor?: string;
}
