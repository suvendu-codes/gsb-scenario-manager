import { describe, expect, it } from 'vitest';
import { ConfigBuilder } from './config';

describe('config', () => {
  it('exports ConfigBuilder', () => {
    expect(ConfigBuilder).toBeDefined();
  });
});
