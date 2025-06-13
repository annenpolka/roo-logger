import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { 
  generateLogFileName,
  ensureDirectoryExists,
  readJsonFile,
  appendToJsonFile,
  fileExists
} from '../../../src/functions/file-io'
import { ActivityLog } from '../../../src/types/core'

describe('ファイルI/O関数', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'roo-logger-test-'))
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-15T10:30:00.000Z'))
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('generateLogFileName', () => {
    it('デフォルトの形式でファイル名を生成する', () => {
      const fileName = generateLogFileName()
      expect(fileName).toBe('roo-activity-2024-03-15.json')
    })

    it('指定した日付でファイル名を生成する', () => {
      const date = new Date('2023-12-25T15:45:30.123Z')
      const fileName = generateLogFileName(date)
      expect(fileName).toBe('roo-activity-2023-12-25.json')
    })

    it('カスタムプレフィックスとサフィックスでファイル名を生成する', () => {
      const fileName = generateLogFileName(undefined, 'custom-prefix-', '.log')
      expect(fileName).toBe('custom-prefix-2024-03-15.log')
    })
  })

  describe('fileExists', () => {
    it('存在するファイルでtrueを返す', async () => {
      const filePath = path.join(tempDir, 'existing-file.json')
      await fs.writeFile(filePath, '{}')
      
      const result = await fileExists(filePath)
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBe(true)
      }
    })

    it('存在しないファイルでfalseを返す', async () => {
      const filePath = path.join(tempDir, 'non-existing-file.json')
      
      const result = await fileExists(filePath)
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBe(false)
      }
    })

    it('無効なパスでエラーを返す', async () => {
      const result = await fileExists('')
      expect(result.isErr()).toBe(true)
    })
  })

  describe('ensureDirectoryExists', () => {
    it('存在しないディレクトリを作成する', async () => {
      const dirPath = path.join(tempDir, 'new', 'nested', 'directory')
      
      const result = await ensureDirectoryExists(dirPath)
      expect(result.isOk()).toBe(true)
      
      const stat = await fs.stat(dirPath)
      expect(stat.isDirectory()).toBe(true)
    })

    it('既に存在するディレクトリで成功を返す', async () => {
      const dirPath = path.join(tempDir, 'existing')
      await fs.mkdir(dirPath, { recursive: true })
      
      const result = await ensureDirectoryExists(dirPath)
      expect(result.isOk()).toBe(true)
    })

    it('無効なパスでエラーを返す', async () => {
      const result = await ensureDirectoryExists('')
      expect(result.isErr()).toBe(true)
    })
  })

  describe('readJsonFile', () => {
    it('有効なJSONファイルを読み込む', async () => {
      const filePath = path.join(tempDir, 'valid.json')
      const testData = [
        { id: '1', message: 'test1' },
        { id: '2', message: 'test2' }
      ]
      await fs.writeFile(filePath, JSON.stringify(testData, null, 2))
      
      const result = await readJsonFile(filePath)
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toEqual(testData)
      }
    })

    it('存在しないファイルで空配列を返す', async () => {
      const filePath = path.join(tempDir, 'non-existing.json')
      
      const result = await readJsonFile(filePath)
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toEqual([])
      }
    })

    it('無効なJSONファイルでエラーを返す', async () => {
      const filePath = path.join(tempDir, 'invalid.json')
      await fs.writeFile(filePath, '{ invalid json }')
      
      const result = await readJsonFile(filePath)
      expect(result.isErr()).toBe(true)
    })

    it('空のファイルで空配列を返す', async () => {
      const filePath = path.join(tempDir, 'empty.json')
      await fs.writeFile(filePath, '')
      
      const result = await readJsonFile(filePath)
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toEqual([])
      }
    })
  })

  describe('appendToJsonFile', () => {
    const sampleLog: ActivityLog = {
      id: 'test-id',
      timestamp: '2024-03-15T10:30:00.000Z',
      type: 'command_execution',
      level: 'info',
      summary: 'Test log',
      intention: 'Testing',
      context: 'Unit test'
    }

    it('新しいファイルにログを書き込む', async () => {
      const filePath = path.join(tempDir, 'new-log.json')
      
      const result = await appendToJsonFile(filePath, sampleLog)
      expect(result.isOk()).toBe(true)
      
      const content = await fs.readFile(filePath, 'utf-8')
      const parsed = JSON.parse(content)
      expect(parsed).toEqual([sampleLog])
    })

    it('既存のファイルにログを追記する', async () => {
      const filePath = path.join(tempDir, 'existing-log.json')
      const existingLog: ActivityLog = {
        id: 'existing-id',
        timestamp: '2024-03-15T09:00:00.000Z',
        type: 'file_operation',
        level: 'info',
        summary: 'Existing log',
        intention: 'Pre-existing',
        context: 'Setup'
      }
      
      await fs.writeFile(filePath, JSON.stringify([existingLog], null, 2))
      
      const result = await appendToJsonFile(filePath, sampleLog)
      expect(result.isOk()).toBe(true)
      
      const content = await fs.readFile(filePath, 'utf-8')
      const parsed = JSON.parse(content)
      expect(parsed).toEqual([existingLog, sampleLog])
    })

    it('ディレクトリが存在しない場合は作成してから書き込む', async () => {
      const dirPath = path.join(tempDir, 'nested', 'deep', 'directory')
      const filePath = path.join(dirPath, 'new-log.json')
      
      const result = await appendToJsonFile(filePath, sampleLog)
      expect(result.isOk()).toBe(true)
      
      const content = await fs.readFile(filePath, 'utf-8')
      const parsed = JSON.parse(content)
      expect(parsed).toEqual([sampleLog])
    })

    it('無効なパスでエラーを返す', async () => {
      const result = await appendToJsonFile('', sampleLog)
      expect(result.isErr()).toBe(true)
    })
  })
})