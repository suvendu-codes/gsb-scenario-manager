import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateScenarioDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mapId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  authorId!: string;

  @ApiProperty({ description: 'URI of the scenario config blob (e.g. gs://…)' })
  @IsString()
  @IsNotEmpty()
  configUri!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  createdBy!: string;
}
