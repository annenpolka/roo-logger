import {
  ActivityLog,
  SearchFields,
  SearchLogsArgs,
  SearchMode,
  SearchModes,
} from "../types.js";

/**
 * 値がテキストを含むかどうかをチェックする関数
 * 大文字小文字の区別を考慮
 */
export function textMatches(
  text: string,
  searchTerm: string,
  searchMode: SearchMode,
  caseSensitive: boolean,
  field?: string,
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
      return log.summary || "";

    case SearchFields.DETAILS:
      return JSON.stringify(log.details || {});

    case SearchFields.INTENTION:
      return log.intention || "";

    case SearchFields.CONTEXT:
      return log.context || "";

    case SearchFields.ALL:
    default:
      return [
        log.summary || "",
        JSON.stringify(log.details || {}),
        log.intention || "",
        log.context || "",
      ].join(" ");
  }
}

/**
 * ログエントリの配列をフィルタリング、ソート、ページネーションする関数
 */
export function filterAndPaginateLogs(
  allLogs: ActivityLog[],
  args: SearchLogsArgs,
): { total: number; logs: ActivityLog[] } {
  // フィルタリング
  let filteredLogs = allLogs;

  // タイプでフィルタ
  if (args.type) {
    filteredLogs = filteredLogs.filter((log) => log.type === args.type);
  }

  // レベルでフィルタ
  if (args.level) {
    filteredLogs = filteredLogs.filter((log) => log.level === args.level);
  }

  // テキスト検索
  const allSearchTerms: string[] = [];
  // searchMode は args から取得する必要がある。デフォルトは NORMAL
  const searchMode = args.searchMode || SearchModes.NORMAL;
  const caseSensitive = args.caseSensitive ?? false;
  // searchFields も args から取得。デフォルトは ALL
  const searchFields = args.searchFields && args.searchFields.length > 0
    ? [...args.searchFields]
    : [SearchFields.ALL];

  // searchText と searchTerms を結合
  if (args.searchText) {
    allSearchTerms.push(args.searchText);
  }
  // searchTerms が存在し、配列であることを確認
  if (
    args.searchTerms && Array.isArray(args.searchTerms) &&
    args.searchTerms.length > 0
  ) {
    allSearchTerms.push(...args.searchTerms);
  }

  if (allSearchTerms.length > 0) {
    filteredLogs = filteredLogs.filter((log) => {
      // 指定された各フィールドから検索対象テキストを取得
      const textsToSearch = searchFields.map((field) =>
        getSearchableText(log, field)
      );
      const combinedText = textsToSearch.join(" "); // フィールド間のテキストを結合

      // いずれかの検索語にマッチするかどうかを判定
      return allSearchTerms.some((term) =>
        // textMatches に searchMode を渡す
        textMatches(combinedText, term, searchMode, caseSensitive)
      );
    });
  }

  // 親IDでフィルタ
  if (args.parentId) {
    filteredLogs = filteredLogs.filter((log) => log.parentId === args.parentId);
  }

  // シーケンス範囲でフィルタ
  if (args.sequenceFrom !== undefined) {
    filteredLogs = filteredLogs.filter((log) =>
      log.sequence !== undefined && log.sequence >= args.sequenceFrom!
    );
  }
  if (args.sequenceTo !== undefined) {
    filteredLogs = filteredLogs.filter((log) =>
      log.sequence !== undefined && log.sequence <= args.sequenceTo!
    );
  }

  // 関連IDでフィルタ
  if (args.relatedId) {
    filteredLogs = filteredLogs.filter((log) =>
      log.relatedIds?.includes(args.relatedId!)
    );
  }
  // relatedIds が存在し、配列であることを確認
  if (
    args.relatedIds && Array.isArray(args.relatedIds) &&
    args.relatedIds.length > 0
  ) {
    filteredLogs = filteredLogs.filter((log) =>
      // log.relatedIds も存在し、配列であることを確認
      log.relatedIds && Array.isArray(log.relatedIds) &&
      log.relatedIds.some((id: string) => args.relatedIds?.includes(id))
    );
  }

  // ソート (タイムスタンプ降順)
  filteredLogs.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // ページネーション
  const limit = args.limit ?? 50;
  const offset = args.offset ?? 0;
  const paginatedLogs = filteredLogs.slice(offset, offset + limit);

  return {
    total: filteredLogs.length,
    logs: paginatedLogs,
  };
}
