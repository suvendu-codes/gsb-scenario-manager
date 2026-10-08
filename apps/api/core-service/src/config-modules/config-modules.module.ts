import { Module } from '@nestjs/common';
import { CONFIG_MODULE_REPOSITORY } from './application/ports/config-module.repository.port';
import { ListConfigModulesUseCase } from './application/use-cases/list-config-modules.use-case';
import { ConfigModuleRepository } from './infrastructure/adapters/config-module.repository';
import { ConfigVersioningService } from './versioning/config-versioning.service';
import { ConfigModulesController } from './presentation/config-modules.controller';

@Module({
  controllers: [ConfigModulesController],
  providers: [
    ListConfigModulesUseCase,
    ConfigVersioningService,
    {
      provide: CONFIG_MODULE_REPOSITORY,
      useClass: ConfigModuleRepository,
    },
  ],
})
export class ConfigModulesModule {}
