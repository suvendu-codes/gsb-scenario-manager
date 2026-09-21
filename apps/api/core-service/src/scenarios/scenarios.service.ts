import { Injectable } from '@nestjs/common';
import { Scenario } from './entities/scenario.entity';

@Injectable()
export class ScenariosService {
  findAll(): Scenario[] {
    return [];
  }
}
