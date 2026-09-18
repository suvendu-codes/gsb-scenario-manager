import { Module } from '@nestjs/common';
import { ConfigModulesController } from './config-modules.controller';
import { ConfigModulesService } from './config-modules.service';
import { ConfigVersioningService } from './versioning/config-versioning.service';

@Module({
  controllers: [ConfigModulesController],
  providers: [ConfigModulesService, ConfigVersioningService],
})
export class ConfigModulesModule {}
