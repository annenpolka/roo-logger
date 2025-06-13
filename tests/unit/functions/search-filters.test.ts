import { describe, it, expect } from 'vitest'
import {
  matchesActivityType,
  matchesLogLevel,
  matchesDateRange,
  matchesSearchText,
  matchesParent,
  matchesSequenceRange,
  matchesRelatedIds,
  applyFilters
} from '../../../src/functions/search-filters.js'
import { ActivityLog } from '../../../src/types/core.js'

const createMockLog = (overrides: Partial<ActivityLog> = {}): ActivityLog => ({
  id: 'test-id',
  timestamp: '2023-12-01T10:00:00.000Z',
  type: 'command_execution',
  level: 'info',
  summary: 'Test log entry',
  intention: 'Testing purpose',
  context: 'Unit test context',
  ...overrides
})

describe('Search Filters', () => {
  describe('matchesActivityType', () => {
    const log = createMockLog({ type: 'code_generation' })

    it('should match when type is undefined', () => {
      expect(matchesActivityType(log, undefined)).toBe(true)
    })

    it('should match when types are equal', () => {
      expect(matchesActivityType(log, 'code_generation')).toBe(true)
    })

    it('should not match when types are different', () => {
      expect(matchesActivityType(log, 'command_execution')).toBe(false)
    })
  })

  describe('matchesLogLevel', () => {
    const log = createMockLog({ level: 'warn' })

    it('should match when level is undefined', () => {
      expect(matchesLogLevel(log, undefined)).toBe(true)
    })

    it('should match when levels are equal', () => {
      expect(matchesLogLevel(log, 'warn')).toBe(true)
    })

    it('should not match when levels are different', () => {
      expect(matchesLogLevel(log, 'error')).toBe(false)
    })
  })

  describe('matchesDateRange', () => {
    const log = createMockLog({ timestamp: '2023-12-15T12:00:00.000Z' })

    it('should match when no date range is specified', () => {
      expect(matchesDateRange(log)).toBe(true)
      expect(matchesDateRange(log, undefined, undefined)).toBe(true)
    })

    it('should match when within date range', () => {
      expect(matchesDateRange(log, '2023-12-01', '2023-12-31')).toBe(true)
    })

    it('should not match when before start date', () => {
      expect(matchesDateRange(log, '2023-12-20', undefined)).toBe(false)
    })

    it('should not match when after end date', () => {
      expect(matchesDateRange(log, undefined, '2023-12-10')).toBe(false)
    })

    it('should handle invalid dates gracefully', () => {
      expect(matchesDateRange(log, 'invalid-date', undefined)).toBe(false)
      expect(matchesDateRange(log, undefined, 'invalid-date')).toBe(false)
    })
  })

  describe('matchesSearchText', () => {
    const log = createMockLog({
      summary: 'Execute command',
      intention: 'Test automation',
      context: 'CI/CD pipeline',
      details: { command: 'npm test', exitCode: 0 }
    })

    it('should match when searchText is undefined', () => {
      expect(matchesSearchText(log, undefined)).toBe(true)
    })

    it('should match text in summary', () => {
      expect(matchesSearchText(log, 'execute')).toBe(true)
      expect(matchesSearchText(log, 'EXECUTE')).toBe(true) // case insensitive
    })

    it('should match text in intention', () => {
      expect(matchesSearchText(log, 'automation')).toBe(true)
    })

    it('should match text in context', () => {
      expect(matchesSearchText(log, 'pipeline')).toBe(true)
    })

    it('should match text in details', () => {
      expect(matchesSearchText(log, 'npm')).toBe(true)
      expect(matchesSearchText(log, 'exitCode')).toBe(true)
    })

    it('should not match when text is not found', () => {
      expect(matchesSearchText(log, 'nonexistent')).toBe(false)
    })
  })

  describe('matchesParent', () => {
    const log = createMockLog({ parentId: 'parent-123' })

    it('should match when parentId is undefined', () => {
      expect(matchesParent(log, undefined)).toBe(true)
    })

    it('should match when parentIds are equal', () => {
      expect(matchesParent(log, 'parent-123')).toBe(true)
    })

    it('should not match when parentIds are different', () => {
      expect(matchesParent(log, 'parent-456')).toBe(false)
    })

    it('should handle logs without parentId', () => {
      const logWithoutParent = createMockLog({ parentId: undefined })
      expect(matchesParent(logWithoutParent, 'parent-123')).toBe(false)
      expect(matchesParent(logWithoutParent, undefined)).toBe(true)
    })
  })

  describe('matchesSequenceRange', () => {
    const log = createMockLog({ sequence: 5 })

    it('should match when no sequence range is specified', () => {
      expect(matchesSequenceRange(log, undefined, undefined)).toBe(true)
    })

    it('should match when within sequence range', () => {
      expect(matchesSequenceRange(log, 1, 10)).toBe(true)
      expect(matchesSequenceRange(log, 5, 5)).toBe(true)
    })

    it('should not match when below sequence range', () => {
      expect(matchesSequenceRange(log, 6, 10)).toBe(false)
    })

    it('should not match when above sequence range', () => {
      expect(matchesSequenceRange(log, 1, 4)).toBe(false)
    })

    it('should handle logs without sequence', () => {
      const logWithoutSequence = createMockLog({ sequence: undefined })
      expect(matchesSequenceRange(logWithoutSequence, undefined, undefined)).toBe(true)
      expect(matchesSequenceRange(logWithoutSequence, 1, 10)).toBe(false)
    })
  })

  describe('matchesRelatedIds', () => {
    const log = createMockLog({ relatedIds: ['id1', 'id2', 'id3'] })

    it('should match when no related IDs are specified', () => {
      expect(matchesRelatedIds(log, undefined, undefined)).toBe(true)
    })

    it('should match when relatedId is found', () => {
      expect(matchesRelatedIds(log, 'id2', undefined)).toBe(true)
    })

    it('should not match when relatedId is not found', () => {
      expect(matchesRelatedIds(log, 'id4', undefined)).toBe(false)
    })

    it('should match when any of relatedIds is found', () => {
      expect(matchesRelatedIds(log, undefined, ['id1', 'id4'])).toBe(true)
      expect(matchesRelatedIds(log, undefined, ['id4', 'id5'])).toBe(false)
    })

    it('should handle logs without relatedIds', () => {
      const logWithoutRelated = createMockLog({ relatedIds: undefined })
      expect(matchesRelatedIds(logWithoutRelated, undefined, undefined)).toBe(true)
      expect(matchesRelatedIds(logWithoutRelated, 'id1', undefined)).toBe(false)
    })

    it('should handle logs with empty relatedIds', () => {
      const logWithEmptyRelated = createMockLog({ relatedIds: [] })
      expect(matchesRelatedIds(logWithEmptyRelated, undefined, undefined)).toBe(true)
      expect(matchesRelatedIds(logWithEmptyRelated, 'id1', undefined)).toBe(false)
    })
  })

  describe('applyFilters', () => {
    const logs = [
      createMockLog({
        id: '1',
        type: 'command_execution',
        level: 'info',
        summary: 'Execute npm test',
        timestamp: '2023-12-01T10:00:00.000Z',
        sequence: 1,
        parentId: 'parent-1',
        relatedIds: ['rel-1', 'rel-2']
      }),
      createMockLog({
        id: '2',
        type: 'code_generation',
        level: 'warn',
        summary: 'Generate component',
        timestamp: '2023-12-02T10:00:00.000Z',
        sequence: 2,
        parentId: 'parent-2',
        relatedIds: ['rel-2', 'rel-3']
      }),
      createMockLog({
        id: '3',
        type: 'error_encountered',
        level: 'error',
        summary: 'Compilation failed',
        timestamp: '2023-12-03T10:00:00.000Z',
        sequence: 3
      })
    ]

    it('should return all logs when no filters are applied', () => {
      const result = applyFilters(logs, {})
      expect(result).toHaveLength(3)
    })

    it('should filter by type', () => {
      const result = applyFilters(logs, { type: 'command_execution' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should filter by multiple criteria', () => {
      const result = applyFilters(logs, {
        level: 'warn',
        type: 'code_generation'
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })

    it('should return empty array when no logs match', () => {
      const result = applyFilters(logs, {
        type: 'command_execution',
        level: 'error'
      })
      expect(result).toHaveLength(0)
    })

    it('should filter by search text', () => {
      const result = applyFilters(logs, { searchText: 'npm' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should filter by date range', () => {
      const result = applyFilters(logs, {
        startDate: '2023-12-02',
        endDate: '2023-12-02'
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })
  })
})