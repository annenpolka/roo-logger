import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { TypedMCPHandlers } from '../../../src/handlers/tool-handlers.js'

describe('TypedMCPHandlers', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'roo-logger-test-'))
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('handleLogActivity', () => {
    it('有効な入力で成功レスポンスを返す', async () => {
      const validInput = {
        type: 'command_execution',
        summary: 'テストコマンド',
        intention: 'テスト実行',
        context: 'ユニットテスト',
        logsDir: tempDir
      }

      const result = await TypedMCPHandlers.handleLogActivity(validInput)
      
      expect(result.isError).toBeFalsy()
      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      
      const responseData = JSON.parse(result.content[0].text)
      expect(responseData.success).toBe(true)
      expect(responseData.logId).toBeDefined()
    })

    it('無効な入力でエラーレスポンスを返す', async () => {
      const invalidInput = {
        type: 'invalid_type',
        summary: '',
        intention: 'test',
        context: 'test',
        logsDir: 'relative/path'
      }

      const result = await TypedMCPHandlers.handleLogActivity(invalidInput)
      
      expect(result.isError).toBe(true)
      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      
      const responseData = JSON.parse(result.content[0].text)
      expect(responseData.error).toContain('Invalid arguments for log_activity')
    })

    it('必須フィールド不足でエラーレスポンスを返す', async () => {
      const incompleteInput = {
        type: 'command_execution',
        summary: 'test'
        // intention, context, logsDir が不足
      }

      const result = await TypedMCPHandlers.handleLogActivity(incompleteInput)
      
      expect(result.isError).toBe(true)
      const responseData = JSON.parse(result.content[0].text)
      expect(responseData.error).toContain('Invalid arguments for log_activity')
    })
  })

  describe('handleGetLogFiles', () => {
    it('有効な入力で成功レスポンスを返す', async () => {
      const validInput = {
        logsDir: tempDir,
        limit: 10
      }

      const result = await TypedMCPHandlers.handleGetLogFiles(validInput)
      
      expect(result.isError).toBeFalsy()
      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      
      const responseData = JSON.parse(result.content[0].text)
      expect(responseData.files).toBeDefined()
      expect(responseData.totalCount).toBeDefined()
    })

    it('無効なlimitでエラーレスポンスを返す', async () => {
      const invalidInput = {
        logsDir: tempDir,
        limit: -1 // 無効な値
      }

      const result = await TypedMCPHandlers.handleGetLogFiles(invalidInput)
      
      expect(result.isError).toBe(true)
      const responseData = JSON.parse(result.content[0].text)
      expect(responseData.error).toContain('Invalid arguments for get_log_files')
    })
  })

  describe('handleSearchLogs', () => {
    it('有効な入力で成功レスポンスを返す', async () => {
      const validInput = {
        logsDir: tempDir,
        type: 'command_execution',
        limit: 50
      }

      const result = await TypedMCPHandlers.handleSearchLogs(validInput)
      
      expect(result.isError).toBeFalsy()
      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      
      const responseData = JSON.parse(result.content[0].text)
      expect(responseData.logs).toBeDefined()
      expect(responseData.totalCount).toBeDefined()
    })

    it('無効なtypeでエラーレスポンスを返す', async () => {
      const invalidInput = {
        logsDir: tempDir,
        type: 'invalid_activity_type'
      }

      const result = await TypedMCPHandlers.handleSearchLogs(invalidInput)
      
      expect(result.isError).toBe(true)
      const responseData = JSON.parse(result.content[0].text)
      expect(responseData.error).toContain('Invalid arguments for search_logs')
    })
  })

  describe('handleToolRequest', () => {
    it('正しいツール名でルーティングする', async () => {
      const validInput = {
        type: 'command_execution',
        summary: 'テスト',
        intention: 'テスト',
        context: 'テスト',
        logsDir: tempDir
      }

      const result = await TypedMCPHandlers.handleToolRequest('log_activity', validInput)
      
      expect(result.isError).toBeFalsy()
      const responseData = JSON.parse(result.content[0].text)
      expect(responseData.success).toBe(true)
    })

    it('未知のツール名でエラーレスポンスを返す', async () => {
      const result = await TypedMCPHandlers.handleToolRequest('unknown_tool', {})
      
      expect(result.isError).toBe(true)
      const responseData = JSON.parse(result.content[0].text)
      expect(responseData.error).toBe('Unknown tool: unknown_tool')
    })
  })
})