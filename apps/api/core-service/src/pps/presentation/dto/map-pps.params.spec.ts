import { describe, expect, it } from 'vitest';
import { MapPpsParams } from './map-pps.params.js';

const input = (mapVersion: unknown, mapId = 'm1') => ({ projectId: 'p1', mapId, mapVersion });
const parse = (mapVersion: unknown, mapId?: string) =>
  MapPpsParams.schema.safeParse(input(mapVersion, mapId));

describe('MapPpsParams', () => {
  it.each([
    ['1', 1],
    ['12', 12],
    ['2147483647', 2147483647],
  ])('parses mapVersion=%s to the integer %i', (value, expected) => {
    // parse() throws on failure, so a rejected value fails the test before any data is read
    expect(MapPpsParams.schema.parse(input(value)).mapVersion).toBe(expected);
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
    const data = MapPpsParams.schema.parse(input('2', '42ccc3dc-4fd7-42d4-af25-b23928cc450b'));
    expect(data).toMatchObject({
      mapId: '42ccc3dc-4fd7-42d4-af25-b23928cc450b',
      mapVersion: 2,
    });
  });
});
