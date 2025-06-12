import { describe, it, expect } from 'vitest'
import { 
  filterLogs,
  applyPagination
} from '../../../src/functions/search'
import {
  matchesActivityType,
  matchesLogLevel,
  matchesDateRange,
  matchesSearchText,
  matchesParent as matchesParentId,
  matchesSequenceRange,
  matchesRelatedIds
} from '../../../src/functions/search-filters'
import { ActivityLog } from '../../../src/types/core'

describe('検索関数', () => {
  const sampleLogs: ActivityLog[] = [
    {
      id: 'log-1',
      timestamp: '2024-01-15T10:00:00.000Z',
      type: 'command_execution',
      level: 'info',
      summary: 'npm test実行',
      intention: 'テスト実行',
      context: 'CI/CD',
      details: { command: 'npm test', exitCode: 0 },
      parentId: 'parent-1',
      sequence: 1,
      relatedIds: ['rel-1', 'rel-2']
    },
    {
      id: 'log-2', 
      timestamp: '2024-01-16T14:30:00.000Z',
      type: 'file_operation',
      level: 'warn',
      summary: 'ファイル操作エラー',
      intention: 'ファイル更新',
      context: 'バグ修正',
      details: { file: 'test.js', operation: 'update' },
      sequence: 2,
      relatedIds: ['rel-3']
    },
    {
      id: 'log-3',
      timestamp: '2024-01-17T09:15:00.000Z', 
      type: 'code_generation',
      level: 'error',
      summary: 'コード生成失敗',
      intention: '新機能実装',
      context: '開発中',
      parentId: 'parent-1',
      sequence: 3
    }
  ]

  describe('matchesActivityType', () => {
    it('一致するタイプでtrueを返す', () => {
      expect(matchesActivityType(sampleLogs[0], 'command_execution')).toBe(true)
    })

    it('一致しないタイプでfalseを返す', () => {
      expect(matchesActivityType(sampleLogs[0], 'file_operation')).toBe(false)
    })

    it('フィルターが未指定の場合はtrueを返す', () => {
      expect(matchesActivityType(sampleLogs[0], undefined)).toBe(true)
    })
  })

  describe('matchesLogLevel', () => {
    it('一致するレベルでtrueを返す', () => {
      expect(matchesLogLevel(sampleLogs[0], 'info')).toBe(true)
    })

    it('一致しないレベルでfalseを返す', () => {
      expect(matchesLogLevel(sampleLogs[0], 'error')).toBe(false)
    })

    it('フィルターが未指定の場合はtrueを返す', () => {
      expect(matchesLogLevel(sampleLogs[0], undefined)).toBe(true)
    })
  })

  describe('matchesDateRange', () => {
    it('日付範囲内のログでtrueを返す', () => {
      expect(matchesDateRange(sampleLogs[0], '2024-01-01', '2024-01-31')).toBe(true)
    })

    it('日付範囲外のログでfalseを返す', () => {
      expect(matchesDateRange(sampleLogs[0], '2024-02-01', '2024-02-28')).toBe(false)
    })

    it('開始日のみ指定の場合、それ以降でtrueを返す', () => {
      expect(matchesDateRange(sampleLogs[0], '2024-01-10', undefined)).toBe(true)
      expect(matchesDateRange(sampleLogs[0], '2024-01-20', undefined)).toBe(false)
    })

    it('終了日のみ指定の場合、それ以前でtrueを返す', () => {
      expect(matchesDateRange(sampleLogs[0], undefined, '2024-01-20')).toBe(true)
      expect(matchesDateRange(sampleLogs[0], undefined, '2024-01-10')).toBe(false)
    })

    it('日付が未指定の場合はtrueを返す', () => {
      expect(matchesDateRange(sampleLogs[0], undefined, undefined)).toBe(true)
    })

    it('ISO 8601形式の日付でも正しく比較する', () => {
      // 問題のケース：ISO 8601形式の日付を検索条件に使った場合
      expect(matchesDateRange(sampleLogs[0], '2024-01-15T00:00:00.000Z', '2024-01-15T23:59:59.999Z')).toBe(true)
      expect(matchesDateRange(sampleLogs[0], '2024-01-16T00:00:00.000Z', undefined)).toBe(false)
    })
  })

  describe('matchesSearchText', () => {
    it('サマリーに含まれるテキストでtrueを返す', () => {
      expect(matchesSearchText(sampleLogs[0], 'test')).toBe(true)
    })

    it('詳細に含まれるテキストでtrueを返す', () => {
      expect(matchesSearchText(sampleLogs[0], 'npm')).toBe(true)
    })

    it('含まれないテキストでfalseを返す', () => {
      expect(matchesSearchText(sampleLogs[0], 'python')).toBe(false)
    })

    it('大文字小文字を区別しない', () => {
      expect(matchesSearchText(sampleLogs[0], 'NPM')).toBe(true)
      expect(matchesSearchText(sampleLogs[0], 'Test')).toBe(true)
    })

    it('検索テキストが未指定の場合はtrueを返す', () => {
      expect(matchesSearchText(sampleLogs[0], undefined)).toBe(true)
    })
  })

  describe('matchesParentId', () => {
    it('一致するparentIdでtrueを返す', () => {
      expect(matchesParentId(sampleLogs[0], 'parent-1')).toBe(true)
    })

    it('一致しないparentIdでfalseを返す', () => {
      expect(matchesParentId(sampleLogs[0], 'parent-2')).toBe(false)
    })

    it('parentIdがないログで指定されている場合falseを返す', () => {
      expect(matchesParentId(sampleLogs[1], 'parent-1')).toBe(false)
    })

    it('フィルターが未指定の場合はtrueを返す', () => {
      expect(matchesParentId(sampleLogs[0], undefined)).toBe(true)
    })
  })

  describe('matchesSequenceRange', () => {
    it('範囲内のsequenceでtrueを返す', () => {
      expect(matchesSequenceRange(sampleLogs[0], 1, 3)).toBe(true)
    })

    it('範囲外のsequenceでfalseを返す', () => {
      expect(matchesSequenceRange(sampleLogs[0], 5, 10)).toBe(false)
    })

    it('最小値のみ指定の場合、それ以上でtrueを返す', () => {
      expect(matchesSequenceRange(sampleLogs[1], 2, undefined)).toBe(true)
      expect(matchesSequenceRange(sampleLogs[1], 5, undefined)).toBe(false)
    })

    it('最大値のみ指定の場合、それ以下でtrueを返す', () => {
      expect(matchesSequenceRange(sampleLogs[1], undefined, 5)).toBe(true)
      expect(matchesSequenceRange(sampleLogs[1], undefined, 1)).toBe(false)
    })

    it('sequenceがないログでfalseを返す', () => {
      const logWithoutSequence = { ...sampleLogs[0] }
      delete (logWithoutSequence as any).sequence
      expect(matchesSequenceRange(logWithoutSequence, 1, 3)).toBe(false)
    })

    it('範囲が未指定の場合はtrueを返す', () => {
      expect(matchesSequenceRange(sampleLogs[0], undefined, undefined)).toBe(true)
    })
  })

  describe('matchesRelatedIds', () => {
    it('relatedIdと一致するIDを持つログでtrueを返す', () => {
      expect(matchesRelatedIds(sampleLogs[0], 'rel-1', undefined)).toBe(true)
    })

    it('relatedIdsのいずれかと一致するログでtrueを返す', () => {
      expect(matchesRelatedIds(sampleLogs[0], undefined, ['rel-2', 'rel-4'])).toBe(true)
    })

    it('一致しないIDでfalseを返す', () => {
      expect(matchesRelatedIds(sampleLogs[0], 'rel-5', undefined)).toBe(false)
    })

    it('relatedIdsがないログでfalseを返す', () => {
      expect(matchesRelatedIds(sampleLogs[2], 'rel-1', undefined)).toBe(false)
    })

    it('フィルターが未指定の場合はtrueを返す', () => {
      expect(matchesRelatedIds(sampleLogs[0], undefined, undefined)).toBe(true)
    })
  })

  describe('filterLogs', () => {
    it('すべてのフィルターを適用して結果を返す', () => {
      const filters = {
        type: 'command_execution' as const,
        level: 'info' as const,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        searchText: 'test',
        parentId: 'parent-1'
      }

      const result = filterLogs(sampleLogs, filters)
      expect(result).toEqual([sampleLogs[0]])
    })

    it('フィルターなしの場合、全ログを返す', () => {
      const result = filterLogs(sampleLogs, {})
      expect(result).toEqual(sampleLogs)
    })

    it('複数の条件にマッチするログを返す', () => {
      const filters = {
        level: 'warn' as const
      }

      const result = filterLogs(sampleLogs, filters)
      expect(result).toEqual([sampleLogs[1]])
    })

    it('マッチするログがない場合は空配列を返す', () => {
      const filters = {
        type: 'conversation' as const
      }

      const result = filterLogs(sampleLogs, filters)
      expect(result).toEqual([])
    })
  })

  describe('applyPagination', () => {
    it('limitとoffsetを適用してページネーションする', () => {
      const result = applyPagination(sampleLogs, 2, 1)
      expect(result).toEqual([sampleLogs[1], sampleLogs[2]])
    })

    it('limitのみ指定の場合、先頭から指定数を返す', () => {
      const result = applyPagination(sampleLogs, 2, 0)
      expect(result).toEqual([sampleLogs[0], sampleLogs[1]])
    })

    it('offsetが配列長を超える場合は空配列を返す', () => {
      const result = applyPagination(sampleLogs, 10, 5)
      expect(result).toEqual([])
    })

    it('limitが残り要素数より大きい場合は残り全てを返す', () => {
      const result = applyPagination(sampleLogs, 10, 2)
      expect(result).toEqual([sampleLogs[2]])
    })
  })
})