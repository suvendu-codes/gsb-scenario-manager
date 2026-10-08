import { Config } from './config';

describe('Config', () => {
  it('freezes env and port after setup', () => {
    const appConfig = new Config((config) => {
      config.set('port', 3000);
      config.set('env', 'development');
    });

    expect(appConfig.get('port')).toBe(3000);
    expect(appConfig.get('env')).toBe('development');

    appConfig.getAll().port = 8000;
    expect(appConfig.get('port')).toBe(3000);
  });
});
