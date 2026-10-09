import { IsNotEmpty, IsString } from 'class-validator';

export class DuplicateScenarioDto {
  @IsString() @IsNotEmpty() createdBy!: string;
}
