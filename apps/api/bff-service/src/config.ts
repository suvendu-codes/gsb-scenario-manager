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
  config.set('port', Number(process.env.PORT ?? 3001));
  config.set('env', process.env.NODE_ENV ?? 'development');
  config.set('db_name', process.env.DB_NAME ?? 'scene');
  config.set('db_password', process.env.DB_PASSWORD ?? 'scene');
  config.set(
    'database_url',
    process.env.DATABASE_URL ??
      `postgresql://${process.env.DB_USER ?? 'scene'}:${process.env.DB_PASSWORD ?? 'scene'}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'scene'}`,
  );
});
