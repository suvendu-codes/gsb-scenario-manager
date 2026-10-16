import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateScenarioDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'URI of the scenario config blob (e.g. gs://…)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  configUri?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  updatedBy!: string;
}
