import { describe, it, expect } from 'vitest'
import {
  applyPagination,
  createPaginationResult,
  paginateActivityLogs
} from '../../../src/functions/pagination.js'
import { ActivityLog } from '../../../src/types/core.js'

const createMockLog = (id: string): ActivityLog => ({
  id,
  timestamp: '2023-12-01T10:00:00.000Z',
  type: 'command_execution',
  level: 'info',
  summary: `Test log ${id}`,
  intention: 'Testing purpose',
  context: 'Unit test context'
})

describe('Pagination Functions', () => {
  describe('applyPagination', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

    it('should return correct slice for first page', () => {
      const result = applyPagination(items, 3, 0)
      expect(result).toEqual([1, 2, 3])
    })

    it('should return correct slice for middle page', () => {
      const result = applyPagination(items, 3, 3)
      expect(result).toEqual([4, 5, 6])
    })

    it('should return correct slice for last page with partial items', () => {
      const result = applyPagination(items, 3, 9)
      expect(result).toEqual([10])
    })

    it('should return empty array when offset is beyond items length', () => {
      const result = applyPagination(items, 3, 15)
      expect(result).toEqual([])
    })

    it('should handle empty array', () => {
      const result = applyPagination([], 5, 0)
      expect(result).toEqual([])
    })

    it('should handle limit larger than array size', () => {
      const result = applyPagination(items, 20, 0)
      expect(result).toEqual(items)
    })
  })

  describe('createPaginationResult', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

    it('should create correct pagination result for first page', () => {
      const result = createPaginationResult(items, 3, 0)
      expect(result).toEqual({
        items: ['a', 'b', 'c'],
        totalCount: 8,
        offset: 0,
        limit: 3,
        hasMore: true
      })
    })

    it('should create correct pagination result for middle page', () => {
      const result = createPaginationResult(items, 3, 3)
      expect(result).toEqual({
        items: ['d', 'e', 'f'],
        totalCount: 8,
        offset: 3,
        limit: 3,
        hasMore: true
      })
    })

    it('should create correct pagination result for last page', () => {
      const result = createPaginationResult(items, 3, 6)
      expect(result).toEqual({
        items: ['g', 'h'],
        totalCount: 8,
        offset: 6,
        limit: 3,
        hasMore: false
      })
    })

    it('should handle empty items array', () => {
      const result = createPaginationResult([], 5, 0)
      expect(result).toEqual({
        items: [],
        totalCount: 0,
        offset: 0,
        limit: 5,
        hasMore: false
      })
    })

    it('should handle offset beyond items length', () => {
      const result = createPaginationResult(items, 3, 10)
      expect(result).toEqual({
        items: [],
        totalCount: 8,
        offset: 10,
        limit: 3,
        hasMore: false
      })
    })
  })

  describe('paginateActivityLogs', () => {
    const logs = [
      createMockLog('1'),
      createMockLog('2'),
      createMockLog('3'),
      createMockLog('4'),
      createMockLog('5')
    ]

    it('should paginate activity logs correctly', () => {
      const result = paginateActivityLogs(logs, 2, 1)
      expect(result.items).toHaveLength(2)
      expect(result.items[0].id).toBe('2')
      expect(result.items[1].id).toBe('3')
      expect(result.totalCount).toBe(5)
      expect(result.offset).toBe(1)
      expect(result.limit).toBe(2)
      expect(result.hasMore).toBe(true)
    })

    it('should handle last page correctly', () => {
      const result = paginateActivityLogs(logs, 3, 3)
      expect(result.items).toHaveLength(2)
      expect(result.items[0].id).toBe('4')
      expect(result.items[1].id).toBe('5')
      expect(result.hasMore).toBe(false)
    })

    it('should handle empty logs array', () => {
      const result = paginateActivityLogs([], 10, 0)
      expect(result.items).toHaveLength(0)
      expect(result.totalCount).toBe(0)
      expect(result.hasMore).toBe(false)
    })
  })
})