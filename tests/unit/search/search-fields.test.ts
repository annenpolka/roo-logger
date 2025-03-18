import { describe, it, expect } from 'vitest';
import { mockLogs, simulateSearch } from './test-utils';
import { SearchModes, SearchFields } from '../../../src/types';

describe('検索対象フィールド限定機能テスト', () => {
  describe('単一フィールド検索', () => {
    it('summaryフィールドのみを検索対象にできること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'webpack',
        searchFields: [SearchFields.SUMMARY],
        searchMode: SearchModes.NORMAL
      });

      // summaryに'webpack'を含むログは2つあるはず
      expect(results).toHaveLength(2);
    });

    it('detailsフィールドのみを検索対象にできること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'react',
        searchFields: [SearchFields.DETAILS],
        searchMode: SearchModes.NORMAL
      });

      // detailsに'react'を含むログは1つあるはず
      expect(results).toHaveLength(1);
    });

    it('intentionフィールドのみを検索対象にできること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'プロジェクト',
        searchFields: [SearchFields.INTENTION],
        searchMode: SearchModes.NORMAL
      });

      // intentionに'プロジェクト'を含むログは2つあるはず
      expect(results).toHaveLength(2);
    });

    it('contextフィールドのみを検索対象にできること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'エラー',
        searchFields: [SearchFields.CONTEXT],
        searchMode: SearchModes.NORMAL
      });

      // contextに'エラー'を含むログは1つあるはず
      expect(results).toHaveLength(1);
    });
  });

  describe('複数フィールド検索', () => {
    it('複数のフィールドを検索対象にできること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'API',
        searchFields: [SearchFields.SUMMARY, SearchFields.CONTEXT],
        searchMode: SearchModes.NORMAL
      });

      // summaryまたはcontextに'API'を含むログは2つあるはず
      expect(results).toHaveLength(2);
    });

    it('すべてのフィールドを検索対象にできること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'API',
        searchFields: [SearchFields.ALL],
        searchMode: SearchModes.NORMAL
      });

      // いずれかのフィールドに'API'を含むログは2つあるはず
      expect(results).toHaveLength(2);
    });
  });

  describe('検索モードとの組み合わせ', () => {
    it('Globパターンと特定フィールドの組み合わせで検索できること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'デプロイ*',
        searchFields: [SearchFields.INTENTION],
        searchMode: SearchModes.GLOB
      });

      // intentionフィールドに'デプロイ'で始まるテキストを含むログは1つあるはず
      expect(results).toHaveLength(1);
    });

    it('正規表現と特定フィールドの組み合わせで検索できること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'ユーザー[^\\s]+',
        searchFields: [SearchFields.CONTEXT],
        searchMode: SearchModes.REGEXP
      });

      // contextフィールドに'ユーザー'の後に空白以外の文字が続くテキストを含むログは1つあるはず
      expect(results).toHaveLength(1);
    });
  });

  describe('searchFieldsが指定されていない場合', () => {
    it('searchFieldsが指定されていない場合はデフォルトですべてのフィールドが検索対象になること', () => {
      const results = simulateSearch(mockLogs, {
        searchText: 'API',
        searchMode: SearchModes.NORMAL
      });

      // searchFieldsを指定しない場合は、すべてのフィールドが検索対象となり、
      // いずれかのフィールドに'API'を含むログは2つあるはず
      expect(results).toHaveLength(2);
    });
  });

  describe('OR検索との組み合わせ', () => {
    it('複数の検索語と複数のフィールドの組み合わせで検索できること', () => {
      const results = simulateSearch(mockLogs, {
        searchTerms: ['プロジェクト', 'データベース'],
        searchFields: [SearchFields.INTENTION, SearchFields.CONTEXT],
        searchMode: SearchModes.NORMAL
      });

      // intentionまたはcontextに'プロジェクト'または'データベース'を含むログは3つあるはず
      expect(results).toHaveLength(3);
    });
  });
});