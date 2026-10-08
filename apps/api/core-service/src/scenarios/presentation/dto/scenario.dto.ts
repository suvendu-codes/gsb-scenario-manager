import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  SCENARIO_STATUSES,
  type ScenarioStatus,
} from '../../domain/entities/scenario.entity';

export class CreateScenarioDto {
  @IsString()
  @IsNotEmpty()
  mapId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateScenarioDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}

export class ListScenariosQuery {
  @IsOptional()
  @IsIn(SCENARIO_STATUSES)
  status?: ScenarioStatus;

  @IsOptional()
  @IsIn(['name', 'createdAt', 'updatedAt', '-name', '-createdAt', '-updatedAt'])
  sort?: string;
}
