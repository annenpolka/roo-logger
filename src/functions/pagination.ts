import { ActivityLog } from '../types/core.js'

export interface PaginationResult<T> {
  items: T[]
  totalCount: number
  offset: number
  limit: number
  hasMore: boolean
}

export const applyPagination = <T>(items: T[], limit: number, offset: number): T[] => {
  return items.slice(offset, offset + limit)
}

export const createPaginationResult = <T>(
  allItems: T[],
  limit: number,
  offset: number
): PaginationResult<T> => {
  const paginatedItems = applyPagination(allItems, limit, offset)
  
  return {
    items: paginatedItems,
    totalCount: allItems.length,
    offset,
    limit,
    hasMore: offset + limit < allItems.length
  }
}

// Specialized function for activity logs
export const paginateActivityLogs = (
  logs: ActivityLog[],
  limit: number,
  offset: number
): PaginationResult<ActivityLog> => {
  return createPaginationResult(logs, limit, offset)
}