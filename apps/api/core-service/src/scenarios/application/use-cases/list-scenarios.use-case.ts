import { Inject, Injectable } from '@nestjs/common';
import { InvalidCursorError } from '../../../common/domain/domain-error.js';
import { decodeCursor, encodeCursor } from '../../../common/dto/cursor.js';
import type { Sort } from '../../../common/dto/sort.dto.js';
import type { Scenario } from '../../domain/scenario.js';
import { ScenarioStatus } from '../../domain/scenario-status.js';
import {
  SCENARIO_REPOSITORY,
  type ScenarioCursor,
  type ScenarioRepository,
  type ScenarioSortField,
} from '../ports/scenario.repository.js';

export interface ListScenariosInput {
  status?: ScenarioStatus;
  mapId?: string;
  projectId?: string;
  sort: Sort<ScenarioSortField>;
  limit: number;
  cursor?: string;
}

type CursorFilter = { s: string | null; m: string | null; p: string | null };
type CursorPayload = ScenarioCursor & {
  f: ScenarioSortField;
  d: Sort<ScenarioSortField>['direction'];
  q: CursorFilter;
};

@Injectable()
export class ListScenariosUseCase {
  constructor(@Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository) {}

  async execute({ cursor, limit, sort, ...filter }: ListScenariosInput) {
    const q = cursorFilter(filter);
    let after: ScenarioCursor | undefined;
    if (cursor) {
      const c = decodeCursor<CursorPayload>(cursor);
      // A cursor is only valid for the sort it was issued under.
      if (c.f !== sort.field || c.d !== sort.direction) {
        throw new InvalidCursorError('Cursor does not match the requested sort');
      }
      if (!isValidCursorValue(c, sort.field)) throw new InvalidCursorError();
      // Likewise only for the filter: keyset values from another result set would silently skip or repeat rows.
      if (!sameFilter(c.q, q)) {
        throw new InvalidCursorError('Cursor does not match the requested filter');
      }
      after = { value: c.value, id: c.id };
    }

    const rows = await this.scenarios.list({ ...filter, sort, limit, after });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items.at(-1);

    return {
      items,
      next_cursor:
        hasMore && last
          ? encodeCursor({
              f: sort.field,
              d: sort.direction,
              q,
              id: last.id,
              value: cursorValue(last, sort.field),
            })
          : null,
    };
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// decodeCursor only guarantees well-formed JSON; check the payload is usable for the sort field.
const isValidCursorValue = (c: Partial<CursorPayload> | null, field: ScenarioSortField) => {
  if (!c || typeof c.value !== 'string' || typeof c.id !== 'string' || !UUID_RE.test(c.id)) return false;
  if (field === 'name') return true;
  return !Number.isNaN(new Date(c.value).getTime());
};

const cursorValue = (s: Scenario, field: ScenarioSortField) =>
  field === 'name' ? s.name : (field === 'created_at' ? s.createdAt : s.updatedAt).toISOString();

const cursorFilter = ({ status, mapId, projectId }: Pick<ListScenariosInput, 'status' | 'mapId' | 'projectId'>): CursorFilter => ({
  s: status ?? null,
  m: mapId ?? null,
  p: projectId ?? null,
});

const sameFilter = (a: Partial<CursorFilter> | undefined, b: CursorFilter) =>
  !!a && a.s === b.s && a.m === b.m && a.p === b.p;
