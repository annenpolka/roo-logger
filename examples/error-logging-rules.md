# Rooエラーログ記録の設定例

Rooがエラーに遭遇した際に自動的にログを記録するための`.clinerules`設定例です。

## エラーログ設定例

以下のような設定を`.clinerules`ファイルに追加することで、Rooがエラーに遭遇した際に自動的にログを記録できます：

```markdown
## エラーハンドリング

エラーが発生した場合は、以下の方針に従って処理してください。

### エラー記録

- 全てのエラーはroo-activity-loggerを使用して記録してください
- エラーログは`error-logs`ディレクトリに保存してください
- ログにはスタックトレースと実行コンテキストを含めてください
- エラーの意図と文脈情報を記録してください

### 再試行ポリシー

- 接続エラーやタイムアウトエラーは最大3回まで再試行してください
- 再試行する前に「再試行を行う理由」を記録してください
- 型エラーや構文エラーは再試行せず、明確なエラーメッセージを提示してください

### エラーの分析

- 同様のエラーが繰り返し発生する場合は、根本的な原因を分析してください
- エラーパターンを特定し、一般化された解決策を提案してください
- コードの改善提案があれば、それも記録してください
```

## 使用方法

`.clinerules`ファイルにこのセクションを追加することで、Rooはエラー発生時に上記の指示に従って行動します。これはRooへの指示（プロンプト）として機能し、Rooの行動を導きます。


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