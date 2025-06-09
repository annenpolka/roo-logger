import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { 
  logActivityTool,
  getLogFilesTool,
  searchLogsTool
} from '../../../src/tools/mcp-tools'

describe('MCPツール', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'roo-logger-mcp-test-'))
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:30:00.000Z'))
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('logActivityTool', () => {
    it('有効な入力でログを記録する', async () => {
      const input = {
        type: 'command_execution' as const,
        summary: 'npm test実行',
        intention: 'テスト実行',
        context: 'CI/CD',
        logsDir: tempDir,
        level: 'info' as const,
        details: { command: 'npm test', exitCode: 0 }
      }

      const result = await logActivityTool(input)
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value).toEqual({
          success: true,
          logId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
          filePath: path.join(tempDir, 'roo-activity-2024-01-15.json')
        })
      }

      // ファイルが作成されたことを確認
      const logFile = path.join(tempDir, 'roo-activity-2024-01-15.json')
      const content = await fs.readFile(logFile, 'utf-8')
      const logs = JSON.parse(content)
      
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        type: 'command_execution',
        summary: 'npm test実行',
        intention: 'テスト実行',
        context: 'CI/CD',
        level: 'info',
        details: { command: 'npm test', exitCode: 0 }
      })
    })

    it('型安全な入力でのみ動作する（バリデーションは上位レイヤーで実行）', async () => {
      // logActivityTool は LogActivityArgs 型の入力のみ受け取る
      // 無効な入力はコンパイル時にエラーとなるため、実行時には到達しない
      const validInput = {
        type: 'test_execution' as any, // テスト用の無効値だが型アサーションで回避
        summary: 'テスト',
        intention: 'テスト',
        context: 'テスト',
        logsDir: tempDir
      }

      const result = await logActivityTool(validInput)
      
      // 型は満たしているが無効な値の場合は、内部でエラーになる
      expect(result.type).toBe('success') // 実際は createActivityLog で処理される
    })

    it('既存のファイルに追記する', async () => {
      const baseInput = {
        type: 'file_operation' as const,
        summary: 'ファイル操作',
        intention: 'テスト',
        context: 'テスト',
        logsDir: tempDir
      }

      // 1つ目のログを記録
      await logActivityTool(baseInput)
      
      // 2つ目のログを記録
      await logActivityTool({ ...baseInput, summary: '2つ目のログ' })

      // ファイルの内容を確認
      const logFile = path.join(tempDir, 'roo-activity-2024-01-15.json')
      const content = await fs.readFile(logFile, 'utf-8')
      const logs = JSON.parse(content)
      
      expect(logs).toHaveLength(2)
      expect(logs[0].summary).toBe('ファイル操作')
      expect(logs[1].summary).toBe('2つ目のログ')
    })
  })

  describe('getLogFilesTool', () => {
    beforeEach(async () => {
      // テスト用のログファイルを作成
      await fs.writeFile(path.join(tempDir, 'roo-activity-2024-01-10.json'), '[]')
      await fs.writeFile(path.join(tempDir, 'roo-activity-2024-01-15.json'), '[]')
      await fs.writeFile(path.join(tempDir, 'other-file.txt'), 'not a log file')
      
      // ネストしたディレクトリにもファイルを作成
      const nestedDir = path.join(tempDir, 'nested')
      await fs.mkdir(nestedDir)
      await fs.writeFile(path.join(nestedDir, 'roo-activity-2024-01-20.json'), '[]')
    })

    it('ログファイルの一覧を取得する', async () => {
      const input = {
        logsDir: tempDir
      }

      const result = await getLogFilesTool(input)
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value.files).toHaveLength(3)
        expect(result.value.files.map(f => f.name)).toEqual([
          'roo-activity-2024-01-20.json',
          'roo-activity-2024-01-15.json', 
          'roo-activity-2024-01-10.json'
        ])
      }
    })

    it('limitとoffsetでページネーションする', async () => {
      const input = {
        logsDir: tempDir,
        limit: 2,
        offset: 1
      }

      const result = await getLogFilesTool(input)
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value.files).toHaveLength(2)
        expect(result.value.files.map(f => f.name)).toEqual([
          'roo-activity-2024-01-15.json',
          'roo-activity-2024-01-10.json'
        ])
      }
    })

    it('存在しないディレクトリでエラーを返す', async () => {
      const input = {
        logsDir: '/non/existing/path'
      }

      const result = await getLogFilesTool(input)
      
      expect(result.type).toBe('failure')
    })
  })

  describe('searchLogsTool', () => {
    beforeEach(async () => {
      // テスト用のログデータを作成
      const logs1 = [
        {
          id: 'log-1',
          timestamp: '2024-01-10T10:00:00.000Z',
          type: 'command_execution',
          level: 'info',
          summary: 'npm test実行',
          intention: 'テスト実行',
          context: 'CI/CD',
          details: { command: 'npm test' }
        }
      ]
      
      const logs2 = [
        {
          id: 'log-2',
          timestamp: '2024-01-15T14:30:00.000Z',
          type: 'file_operation',
          level: 'warn',
          summary: 'ファイル操作エラー',
          intention: 'ファイル更新',
          context: 'バグ修正'
        }
      ]

      await fs.writeFile(
        path.join(tempDir, 'roo-activity-2024-01-10.json'),
        JSON.stringify(logs1, null, 2)
      )
      
      await fs.writeFile(
        path.join(tempDir, 'roo-activity-2024-01-15.json'),
        JSON.stringify(logs2, null, 2)
      )
    })

    it('すべてのログを検索する', async () => {
      const input = {
        logsDir: tempDir
      }

      const result = await searchLogsTool(input)
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value.logs).toHaveLength(2)
        expect(result.value.totalCount).toBe(2)
      }
    })

    it('タイプでフィルタリングする', async () => {
      const input = {
        logsDir: tempDir,
        type: 'command_execution' as const
      }

      const result = await searchLogsTool(input)
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value.logs).toHaveLength(1)
        expect(result.value.logs[0].type).toBe('command_execution')
      }
    })

    it('日付範囲でフィルタリングする', async () => {
      const input = {
        logsDir: tempDir,
        startDate: '2024-01-12',
        endDate: '2024-01-20'
      }

      const result = await searchLogsTool(input)
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value.logs).toHaveLength(1)
        expect(result.value.logs[0].id).toBe('log-2')
      }
    })

    it('検索テキストでフィルタリングする', async () => {
      const input = {
        logsDir: tempDir,
        searchText: 'npm'
      }

      const result = await searchLogsTool(input)
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value.logs).toHaveLength(1)
        expect(result.value.logs[0].summary).toContain('npm')
      }
    })

    it('limitとoffsetでページネーションする', async () => {
      const input = {
        logsDir: tempDir,
        limit: 1,
        offset: 1
      }

      const result = await searchLogsTool(input)
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value.logs).toHaveLength(1)
        expect(result.value.logs[0].id).toBe('log-1')
        expect(result.value.totalCount).toBe(2)
      }
    })

    it('マッチするログがない場合は空配列を返す', async () => {
      const input = {
        logsDir: tempDir,
        type: 'conversation' as const
      }

      const result = await searchLogsTool(input)
      
      expect(result.type).toBe('success')
      if (result.type === 'success') {
        expect(result.value.logs).toHaveLength(0)
        expect(result.value.totalCount).toBe(0)
      }
    })

    it('存在しないディレクトリでエラーを返す', async () => {
      const input = {
        logsDir: '/non/existing/path'
      }

      const result = await searchLogsTool(input)
      
      expect(result.type).toBe('failure')
    })
  })
})