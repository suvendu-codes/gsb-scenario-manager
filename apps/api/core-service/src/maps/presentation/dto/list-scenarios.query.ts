import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';
import { sortPattern } from '../../../common/dto/sort.dto';
import { SCENARIO_SORT_FIELDS } from '../../../scenarios/application/ports/scenario.repository';
import { ScenarioStatus } from '../../../scenarios/domain/scenario-status';

export class ListScenariosQuery {
  @ApiPropertyOptional({ enum: Object.values(ScenarioStatus) })
  @IsOptional()
  @IsIn(Object.values(ScenarioStatus))
  status?: ScenarioStatus;

  @ApiPropertyOptional({
    description: `Sort field; prefix with \`-\` for descending. Allowed: ${SCENARIO_SORT_FIELDS.join(', ')}`,
    example: '-updated_at',
  })
  @IsOptional()
  @Matches(sortPattern(SCENARIO_SORT_FIELDS), {
    message: `sort must be one of ${SCENARIO_SORT_FIELDS.join(', ')} (prefix with - for descending)`,
  })
  sort?: string;
}
