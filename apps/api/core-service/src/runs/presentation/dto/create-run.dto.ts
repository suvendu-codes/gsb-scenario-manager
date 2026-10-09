import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateRunDto {
  @IsUUID() scenarioId!: string;
  @IsString() @IsNotEmpty() engine!: string;
  @IsString() @IsNotEmpty() triggeredBy!: string;
  @IsString() @IsNotEmpty() idempotencyKey!: string;
}
