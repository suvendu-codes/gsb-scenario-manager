import { describe, expect, it } from 'vitest';
import { MapPpsParams } from './map-pps.params.js';

const parse = (map_version: unknown, mapId = 'm1') =>
  MapPpsParams.schema.safeParse({ projectId: 'p1', mapId, map_version });

describe('MapPpsParams', () => {
  it.each([
    ['1', 1],
    ['12', 12],
    ['2147483647', 2147483647],
  ])('parses map_version=%s to the integer %i', (input, expected) => {
    const result = parse(input);
    expect(result.success).toBe(true);
    expect(result.data?.map_version).toBe(expected);
  });

  it.each([
    ['empty', ''],
    ['zero', '0'],
    ['negative', '-1'],
    ['decimal', '1.5'],
    ['decimal that equals an integer', '1.0'],
    ['exponent', '1e2'],
    ['hex', '0x10'],
    ['leading zero', '01'],
    ['whitespace', ' 1'],
    ['non-numeric', 'v1'],
    ['above integer range', '2147483648'],
    ['non-string', 1],
    ['missing', undefined],
  ])('rejects %s', (_label, v) => {
    expect(parse(v).success).toBe(false);
  });

  it('leaves mapId untouched, whatever it looks like', () => {
    const result = parse('2', '42ccc3dc-4fd7-42d4-af25-b23928cc450b');
    expect(result.data).toMatchObject({
      mapId: '42ccc3dc-4fd7-42d4-af25-b23928cc450b',
      map_version: 2,
    });
  });
});
