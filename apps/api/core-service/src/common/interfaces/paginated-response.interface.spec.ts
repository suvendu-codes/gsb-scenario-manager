import { describe, expect, it } from 'vitest';
import { buildPaginationMeta } from './paginated-response.interface.js';

describe('buildPaginationMeta', () => {
  it('computes pages for a partial last page', () => {
    expect(buildPaginationMeta(45, 3, 20)).toEqual({
      currentPage: 3,
      itemsPerPage: 20,
      totalItems: 45,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: false,
    });
  });

  it('reports no pages for an empty result', () => {
    const meta = buildPaginationMeta(0, 1, 20);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(false);
  });

  it('stays finite when the page size is 0', () => {
    const meta = buildPaginationMeta(5, 1, 0);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNextPage).toBe(false);
  });
});
