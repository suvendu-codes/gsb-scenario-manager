import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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

type CursorPayload = ScenarioCursor & { f: ScenarioSortField; d: Sort<ScenarioSortField>['direction'] };

@Injectable()
export class ListScenariosUseCase {
  constructor(@Inject(SCENARIO_REPOSITORY) private readonly scenarios: ScenarioRepository) {}

  async execute({ cursor, limit, sort, ...filter }: ListScenariosInput) {
    let after: ScenarioCursor | undefined;
    if (cursor) {
      const c = decodeCursor<CursorPayload>(cursor);
      // A cursor is only valid for the sort it was issued under.
      if (c.f !== sort.field || c.d !== sort.direction) {
        throw new BadRequestException('Cursor does not match the requested sort');
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
              id: last.id,
              value: cursorValue(last, sort.field),
            })
          : null,
    };
  }
}

const cursorValue = (s: Scenario, field: ScenarioSortField) =>
  field === 'name' ? s.name : (field === 'created_at' ? s.createdAt : s.updatedAt).toISOString();
