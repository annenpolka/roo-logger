import { describe, it, expect } from 'vitest';
import { mockLogs, simulateSearch } from './test-utils';
import { SearchModes, SearchFields } from '../../../src/types';

describe('検索モード機能テスト', () => {
  // 通常検索モード
  describe('通常検索モード', () => {
    it('単一の完全一致キーワードで検索できること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'webpack',
        searchMode: SearchModes.NORMAL
      });

      // この時点では実装されていないのでテストは失敗するはず
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

  // Glob検索モード
  describe('Glob検索モード', () => {
    it('アスタリスクでワイルドカード検索できること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'web*',
        searchMode: SearchModes.GLOB
      });

      expect(results).toHaveLength(2); // 「webpack」を含むログが2つあるはず
    });

    it('複数のワイルドカードを使用できること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: '*pack*json*',
        searchMode: SearchModes.GLOB
      });

      expect(results).toHaveLength(1); // 「package.json」を含むログが1つあるはず
    });

    it('特定のフィールドに対してGlob検索できること', () => {
      // データベースの文字列を含むログを検索する
      const results = simulateSearch(mockLogs, {
        searchText: '*データベース*',
        searchMode: SearchModes.GLOB,
        searchFields: [SearchFields.CONTEXT]
      });

      // コンテキストに「データベース」を含むログが1つあるはず
      expect(results).toHaveLength(1);
    });
  });

  describe('正規表現検索モード', () => {
    it('正規表現パターンで検索できること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'web(pack|site)',
        searchMode: SearchModes.REGEXP
      });

      expect(results).toHaveLength(2); // 「webpack」を含むログが2つあるはず
    });

    it('数字のパターンで検索できること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: '\\d{4}',  // 4桁の数字
        searchMode: SearchModes.REGEXP
      });

      expect(results).toHaveLength(2); // 4桁の数字（1500, 2500）を含むログが2つあるはず
    });

    it('無効な正規表現の場合はエラーを処理できること', () => {
      // 無効な正規表現パターン
      expect(() => {
        simulateSearch(mockLogs, {
          searchText: '\\', // 終了していないエスケープシーケンス
          searchMode: SearchModes.REGEXP
        });
      }).not.toThrow(); // エラーをスローせず、安全に処理できること
    });
  });
});