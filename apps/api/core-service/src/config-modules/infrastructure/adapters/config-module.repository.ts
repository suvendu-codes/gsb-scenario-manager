import { Injectable } from '@nestjs/common';
import { ConfigModuleRepositoryPort } from '../../application/ports/config-module.repository.port';
import { CONFIG_MODULE_KEYS } from '../../config-module-keys';
import { ConfigVersioningService } from '../../versioning/config-versioning.service';

@Injectable()
export class ConfigModuleRepository implements ConfigModuleRepositoryPort {
  constructor(private readonly versioning: ConfigVersioningService) {}

  list() {
    return CONFIG_MODULE_KEYS.map((key) => ({
      key,
      version: this.versioning.nextVersion(0),
    }));
  }
}
