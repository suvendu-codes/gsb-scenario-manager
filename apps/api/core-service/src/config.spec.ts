import { describe, expect, it } from 'vitest';
import { ConfigBuilder } from './config.js';

describe('config', () => {
  it('exports ConfigBuilder', () => {
    expect(ConfigBuilder).toBeDefined();
  });
});
