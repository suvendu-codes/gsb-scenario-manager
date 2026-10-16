import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CloneScenarioDto {
  @ApiProperty({ description: 'ID of the scenario to clone' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiPropertyOptional({ description: 'Name for the clone; defaults to "<source name> (copy)"' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
