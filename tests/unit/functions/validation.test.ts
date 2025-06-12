import { describe, it, expect } from 'vitest'
import { 
  validateAbsolutePath,
  validateRequiredString,
  validateActivityLogInput,
  ValidationError
} from '../../../src/functions/validation'
import { Result } from 'neverthrow'

describe('バリデーション関数', () => {
  describe('validateAbsolutePath', () => {
    it('有効な絶対パスでSuccessを返す', () => {
      const result = validateAbsolutePath('/absolute/path/to/logs')
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBe('/absolute/path/to/logs')
      }
    })

    it('相対パスでFailureを返す', () => {
      const result = validateAbsolutePath('relative/path')
      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError)
        expect(result.error.message).toContain('絶対パス')
      }
    })

    it('空文字でFailureを返す', () => {
      const result = validateAbsolutePath('')
      expect(result.isErr()).toBe(true)
    })

    it('nullやundefinedでFailureを返す', () => {
      const result1 = validateAbsolutePath(null as any)
      const result2 = validateAbsolutePath(undefined as any)
      expect(result1.isErr()).toBe(true)
      expect(result2.isErr()).toBe(true)
    })
  })

  describe('validateRequiredString', () => {
    it('有効な文字列でSuccessを返す', () => {
      const result = validateRequiredString('test string', 'field')
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBe('test string')
      }
    })

    it('空文字でFailureを返す', () => {
      const result = validateRequiredString('', 'field')
      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError)
        expect(result.error.message).toContain('field')
      }
    })

    it('空白のみの文字列でFailureを返す', () => {
      const result = validateRequiredString('   ', 'field')
      expect(result.isErr()).toBe(true)
    })

    it('nullやundefinedでFailureを返す', () => {
      const result1 = validateRequiredString(null as any, 'field')
      const result2 = validateRequiredString(undefined as any, 'field')
      expect(result1.isErr()).toBe(true)
      expect(result2.isErr()).toBe(true)
    })
  })

  describe('validateActivityLogInput', () => {
    const validInput = {
      type: 'command_execution' as const,
      summary: 'Test summary',
      intention: 'Test intention',
      context: 'Test context',
      logsDir: '/absolute/path/to/logs'
    }

    it('有効な入力でSuccessを返す', () => {
      const result = validateActivityLogInput(validInput)
      expect(result.isOk()).toBe(true)
    })

    it('必須フィールド不足でFailureを返す', () => {
      const invalidInput = { ...validInput }
      delete (invalidInput as any).summary
      
      const result = validateActivityLogInput(invalidInput)
      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError)
        expect(result.error.message).toContain('summary')
      }
    })

    it('無効なアクティビティタイプでFailureを返す', () => {
      const invalidInput = { ...validInput, type: 'invalid_type' as any }
      
      const result = validateActivityLogInput(invalidInput)
      expect(result.isErr()).toBe(true)
    })

    it('相対パスのlogsDirでFailureを返す', () => {
      const invalidInput = { ...validInput, logsDir: 'relative/path' }
      
      const result = validateActivityLogInput(invalidInput)
      expect(result.isErr()).toBe(true)
    })

    it('オプションフィールドを含む有効な入力でSuccessを返す', () => {
      const inputWithOptions = {
        ...validInput,
        level: 'warn' as const,
        details: { command: 'npm test' },
        parentId: 'parent-123',
        sequence: 5,
        relatedIds: ['rel-1', 'rel-2']
      }
      
      const result = validateActivityLogInput(inputWithOptions)
      expect(result.isOk()).toBe(true)
    })
  })
})