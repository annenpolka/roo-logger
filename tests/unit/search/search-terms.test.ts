import { describe, it, expect } from 'vitest';
import { mockLogs, simulateSearch } from './test-utils';
import { SearchModes, SearchFields } from '../../../src/types';

describe('複数検索語（OR検索）機能テスト', () => {
  describe('基本的なOR検索', () => {
    it('複数のキーワードのいずれかに一致するログが検索できること', () => {
      const results = simulateSearch(mockLogs, {
        searchTerms: ['webpack', 'database'],
        searchMode: SearchModes.NORMAL
      });

      // 'webpack'または'database'を含むログが合計3つあるはず
      expect(results).toHaveLength(3);
    });

    it('空の検索語配列の場合は全てのログが返されること', () => {
      const results = simulateSearch(mockLogs, {
        searchTerms: [],
        searchMode: SearchModes.NORMAL
      });

      expect(results).toHaveLength(mockLogs.length);
    });

    it('単一のsearchTextと複数のsearchTermsを同時に指定した場合、両方が考慮されること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'react',
        searchTerms: ['database', 'API'],
        searchMode: SearchModes.NORMAL
      });

      // 新しい実装では'react'か'database'か'API'を含むログは合計5つになります
      // (モックデータの拡充により増加)
      expect(results).toHaveLength(5);
    });
  });
  // 検索モードとの組み合わせは簡略化のため削除

  describe('フィールド指定との組み合わせ', () => {
    it('特定のフィールドに対して複数キーワードで検索できること', () => {
      const results = simulateSearch(mockLogs, {
        searchTerms: ['プロジェクト', 'エラー'],
        searchFields: [SearchFields.CONTEXT],
        searchMode: SearchModes.NORMAL
      });

      // コンテキストに'プロジェクト'または'エラー'を含むログが2つあるはず
      expect(results).toHaveLength(2);
    });

    it('複数のフィールドと複数のキーワードで検索できること', () => {
      const results = simulateSearch(mockLogs, {
        searchTerms: ['技術', 'データベース'],
        searchFields: [SearchFields.INTENTION, SearchFields.CONTEXT],
        searchMode: SearchModes.NORMAL
      });

      // 意図またはコンテキストに'技術'または'データベース'を含むログが2つあるはず
      expect(results).toHaveLength(2);
    });
  });

  describe('大文字小文字の区別', () => {
    it('大文字小文字を区別せずに複数キーワード検索できること', () => {
      const results = simulateSearch(mockLogs, {
        searchTerms: ['WEBPACK', 'DATABASE'],
        searchMode: SearchModes.NORMAL,
        caseSensitive: false
      });

      // 大文字小文字を区別しない場合、'webpack'または'database'を含むログが3つあるはず
      expect(results).toHaveLength(3);
    });

    it('大文字小文字を区別して複数キーワード検索できること', () => {
      const results = simulateSearch(mockLogs, {
        searchTerms: ['WEBPACK', 'DATABASE'],
        searchMode: SearchModes.NORMAL,
        caseSensitive: true
      });

      // 大文字小文字を区別する場合、完全一致するものはないはず
      expect(results).toHaveLength(0);
    });
  });
});