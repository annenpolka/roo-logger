import { describe, it, expect } from 'vitest'
import { ok, err } from 'neverthrow'

describe('neverthrow Result型', () => {
  describe('ok', () => {
    it('成功値をラップしたResultを作成する', () => {
      const result = ok('test value')
      
      expect(result.isOk()).toBe(true)
      expect(result.value).toBe('test value')
    })
  })

  describe('err', () => {
    it('エラーをラップしたResultを作成する', () => {
      const error = new Error('test error')
      const result = err(error)
      
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe(error)
    })
  })

  describe('isOk', () => {
    it('成功のResultでtrueを返す', () => {
      const result = ok('test')
      expect(result.isOk()).toBe(true)
    })

    it('失敗のResultでfalseを返す', () => {
      const result = err(new Error('test'))
      expect(result.isOk()).toBe(false)
    })
  })

  describe('isErr', () => {
    it('失敗のResultでtrueを返す', () => {
      const result = err(new Error('test'))
      expect(result.isErr()).toBe(true)
    })

    it('成功のResultでfalseを返す', () => {
      const result = ok('test')
      expect(result.isErr()).toBe(false)
    })
  })
})