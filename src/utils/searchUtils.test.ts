import { describe, expect, it } from "vitest";
import {
  ActivityLog,
  ActivityTypes,
  LogLevels,
  SearchFields,
  SearchLogsArgs,
} from "../types.js"; // 必要な型をインポート
import { filterAndPaginateLogs } from "./searchUtils.js"; // 対象関数をインポート (まだ存在しないはず)

// モックデータ生成ヘルパー
const createMockLog = (override: Partial<ActivityLog> = {}): ActivityLog => ({
  id: `id-${Math.random()}`,
  timestamp: new Date().toISOString(),
  type: ActivityTypes.COMMAND_EXECUTION, // デフォルトを修正
  level: LogLevels.INFO,
  summary: "Default summary",
  details: {},
  intention: "Default intention",
  context: "Default context",
  ...override,
});

// モックログデータ
const mockLogs: ActivityLog[] = [
  createMockLog({
    id: "log1",
    timestamp: "2025-03-29T10:00:00Z",
    type: ActivityTypes.COMMAND_EXECUTION,
    level: LogLevels.INFO,
    summary: "Run npm install",
    parentId: "task1",
    sequence: 1,
    relatedIds: ["issue1"],
  }),
  createMockLog({
    id: "log2",
    timestamp: "2025-03-29T11:00:00Z",
    type: ActivityTypes.CODE_GENERATION,
    level: LogLevels.DEBUG,
    summary: "Generate component",
    details: { component: "Button" },
    intention: "Create UI element",
    context: "Feature X",
    parentId: "task1",
    sequence: 2,
    relatedIds: ["issue1", "issue2"],
  }),
  createMockLog({
    id: "log3",
    timestamp: "2025-03-29T12:00:00Z",
    type: ActivityTypes.FILE_OPERATION,
    level: LogLevels.WARN,
    summary: "Update README.md",
    context: "Documentation update",
  }),
  createMockLog({
    id: "log4",
    timestamp: "2025-03-29T13:00:00Z",
    type: ActivityTypes.ERROR_ENCOUNTERED,
    level: LogLevels.ERROR,
    summary: "API call failed",
    details: { error: "Timeout" },
    parentId: "task2",
    sequence: 1,
  }),
  createMockLog({
    id: "log5",
    timestamp: "2025-03-29T14:00:00Z",
    type: ActivityTypes.DECISION_MADE,
    level: LogLevels.INFO,
    summary: "Use library Y",
    intention: "Performance improvement",
    relatedIds: ["issue3"],
  }),
  createMockLog({
    id: "log6",
    timestamp: "2025-03-29T15:00:00Z",
    type: ActivityTypes.CONVERSATION,
    level: LogLevels.INFO,
    summary: "Discuss requirements",
    context: "Planning phase",
  }),
  createMockLog({
    id: "log7",
    timestamp: "2025-03-29T16:00:00Z",
    type: ActivityTypes.COMMAND_EXECUTION,
    level: LogLevels.INFO,
    summary: "Run tests",
    parentId: "task1",
    sequence: 3,
    relatedIds: ["issue2"],
  }),
];

