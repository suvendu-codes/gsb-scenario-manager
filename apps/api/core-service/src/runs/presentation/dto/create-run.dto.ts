import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateRunDto {
  @ApiProperty({ format: 'uuid', description: 'Scenario to execute' })
  @IsUUID()
  scenarioId!: string;

  @ApiProperty({ enum: ['emulator', 'simulator'] })
  @IsString()
  @IsNotEmpty()
  engine!: string;

  @ApiProperty({ description: 'Actor that triggered the run' })
  @IsString()
  @IsNotEmpty()
  triggeredBy!: string;

  @ApiProperty({ description: 'Idempotency key sent to the run engine' })
  @IsString()
  @IsNotEmpty()
  correlationId!: string;
}
