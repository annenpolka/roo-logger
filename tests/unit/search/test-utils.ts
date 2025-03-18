import { ActivityLog, ActivityTypes, LogLevels, SearchModes, SearchFields, SearchMode } from '../../../src/types';
import { textMatches, getSearchableText } from '../../../src/utils/search';

/**
 * テスト用のモックログデータ
 */
export const mockLogs: ActivityLog[] = [
  {
    id: '1',
    timestamp: '2025-03-01T00:00:00Z',
    type: ActivityTypes.COMMAND_EXECUTION,
    level: LogLevels.INFO,
    summary: 'webpack build completed successfully',
    details: { duration: 1500, exitCode: 0, webpack: true },
    intention: 'プロジェクトをビルドして本番環境にデプロイする準備',
    context: '定期的なデプロイプロセスの一部'
  },
  {
    id: '2',
    timestamp: '2025-03-02T00:00:00Z',
    type: ActivityTypes.FILE_OPERATION,
    level: LogLevels.INFO,
    summary: 'Updated package.json dependencies for webpack project',
    details: { changedPackages: ['react', 'webpack'] },
    intention: '依存パッケージを最新バージョンに更新',
    context: 'セキュリティ脆弱性対応のためのアップデート'
  },
  {
    id: '3',
    timestamp: '2025-03-03T00:00:00Z',
    type: ActivityTypes.ERROR_ENCOUNTERED,
    level: LogLevels.ERROR,
    summary: 'Failed to connect to database',
    details: { errorCode: 'ECONNREFUSED', attempts: 3, database: true },
    intention: 'データベースからユーザー情報を取得',
    context: 'ユーザー認証処理中のエラー、データベース接続の問題、プロジェクトの重要な部分'
  },
  {
    id: '4',
    timestamp: '2025-03-04T00:00:00Z',
    type: ActivityTypes.DECISION_MADE,
    level: LogLevels.INFO,
    summary: 'Selected React framework for frontend',
    details: { alternatives: ['Vue', 'Angular'], reasonsForChoice: ['既存の経験', 'コミュニティサポート'] },
    intention: 'プロジェクトの技術スタックを決定',
    context: '新機能開発のための技術選定プロセス、プロジェクト計画の重要部分'
  },
  {
    id: '5',
    timestamp: '2025-03-05T00:00:00Z',
    type: ActivityTypes.CODE_GENERATION,
    level: LogLevels.INFO,
    summary: 'Generated API client from OpenAPI spec',
    details: { generatedFiles: 15, totalLines: 2500, API: true },
    intention: 'APIクライアントコードの自動生成により開発効率を向上',
    context: 'バックエンドAPIとの統合作業'
  },
  {
    id: '6',
    timestamp: '2025-03-06T00:00:00Z',
    type: ActivityTypes.DECISION_MADE,
    level: LogLevels.INFO,
    summary: 'API versioning strategy decided',
    details: { strategy: 'Semantic versioning', APIVersion: '1.0.0' },
    intention: 'APIの変更管理と後方互換性の確保',
    context: 'APIの設計と計画の一部'
  }
];

/**
 * 検索結果のフィルタリングをシミュレートする関数
 * 実際のコードと同じロジックを使用するための実装
 */
export function simulateSearch(
  logs: ActivityLog[],
  options: {
    searchText?: string;
    searchTerms?: string[];
    searchMode?: SearchMode;
    searchFields?: string[];
    caseSensitive?: boolean;
  }
): ActivityLog[] {
  const {
    searchText,
    searchTerms = [],
    searchMode = SearchModes.NORMAL,
    searchFields = [SearchFields.ALL],
    caseSensitive = false
  } = options;

  // 検索語がない場合は全件返す
  if (!searchText && (!searchTerms || searchTerms.length === 0)) {
    return logs;
  }

  // 全検索語を含む配列を作成（searchTextがあれば追加）
  const allSearchTerms = [...searchTerms];
  if (searchText) {
    allSearchTerms.push(searchText);
  }

  // 検索語とフィールドに基づいてフィルタリング
  return logs.filter(log => {
    // いずれかの検索語が一致するかチェック（OR条件）
    return allSearchTerms.some(term => {
      // いずれかの指定フィールドで一致するかチェック
      return searchFields.some(field => {
        const fieldText = getSearchableText(log, field);
        return textMatches(fieldText, term, searchMode, caseSensitive, field);
      });
    });
  });
}