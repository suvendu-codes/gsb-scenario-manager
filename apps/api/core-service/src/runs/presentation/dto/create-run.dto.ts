import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRunDto {
  @IsString()
  @IsNotEmpty()
  scenarioId!: string;
}
