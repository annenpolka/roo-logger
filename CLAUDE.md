# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

このプロジェクトは**Roo Activity Logger**という MCP (Model Context Protocol) サーバーです。Roo の開発活動（コマンド実行、コード生成、ファイル操作など）を自動的に記録し、JSON 形式で保存します。記録されたログは後から検索・分析・文脈の復元が可能です。

## 開発コマンド

```bash
# 依存関係のインストール
npm install

# TypeScript ビルド（実行権限設定含む）
npm run build

# 開発モード（ts-node-esm使用）
npm run dev

# 本番実行
npm start

# テスト実行
npm test

# ウォッチモードでテスト
npm test:watch

# カバレッジ付きテスト
npm test:coverage
```

## アーキテクチャ

### ファイル構成
- `src/index.ts`: メインのMCPサーバー実装
- `src/types.ts`: TypeScript型定義（ActivityLog, 各種Args型など）
- `src/utils/search.ts`: ログ検索機能の実装
- `tests/`: Vitestを使用したテストファイル

### 主要コンポーネント

#### RooActivityLogger クラス
- MCPサーバーのメイン実装
- 3つのツールを提供:
  - `log_activity`: アクティビティをJSONファイルに記録
  - `get_log_files`: 保存されたログファイルの一覧取得
  - `search_logs`: 多様な条件でログを検索

#### ActivityLog型
6種類のアクティビティタイプをサポート:
- `command_execution`: コマンド実行
- `code_generation`: コード生成
- `file_operation`: ファイル操作
- `error_encountered`: エラー発生
- `decision_made`: 判断記録
- `conversation`: 会話記録

#### ログ構造
各ログエントリには以下が含まれる:
- 基本情報: ID, timestamp, type, level, summary
- 文脈情報: intention, context, details
- 関係性情報: parentId, sequence, relatedIds

### 設計原則

- **絶対パス必須**: logsDir パラメータは常に絶対パスで指定
- **日付ベースファイル**: ログは `roo-activity-YYYY-MM-DD.json` 形式で保存
- **再帰的検索**: ディレクトリを再帰的に探索（maxDepth制御）
- **型安全性**: TypeScript の readonly 型と as const を活用
- **エラーハンドリング**: Result型によるエラー処理

## テスト

- **フレームワーク**: Vitest
- **設定**: `vitest.config.ts`でNode.js環境を指定
- **カバレッジ**: v8プロバイダーを使用
- **テストファイル**: `tests/unit/search/` 配下に検索機能のテスト

## 使用技術

- **TypeScript**: ES2020, NodeNext モジュール解決
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **ライブラリ**: winston (ログ), date-fns (日付), minimatch (パターンマッチ), uuid (ID生成)
- **開発ツール**: ts-node-esm, vitest

## MCPサーバーとしての特徴

- stdio トランスポートによる通信
- Cline/Roo-Code での利用を想定
- `npx` による直接実行をサポート
- 設定可能なログディレクトリ