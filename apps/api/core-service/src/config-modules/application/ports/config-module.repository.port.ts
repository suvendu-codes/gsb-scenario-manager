export interface ConfigModuleView {
  key: string;
  version: number;
}

export interface ConfigModuleRepositoryPort {
  list(): ConfigModuleView[];
}

export const CONFIG_MODULE_REPOSITORY = Symbol('CONFIG_MODULE_REPOSITORY');
