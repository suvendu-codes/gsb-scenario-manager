import { Inject, Injectable } from '@nestjs/common';
import {
  CONFIG_MODULE_REPOSITORY,
  type ConfigModuleRepositoryPort,
} from '../ports/config-module.repository.port';

@Injectable()
export class ListConfigModulesUseCase {
  constructor(
    @Inject(CONFIG_MODULE_REPOSITORY)
    private readonly configModules: ConfigModuleRepositoryPort,
  ) {}

  execute() {
    return this.configModules.list();
  }
}
