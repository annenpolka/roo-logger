import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { logActivityTool, getLogFilesTool, searchLogsTool } from '../../src/tools/mcp-tools'

describe('API互換性テスト', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'roo-logger-integration-'))
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:30:00.000Z'))
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('log_activity API互換性', () => {
    it('README.mdの例と同じ結果を返す', async () => {
      const input = {
        type: 'file_operation',
        summary: 'Inserted mermaid diagram into README.md',
        intention: 'To visually explain the flow of saving and retrieving activities',
        context: 'Improving documentation for Roo Activity Logger',
        logsDir: tempDir,
        level: 'info',
        details: {
          file: 'README.md',
          operation: 'insert_content',
          insertedLines: 'mermaid code block',
          position: 'after overview section'
        },
        parentId: '98280366-1de1-48e0-9914-b3a3409599b4'
      }

      const result = await logActivityTool(input)
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value).toMatchObject({
          success: true,
          logId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
          filePath: path.join(tempDir, 'roo-activity-2024-01-15.json')
        })
      }

      // ファイル内容がREADME.mdの例と一致することを確認
      const logFile = path.join(tempDir, 'roo-activity-2024-01-15.json')
      const content = await fs.readFile(logFile, 'utf-8')
      const logs = JSON.parse(content)
      
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        timestamp: '2024-01-15T10:30:00.000Z',
        type: 'file_operation',
        level: 'info',
        summary: 'Inserted mermaid diagram into README.md',
        details: {
          file: 'README.md',
          operation: 'insert_content',
          insertedLines: 'mermaid code block',
          position: 'after overview section'
        },
        intention: 'To visually explain the flow of saving and retrieving activities',
        context: 'Improving documentation for Roo Activity Logger',
        parentId: '98280366-1de1-48e0-9914-b3a3409599b4'
      })
    })

    it('必須フィールドのみの入力を処理する', async () => {
      const input = {
        type: 'command_execution',
        summary: 'Run npm command',
        intention: 'Update project dependencies',
        context: 'Preparing for new feature development',
        logsDir: tempDir
      }

      const result = await logActivityTool(input)
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value.success).toBe(true)
        expect(typeof result.value.logId).toBe('string')
        expect(result.value.filePath).toBe(path.join(tempDir, 'roo-activity-2024-01-15.json'))
      }
    })

    it('すべてのアクティビティタイプを処理する', async () => {
      const activityTypes = [
        'command_execution',
        'code_generation', 
        'file_operation',
        'error_encountered',
        'decision_made',
        'conversation'
      ] as const

      for (const type of activityTypes) {
        const input = {
          type,
          summary: `Test ${type}`,
          intention: 'Testing',
          context: 'Unit test',
          logsDir: tempDir
        }

        const result = await logActivityTool(input)
        expect(result.type).toBe('success')
      }
    })
  })

  describe('get_log_files API互換性', () => {
    beforeEach(async () => {
      // テスト用のログファイルを作成
      await fs.writeFile(path.join(tempDir, 'roo-activity-2024-01-10.json'), '[]')
      await fs.writeFile(path.join(tempDir, 'roo-activity-2024-01-15.json'), '[]')
      await fs.writeFile(path.join(tempDir, 'other-file.txt'), 'not a log file')
    })

    it('デフォルトパラメータで動作する', async () => {
      const result = await getLogFilesTool({ logsDir: tempDir })
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value).toMatchObject({
          files: expect.arrayContaining([
            expect.objectContaining({
              name: expect.stringMatching(/^roo-activity-\d{4}-\d{2}-\d{2}\.json$/),
              path: expect.stringContaining(tempDir),
              size: expect.any(Number),
              modifiedTime: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
            })
          ]),
          totalCount: 2,
          offset: 0,
          limit: 10
        })
      }
    })

    it('カスタムパラメータで動作する', async () => {
      const result = await getLogFilesTool({
        logsDir: tempDir,
        limit: 1,
        offset: 0,
        logFilePrefix: 'roo-activity-',
        logFileExtension: '.json',
        maxDepth: 3
      })
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value.files).toHaveLength(1)
        expect(result.value.limit).toBe(1)
        expect(result.value.offset).toBe(0)
      }
    })
  })

  describe('search_logs API互換性', () => {
    beforeEach(async () => {
      // テスト用のログデータを作成
      const logs = [
        {
          id: 'test-1',
          timestamp: '2024-01-10T10:00:00.000Z',
          type: 'command_execution',
          level: 'info',
          summary: 'npm test実行',
          intention: 'テスト実行',
          context: 'CI/CD'
        },
        {
          id: 'test-2',
          timestamp: '2024-01-15T14:30:00.000Z',
          type: 'file_operation',
          level: 'warn',
          summary: 'ファイル操作',
          intention: 'ファイル更新',
          context: 'バグ修正'
        }
      ]

      await fs.writeFile(
        path.join(tempDir, 'roo-activity-2024-01-15.json'),
        JSON.stringify(logs, null, 2)
      )
    })

    it('デフォルトパラメータで全検索する', async () => {
      const result = await searchLogsTool({ logsDir: tempDir })
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value).toMatchObject({
          logs: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
              type: expect.stringMatching(/^(command_execution|code_generation|file_operation|error_encountered|decision_made|conversation)$/),
              level: expect.stringMatching(/^(debug|info|warn|error)$/),
              summary: expect.any(String),
              intention: expect.any(String),
              context: expect.any(String)
            })
          ]),
          totalCount: 2,
          offset: 0,
          limit: 50
        })
      }
    })

    it('複数の検索条件を組み合わせる', async () => {
      const result = await searchLogsTool({
        logsDir: tempDir,
        type: 'command_execution',
        level: 'info',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        searchText: 'npm',
        limit: 10,
        offset: 0
      })
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value.logs).toHaveLength(1)
        expect(result.value.logs[0]).toMatchObject({
          id: 'test-1',
          type: 'command_execution',
          level: 'info'
        })
      }
    })

    it('マッチしない条件で空結果を返す', async () => {
      const result = await searchLogsTool({
        logsDir: tempDir,
        type: 'conversation'
      })
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value.logs).toHaveLength(0)
        expect(result.value.totalCount).toBe(0)
      }
    })
  })

  describe('エラーハンドリング互換性', () => {
    it('無効な入力に対して適切なエラーを返す', async () => {
      const invalidInput = {
        type: 'invalid_type',
        summary: '',
        intention: 'test',
        context: 'test',
        logsDir: 'relative/path'
      }

      const result = await logActivityTool(invalidInput)
      expect(result.type).toBe('failure')
      if (result.type === 'failure') {
        expect(result.error.message).toContain('無効な')
      }
    })

    it('存在しないディレクトリに対してエラーを返す', async () => {
      const result = await getLogFilesTool({ logsDir: '/non/existing/path' })
      expect(result.type).toBe('failure')
    })
  })

  describe('ファイル形式互換性', () => {
    it('日付ベースのファイル名を生成する', async () => {
      const input = {
        type: 'command_execution',
        summary: 'Test',
        intention: 'Test',
        context: 'Test',
        logsDir: tempDir
      }

      const result = await logActivityTool(input)
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value.filePath).toMatch(/roo-activity-\d{4}-\d{2}-\d{2}\.json$/)
      }
    })

    it('JSONファイルが正しい形式で保存される', async () => {
      const input = {
        type: 'file_operation',
        summary: 'Test file operation',
        intention: 'Testing',
        context: 'Unit test',
        logsDir: tempDir,
        details: { test: 'data' }
      }

      await logActivityTool(input)

      const logFile = path.join(tempDir, 'roo-activity-2024-01-15.json')
      const content = await fs.readFile(logFile, 'utf-8')
      
      // JSONとしてパースできることを確認
      expect(() => JSON.parse(content)).not.toThrow()
      
      const logs = JSON.parse(content)
      expect(Array.isArray(logs)).toBe(true)
      expect(logs).toHaveLength(1)
    })
  })
})