import { ActivityLog, SearchMode, SearchModes, SearchField, SearchFields } from '../types.js';

/**
 * 値がテキストを含むかどうかをチェックする関数
 * 大文字小文字の区別を考慮
 */
export function textMatches(
  text: string,
  searchTerm: string,
  searchMode: SearchMode,
  caseSensitive: boolean,
  field?: string
): boolean {
  // 検索対象と検索語を大文字小文字の区別に合わせて調整
  let targetText = caseSensitive ? text : text.toLowerCase();
  let termText = caseSensitive ? searchTerm : searchTerm.toLowerCase();

  // normalモードのみの実装に簡略化
  return targetText.includes(termText);
}

/**
 * ログのフィールドから検索可能なテキストを抽出する関数
 */
export function getSearchableText(log: ActivityLog, field: string): string {
  switch (field) {
    case SearchFields.SUMMARY:
      return log.summary || '';

    case SearchFields.DETAILS:
      return JSON.stringify(log.details || {});

    case SearchFields.INTENTION:
      return log.intention || '';

    case SearchFields.CONTEXT:
      return log.context || '';

    case SearchFields.ALL:
    default:
      return [
        log.summary || '',
        JSON.stringify(log.details || {}),
        log.intention || '',
        log.context || ''
      ].join(' ');
  }
}

/**
 * 注: simulateSearch関数は削除しました
 * テストではsrc/index.tsのhandleSearchLogs関数を直接使用するように変更します
 */