import { describe, it, expect } from 'vitest'
import { 
  ActivityType, 
  LogLevel, 
  ActivityLog,
  ACTIVITY_TYPES,
  LOG_LEVELS,
  isValidActivityType,
  isValidLogLevel
} from '../../../src/types/core'

describe('コア型定義', () => {
  describe('ACTIVITY_TYPES定数', () => {
    it('6種類のアクティビティタイプを含む', () => {
      expect(ACTIVITY_TYPES).toEqual([
        'command_execution',
        'code_generation', 
        'file_operation',
        'error_encountered',
        'decision_made',
        'conversation'
      ])
    })
  })

  describe('LOG_LEVELS定数', () => {
    it('4種類のログレベルを含む', () => {
      expect(LOG_LEVELS).toEqual([
        'debug',
        'info', 
        'warn',
        'error'
      ])
    })
  })

  describe('isValidActivityType', () => {
    it('有効なアクティビティタイプでtrueを返す', () => {
      expect(isValidActivityType('command_execution')).toBe(true)
      expect(isValidActivityType('code_generation')).toBe(true)
      expect(isValidActivityType('file_operation')).toBe(true)
      expect(isValidActivityType('error_encountered')).toBe(true)
      expect(isValidActivityType('decision_made')).toBe(true)
      expect(isValidActivityType('conversation')).toBe(true)
    })

    it('無効なアクティビティタイプでfalseを返す', () => {
      expect(isValidActivityType('invalid_type')).toBe(false)
      expect(isValidActivityType('')).toBe(false)
      expect(isValidActivityType(null as any)).toBe(false)
    })
  })

  describe('isValidLogLevel', () => {
    it('有効なログレベルでtrueを返す', () => {
      expect(isValidLogLevel('debug')).toBe(true)
      expect(isValidLogLevel('info')).toBe(true)
      expect(isValidLogLevel('warn')).toBe(true)
      expect(isValidLogLevel('error')).toBe(true)
    })

    it('無効なログレベルでfalseを返す', () => {
      expect(isValidLogLevel('invalid_level')).toBe(false)
      expect(isValidLogLevel('')).toBe(false)
      expect(isValidLogLevel(null as any)).toBe(false)
    })
  })

  describe('ActivityLog型', () => {
    it('必須フィールドを持つログエントリを受け入れる', () => {
      const log: ActivityLog = {
        id: 'test-id',
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'command_execution',
        level: 'info',
        summary: 'Test summary',
        intention: 'Test intention',
        context: 'Test context'
      }
      
      expect(log.id).toBe('test-id')
      expect(log.type).toBe('command_execution')
      expect(log.level).toBe('info')
    })

    it('オプションフィールドを持つログエントリを受け入れる', () => {
      const log: ActivityLog = {
        id: 'test-id',
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'file_operation',
        level: 'info',
        summary: 'Test summary',
        intention: 'Test intention',
        context: 'Test context',
        details: { file: 'test.txt' },
        parentId: 'parent-id',
        sequence: 1,
        relatedIds: ['related-1', 'related-2']
      }
      
      expect(log.details).toEqual({ file: 'test.txt' })
      expect(log.parentId).toBe('parent-id')
      expect(log.sequence).toBe(1)
      expect(log.relatedIds).toEqual(['related-1', 'related-2'])
    })
  })
})