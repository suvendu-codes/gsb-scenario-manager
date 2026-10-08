export type Configurator = {
  set: (key: string, value: unknown) => void;
  setMultiple: (configObj: Record<string, unknown>) => void;
};

export class Config {
  get: (key: string) => unknown;
  getAll: () => Record<string, unknown>;

  constructor(setup: (configurator: Configurator) => void) {
    const settings: Record<string, unknown> = {};

    setup({
      set: (key, value) => {
        settings[key] = value;
      },
      setMultiple: (configObj) => {
        Object.assign(settings, configObj);
      },
    });

    Object.freeze(settings);

    this.get = (key) => settings[key];
    this.getAll = () => ({ ...settings });
  }
}

export const appConfig = new Config((config) => {
  config.set('port', Number(process.env.PORT ?? 3002));
  config.set('env', process.env.NODE_ENV ?? 'development');
  config.set(
    'map_api',
    process.env.MAP_API ?? 'https://jsonplaceholder.typicode.com/todos/1',
  );
  // const upstreamBase =
  //   process.env.UPSTREAM_API_BASE ?? 'http://localhost:3002/upstream';
  // config.set('upstream_api_base', upstreamBase);
  // config.set(
  //   'upstream_projects_api',
  //   process.env.UPSTREAM_PROJECTS_API ?? `${upstreamBase}/projects`,
  // );
  // config.set(
  //   'upstream_solutions_api',
  //   process.env.UPSTREAM_SOLUTIONS_API ??
  //     `${upstreamBase}/projects/{projectId}/solutions`,
  // );
  // config.set(
  //   'upstream_agent_operations_api',
  //   process.env.UPSTREAM_AGENT_OPERATIONS_API ??
  //     `${upstreamBase}/agent-operations`,
  // );
  // config.set(
  //   'upstream_maps_api',
  //   process.env.UPSTREAM_MAPS_API ??
  //     `${upstreamBase}/solutions/{siteId}/functional-areas/{functionalAreaId}/agents/{agentId}/maps`,
  // );
  const username = process.env.DB_USER ?? 'scene';
  const password = process.env.DB_PASSWORD ?? 'scene';
  const host = process.env.DB_HOST ?? 'localhost';
  const database = process.env.DB_NAME ?? 'scene';
  const port = process.env.DB_PORT ?? '5432';
  config.set('db_user', username);
  config.set('db_password', password);
  config.set('db_host', host);
  config.set('db_name', database);
  config.set('db_port', port);
  config.set(
    'database_url',
    process.env.DATABASE_URL ??
      `postgresql://${username}:${password}@${host}:${port}/${database}`,
  );
});
