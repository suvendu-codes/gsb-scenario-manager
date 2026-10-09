import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpdateScenarioDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() @IsNotEmpty() configUri?: string;
  /** The `version` last read by the client (optimistic lock). */
  @IsInt() @Min(1) version!: number;
  @IsString() @IsNotEmpty() updatedBy!: string;
}
