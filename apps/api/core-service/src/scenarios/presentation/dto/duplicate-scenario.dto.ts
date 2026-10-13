import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DuplicateScenarioDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  createdBy!: string;
}
