import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

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

  @ApiProperty({
    minimum: 1,
    description: 'The `version` last read by the client (optimistic lock)',
  })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  updatedBy!: string;
}
