import { describe, it, expect } from 'vitest';
import { mockLogs, simulateSearch } from './test-utils';
import { SearchModes, SearchFields } from '../../../src/types';

describe('検索モード機能テスト', () => {
  // 通常検索モードのみを残す
  describe('通常検索モード', () => {
    it('単一キーワードの部分一致で検索できること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'webpack',
        searchMode: SearchModes.NORMAL
      });

      expect(results).toHaveLength(2); // 「webpack build completed」と「webpack」を含むログが2つあるはず
    });

    it('大文字小文字を区別せずに検索できること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'WEBPACK',
        searchMode: SearchModes.NORMAL,
        caseSensitive: false
      });

      expect(results).toHaveLength(2);
    });

    it('大文字小文字を区別して検索できること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'WEBPACK',
        searchMode: SearchModes.NORMAL,
        caseSensitive: true
      });

      expect(results).toHaveLength(0); // 大文字小文字を区別するため、「webpack」には一致しない
    });
  });
});