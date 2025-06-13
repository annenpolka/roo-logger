import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  createActivityLog,
  generateId,
  generateTimestamp
} from '../../../src/functions/log-entry'
import { ActivityLogInput } from '../../../src/functions/validation'

describe('ログエントリ生成関数', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))
  })

  describe('generateId', () => {
    it('UUIDv4形式のIDを生成する', () => {
      const id = generateId()
      
      expect(typeof id).toBe('string')
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('呼び出すたびに異なるIDを生成する', () => {
      const id1 = generateId()
      const id2 = generateId()
      
      expect(id1).not.toBe(id2)
    })
  })

  describe('generateTimestamp', () => {
    it('ISO 8601形式のタイムスタンプを生成する', () => {
      const timestamp = generateTimestamp()
      
      expect(timestamp).toBe('2024-01-01T12:00:00.000Z')
    })
  })

  describe('createActivityLog', () => {
    const baseInput: ActivityLogInput = {
      type: 'command_execution',
      summary: 'Test summary',
      intention: 'Test intention',
      context: 'Test context',
      logsDir: '/absolute/path/to/logs'
    }

    it('必須フィールドのみでログエントリを作成する', () => {
      const log = createActivityLog(baseInput)
      
      expect(log.type).toBe('command_execution')
      expect(log.summary).toBe('Test summary')
      expect(log.intention).toBe('Test intention')
      expect(log.context).toBe('Test context')
      expect(log.level).toBe('info') // デフォルト値
      expect(log.timestamp).toBe('2024-01-01T12:00:00.000Z')
      expect(typeof log.id).toBe('string')
      expect(log.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('オプションフィールドを含むログエントリを作成する', () => {
      const inputWithOptions: ActivityLogInput = {
        ...baseInput,
        level: 'warn',
        details: { command: 'npm test', exitCode: 0 },
        parentId: 'parent-123',
        sequence: 5,
        relatedIds: ['rel-1', 'rel-2']
      }
      
      const log = createActivityLog(inputWithOptions)
      
      expect(log.level).toBe('warn')
      expect(log.details).toEqual({ command: 'npm test', exitCode: 0 })
      expect(log.parentId).toBe('parent-123')
      expect(log.sequence).toBe(5)
      expect(log.relatedIds).toEqual(['rel-1', 'rel-2'])
    })

    it('immutableなオブジェクトを返す（readonly）', () => {
      const log = createActivityLog(baseInput)
      
      // TypeScriptレベルでreadonlyがチェックされるため、
      // ランタイムでの変更テストは難しいが、構造をチェック
      expect(Object.isFrozen(log)).toBe(true)
    })

    it('同じ入力で呼び出すたびに異なるIDとタイムスタンプを持つログを生成する', () => {
      const log1 = createActivityLog(baseInput)
      
      vi.advanceTimersByTime(1000) // 1秒進める
      
      const log2 = createActivityLog(baseInput)
      
      expect(log1.id).not.toBe(log2.id)
      expect(log1.timestamp).not.toBe(log2.timestamp)
      expect(log2.timestamp).toBe('2024-01-01T12:00:01.000Z')
    })

    it('undefinedのオプションフィールドは結果に含まれない', () => {
      const log = createActivityLog(baseInput)
      
      expect('details' in log).toBe(false)
      expect('parentId' in log).toBe(false)
      expect('sequence' in log).toBe(false)
      expect('relatedIds' in log).toBe(false)
    })
  })
})