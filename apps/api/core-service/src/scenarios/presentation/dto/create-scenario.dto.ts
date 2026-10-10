import { IsNotEmpty, IsString } from 'class-validator';

export class CreateScenarioDto {
  @IsString() @IsNotEmpty() projectId!: string;
  @IsString() @IsNotEmpty() mapId!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() authorId!: string;
  @IsString() @IsNotEmpty() configUri!: string;
  @IsString() @IsNotEmpty() createdBy!: string;
}
