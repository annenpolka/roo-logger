# Rooエラーログ記録の設定例

Rooがエラーに遭遇した際に自動的にログを記録するための`.clinerules`設定例です。

## エラーログ設定例

以下のような設定を`.clinerules`ファイルに追加することで、Rooがエラーに遭遇した際に自動的にログを記録できます：

```markdown
## エラーハンドリング

### エラーログ設定
- logger: roo-activity-logger
- log_on_error: true
- error_log_dir: error-logs
- include_context: true
- include_stacktrace: true

### エラー発生時のアクション
- log_before_retry: true
- notify_on_critical: true
- max_retries: 3
```

## 設定項目の説明

| 設定項目 | 説明 |
|---------|------|
| `logger` | 使用するMCPロガーの名前 |
| `log_on_error` | エラー時に自動ログ記録を有効化 |
| `error_log_dir` | エラーログの保存先ディレクトリ |
| `include_context` | エラー発生時の文脈情報を含める |
| `include_stacktrace` | スタックトレース情報を含める |
| `log_before_retry` | 再試行前にログを記録する |
| `notify_on_critical` | 重大エラー発生時に通知する |
| `max_retries` | 最大再試行回数 |

## 実装方法

Clineがこれらの設定を読み取り、エラー発生時に以下の処理を行います：

1. エラーが発生したことを検知
2. `.clinerules`のエラーハンドリング設定を読み込み
3. `roo-activity-logger`にエラー情報を送信

```typescript
// エラー発生時のログ記録例（Cline内部実装イメージ）
async function handleError(error: Error, context: any) {
  if (clinerules.errorHandling?.log_on_error) {
    await mcp.callTool({
      server: clinerules.errorHandling.logger,
      tool: 'log_activity',
      arguments: {
        type: 'error_encountered',
        summary: `エラー: ${error.message}`,
        level: 'error',
        details: {
          error_type: error.name,
          stack_trace: clinerules.errorHandling.include_stacktrace ? error.stack : undefined,
          error_code: (error as any).code
        },
        intention: '自動エラー記録',
        context: clinerules.errorHandling.include_context ?
          `エラー発生時の実行コンテキスト: ${JSON.stringify(context)}` : undefined,
        logsDir: clinerules.errorHandling.error_log_dir
      }
    });
  }

  // 再試行ロジックなど...
}
```

## ログ出力例

このフックにより、エラー発生時には以下のようなログが自動的に記録されます：

```json
{
  "id": "cb7f35a2-8e12-4e5d-b8f9-9a5c3b7e1def",
  "timestamp": "2025-03-11T03:45:12.142Z",
  "type": "error_encountered",
  "level": "error",
  "summary": "エラー: Cannot read property 'length' of undefined",
  "details": {
    "error_type": "TypeError",
    "stack_trace": "TypeError: Cannot read property 'length' of undefined\n    at processData (/path/to/file.js:123:45)\n    ...",
    "error_code": "ERR_UNDEFINED_VALUE"
  },
  "intention": "自動エラー記録",
  "context": "エラー発生時の実行コンテキスト: {\"function\":\"processData\",\"arguments\":{\"data\":null}}"
}