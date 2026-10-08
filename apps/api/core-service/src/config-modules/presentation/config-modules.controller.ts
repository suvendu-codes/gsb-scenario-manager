import { Controller, Get } from '@nestjs/common';
import { ListConfigModulesUseCase } from '../application/use-cases/list-config-modules.use-case';

@Controller('config-modules')
export class ConfigModulesController {
  constructor(private readonly listConfigModules: ListConfigModulesUseCase) {}

  @Get()
  list() {
    return this.listConfigModules.execute();
  }
}
