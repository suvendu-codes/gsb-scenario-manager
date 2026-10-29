import { z } from 'zod';

export const PaginationMetaSchema = z.object({
  currentPage: z.number().int(),
  /** The requested page size, not the number of items on this page. */
  itemsPerPage: z.number().int(),
  totalItems: z.number().int(),
  totalPages: z.number().int(),
  hasPreviousPage: z.boolean(),
  hasNextPage: z.boolean(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export const buildPaginationMeta = (
  totalItems: number,
  currentPage: number,
  itemsPerPage: number,
): PaginationMeta => {
  const totalPages = itemsPerPage > 0 ? Math.ceil(totalItems / itemsPerPage) : 0;
  return {
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
};
