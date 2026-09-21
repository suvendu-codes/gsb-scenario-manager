export const CONFIG_MODULE_KEYS = [
  'order',
  'agent',
  'operator',
  'inventory',
  'layout',
  'metrics',
] as const;

export type ConfigModuleKey = (typeof CONFIG_MODULE_KEYS)[number];
