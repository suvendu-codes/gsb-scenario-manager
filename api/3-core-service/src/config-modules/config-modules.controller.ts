import { Controller, Get } from '@nestjs/common';
import { ConfigModulesService } from './config-modules.service';

@Controller('config-modules')
export class ConfigModulesController {
  constructor(private readonly configModulesService: ConfigModulesService) {}

  @Get()
  list() {
    return this.configModulesService.list();
  }
}