describe("filterAndPaginateLogs", () => {
  // この時点では filterAndPaginateLogs は未定義なので、テストは失敗するはず
  it("フィルタなしの場合、全ログをタイムスタンプ降順で返すこと", () => {
    const args: SearchLogsArgs = { logsDir: "/fake" };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(7);
    expect(result.logs.length).toBe(7); // Assuming default limit is high enough or pagination is handled later
    expect(result.logs.map((log) => log.id)).toEqual([
      "log7",
      "log6",
      "log5",
      "log4",
      "log3",
      "log2",
      "log1",
    ]);
  });

  it("type でフィルタリングできること", () => {
    const args: SearchLogsArgs = {
      logsDir: "/fake",
      type: ActivityTypes.COMMAND_EXECUTION,
    };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(2);
    expect(result.logs.map((log) => log.id)).toEqual(["log7", "log1"]);
  });

  it("level でフィルタリングできること", () => {
    const args: SearchLogsArgs = { logsDir: "/fake", level: LogLevels.INFO };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(4);
    expect(result.logs.map((log) => log.id)).toEqual([
      "log7",
      "log6",
      "log5",
      "log1",
    ]);
  });

  it("searchText で summary を検索できること (case-insensitive)", () => {
    const args: SearchLogsArgs = { logsDir: "/fake", searchText: "run" };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(2);
    expect(result.logs.map((log) => log.id)).toEqual(["log7", "log1"]);
  });

  it("searchText で summary を検索できること (case-sensitive)", () => {
    const args: SearchLogsArgs = {
      logsDir: "/fake",
      searchText: "Run",
      caseSensitive: true,
    };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(2); // "Run npm install", "Run tests"
    expect(result.logs.map((log) => log.id)).toEqual(["log7", "log1"]);
  });

  it("searchText で details を検索できること", () => {
    const args: SearchLogsArgs = { logsDir: "/fake", searchText: "button" }; // "Button" in details
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(1);
    expect(result.logs[0].id).toBe("log2");
  });

  it("searchTerms で複数キーワード検索 (OR) できること", () => {
    const args: SearchLogsArgs = {
      logsDir: "/fake",
      searchTerms: ["generate", "update"],
    };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(2);
    expect(result.logs.map((log) => log.id)).toEqual(["log3", "log2"]); // log3: Update, log2: Generate
  });

  it("searchFields で検索対象フィールドを指定できること (intention のみ)", () => {
    const args: SearchLogsArgs = {
      logsDir: "/fake",
      searchText: "performance",
      searchFields: [SearchFields.INTENTION],
    };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(1);
    expect(result.logs[0].id).toBe("log5"); // log5 の intention に "Performance improvement"
  });

  it("searchFields で検索対象フィールドを指定できること (summary と context)", () => {
    const args: SearchLogsArgs = {
      logsDir: "/fake",
      searchText: "update",
      searchFields: [SearchFields.SUMMARY, SearchFields.CONTEXT],
    };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(1);
    expect(result.logs[0].id).toBe("log3"); // log3 の summary と context に "Update"
  });

  it("parentId でフィルタリングできること", () => {
    const args: SearchLogsArgs = { logsDir: "/fake", parentId: "task1" };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(3);
    expect(result.logs.map((log) => log.id)).toEqual(["log7", "log2", "log1"]);
  });

  it("sequenceFrom でフィルタリングできること", () => {
    const args: SearchLogsArgs = {
      logsDir: "/fake",
      parentId: "task1",
      sequenceFrom: 2,
    };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(2);
    expect(result.logs.map((log) => log.id)).toEqual(["log7", "log2"]);
  });

  it("sequenceTo でフィルタリングできること", () => {
    const args: SearchLogsArgs = {
      logsDir: "/fake",
      parentId: "task1",
      sequenceTo: 2,
    };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(2);
    expect(result.logs.map((log) => log.id)).toEqual(["log2", "log1"]);
  });

  it("sequenceFrom と sequenceTo で範囲フィルタリングできること", () => {
    const args: SearchLogsArgs = {
      logsDir: "/fake",
      parentId: "task1",
      sequenceFrom: 2,
      sequenceTo: 2,
    };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(1);
    expect(result.logs[0].id).toBe("log2");
  });

  it("relatedId でフィルタリングできること", () => {
    const args: SearchLogsArgs = { logsDir: "/fake", relatedId: "issue1" };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(2);
    expect(result.logs.map((log) => log.id)).toEqual(["log2", "log1"]);
  });

  it("relatedIds で複数IDフィルタリング (OR) できること", () => {
    const args: SearchLogsArgs = {
      logsDir: "/fake",
      relatedIds: ["issue1", "issue3"],
    };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(3);
    expect(result.logs.map((log) => log.id)).toEqual(["log5", "log2", "log1"]); // log5(issue3), log2(issue1), log1(issue1)
  });

  it("limit で取得件数を制限できること", () => {
    const args: SearchLogsArgs = { logsDir: "/fake", limit: 3 };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(7);
    expect(result.logs.length).toBe(3);
    expect(result.logs.map((log) => log.id)).toEqual(["log7", "log6", "log5"]);
  });

  it("offset で開始位置を指定できること", () => {
    const args: SearchLogsArgs = { logsDir: "/fake", offset: 2 };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(7);
    expect(result.logs.length).toBe(5); // 7 - 2 = 5
    expect(result.logs.map((log) => log.id)).toEqual([
      "log5",
      "log4",
      "log3",
      "log2",
      "log1",
    ]);
  });

  it("limit と offset を組み合わせてページネーションできること", () => {
    const args: SearchLogsArgs = { logsDir: "/fake", limit: 2, offset: 3 };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(7);
    expect(result.logs.length).toBe(2);
    expect(result.logs.map((log) => log.id)).toEqual(["log4", "log3"]); // 4番目と5番目
  });

  it("空のログリストを渡した場合、空の結果を返すこと", () => {
    const args: SearchLogsArgs = { logsDir: "/fake" };
    const result = filterAndPaginateLogs([], args);
    expect(result.total).toBe(0);
    expect(result.logs.length).toBe(0);
  });

  it("フィルタ結果が0件の場合、空のログリストを返すこと", () => {
    const args: SearchLogsArgs = {
      logsDir: "/fake",
      type: ActivityTypes.DECISION_MADE,
      level: LogLevels.ERROR,
    };
    const result = filterAndPaginateLogs(mockLogs, args);
    expect(result.total).toBe(0);
    expect(result.logs.length).toBe(0);
  });
});
