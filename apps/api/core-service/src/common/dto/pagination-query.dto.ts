import { z } from 'zod';

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
/** Bounds the OFFSET Postgres must scan and discard: worst case is MAX_PAGE * MAX_PAGE_LIMIT rows. */
export const MAX_PAGE = 10_000;

/** Offset pagination params: `?page=2&limit=20`. Spread into a query schema. */
export const paginationQuery = {
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
};

export interface Pagination {
  page: number;
  limit: number;
}
