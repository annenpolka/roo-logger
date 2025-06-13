import { describe, it, expect } from 'vitest'
import { Result, success, failure, isSuccess, isFailure } from '../../../src/types/result'

describe('Result型', () => {
  describe('success', () => {
    it('成功値をラップしたResultを作成する', () => {
      const result = success('test value')
      
      expect(result.type).toBe('success')
      expect(result.value).toBe('test value')
    })
  })

  describe('failure', () => {
    it('エラーをラップしたResultを作成する', () => {
      const error = new Error('test error')
      const result = failure(error)
      
      expect(result.type).toBe('failure')
      expect(result.error).toBe(error)
    })
  })

  describe('isSuccess', () => {
    it('成功のResultでtrueを返す', () => {
      const result = success('test')
      expect(isSuccess(result)).toBe(true)
    })

    it('失敗のResultでfalseを返す', () => {
      const result = failure(new Error('test'))
      expect(isSuccess(result)).toBe(false)
    })
  })

  describe('isFailure', () => {
    it('失敗のResultでtrueを返す', () => {
      const result = failure(new Error('test'))
      expect(isFailure(result)).toBe(true)
    })

    it('成功のResultでfalseを返す', () => {
      const result = success('test')
      expect(isFailure(result)).toBe(false)
    })
  })
})