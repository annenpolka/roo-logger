# 型システムリファクタリング計画

## 概要

Roo Activity Loggerの型安全性向上を目的とした段階的リファクタリング計画。
現在の`any`型使用箇所を排除し、実行時とコンパイル時の両方で型安全性を確保する。

## 現在の型システムの課題

### 1. MCPプロトコルとの型不整合
- MCPクライアントからの引数が`Record<string, unknown> | undefined`として受信される
- 強制的な型アサーション(`as unknown as Type`)が必要
- 実行時型チェックが不十分

### 2. 型定義の分散と重複
- `src/types/core.ts` - 基本型定義
- `src/types/search.ts` - 検索関連型
- `src/functions/validation.ts` - 入力検証型
- 同じ概念が複数箇所で重複定義されている

### 3. `any`型の使用箇所（修正済み）
- ✅ `src/index.ts:214,230` - MCP引数の型アサーション
- ✅ `src/functions/validation.ts:49` - 入力検証関数の引数
- ✅ `src/tools/mcp-tools.ts:17` - MCPツール関数の引数
- ✅ `src/types/core.ts:28` & `src/functions/validation.ts:43` - `details`フィールド

## 段階的改善プラン

### Phase 1: 基盤整備
**目標**: スキーマベースの型システム導入

1. **依存関係追加**
   ```bash
   npm install zod
   npm install -D @types/node
   ```

2. **MCPプロトコル型定義作成**
   ```typescript
   // src/types/mcp-protocol.ts
   import { z } from 'zod'
   
   export const LogActivityArgsSchema = z.object({
     type: z.enum(['command_execution', 'code_generation', 'file_operation', 'error_encountered', 'decision_made', 'conversation']),
     summary: z.string().min(1),
     intention: z.string().min(1),
     context: z.string().min(1),
     logsDir: z.string().refine(path => require('path').isAbsolute(path), {
       message: "Must be an absolute path"
     }),
     level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
     details: z.record(z.unknown()).optional(),
     parentId: z.string().optional(),
     sequence: z.number().min(0).optional(),
     relatedIds: z.array(z.string()).optional()
   })
   
   export const GetLogFilesArgsSchema = z.object({
     logsDir: z.string(),
     limit: z.number().positive().max(1000).default(10),
     offset: z.number().min(0).default(0),
     logFilePrefix: z.string().default('roo-activity-'),
     logFileExtension: z.string().default('.json'),
     maxDepth: z.number().positive().max(10).default(3)
   })
   
   export const SearchLogsArgsSchema = z.object({
     logsDir: z.string(),
     logFilePrefix: z.string().default('roo-activity-'),
     logFileExtension: z.string().default('.json'),
     type: z.enum(['command_execution', 'code_generation', 'file_operation', 'error_encountered', 'decision_made', 'conversation']).optional(),
     level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
     startDate: z.string().optional(),
     endDate: z.string().optional(),
     searchText: z.string().optional(),
     limit: z.number().positive().max(1000).default(50),
     offset: z.number().min(0).default(0),
     parentId: z.string().optional(),
     sequenceFrom: z.number().min(0).optional(),
     sequenceTo: z.number().min(0).optional(),
     relatedId: z.string().optional(),
     relatedIds: z.array(z.string()).optional()
   })
   
   // 型の自動生成
   export type LogActivityArgs = z.infer<typeof LogActivityArgsSchema>
   export type GetLogFilesArgs = z.infer<typeof GetLogFilesArgsSchema>
   export type SearchLogsArgs = z.infer<typeof SearchLogsArgsSchema>
   ```

3. **型ガードユーティリティ作成**
   ```typescript
   // src/utils/type-guards.ts
   import { z } from 'zod'
   
   export function createTypeGuard<T>(schema: z.ZodSchema<T>) {
     return (value: unknown): value is T => {
       return schema.safeParse(value).success
     }
   }
   
   export function createValidator<T>(schema: z.ZodSchema<T>) {
     return (value: unknown): Result<T, ValidationError> => {
       const result = schema.safeParse(value)
       if (result.success) {
         return success(result.data)
       } else {
         return failure(new ValidationError(result.error.message))
       }
     }
   }
   ```

### Phase 2: ハンドラー改善
**目標**: 型安全なMCPリクエストハンドリング

1. **型安全なMCPハンドラー作成**
   ```typescript
   // src/handlers/mcp-handlers.ts
   import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
   import { LogActivityArgsSchema, GetLogFilesArgsSchema, SearchLogsArgsSchema } from '../types/mcp-protocol.js'
   
   export class TypedMCPHandler {
     static async handleLogActivity(args: unknown): Promise<CallToolResult> {
       const parseResult = LogActivityArgsSchema.safeParse(args)
       if (!parseResult.success) {
         return this.createErrorResult(`Invalid arguments: ${parseResult.error.message}`)
       }
       
       const result = await logActivityTool(parseResult.data)
       return this.createSuccessResult(result)
     }
   
     static async handleGetLogFiles(args: unknown): Promise<CallToolResult> {
       const parseResult = GetLogFilesArgsSchema.safeParse(args)
       if (!parseResult.success) {
         return this.createErrorResult(`Invalid arguments: ${parseResult.error.message}`)
       }
       
       const result = await getLogFilesTool(parseResult.data)
       return this.createSuccessResult(result)
     }
   
     static async handleSearchLogs(args: unknown): Promise<CallToolResult> {
       const parseResult = SearchLogsArgsSchema.safeParse(args)
       if (!parseResult.success) {
         return this.createErrorResult(`Invalid arguments: ${parseResult.error.message}`)
       }
       
       const result = await searchLogsTool(parseResult.data)
       return this.createSuccessResult(result)
     }
   
     private static createErrorResult(message: string): CallToolResult {
       return {
         content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
         isError: true
       }
     }
   
     private static createSuccessResult(result: any): CallToolResult {
       if (result.type === 'success') {
         return {
           content: [{ type: 'text', text: JSON.stringify(result.value, null, 2) }]
         }
       } else {
         throw new Error(result.error.message)
       }
     }
   }
   ```

2. **index.tsのリファクタリング**
   ```typescript
   // src/index.ts (改善版)
   server.setRequestHandler(CallToolRequestSchema, async (request) => {
     const { name, arguments: args } = request.params
   
     try {
       switch (name) {
         case 'log_activity':
           return await TypedMCPHandler.handleLogActivity(args)
         case 'get_log_files':
           return await TypedMCPHandler.handleGetLogFiles(args)
         case 'search_logs':
           return await TypedMCPHandler.handleSearchLogs(args)
         default:
           throw new Error(`Unknown tool: ${name}`)
       }
     } catch (error) {
       throw new Error(`Tool execution failed: ${error.message}`)
     }
   })
   ```

### Phase 3: 型統合
**目標**: 重複型定義の統合と中央集権化

1. **型定義の中央集権化**
   ```typescript
   // src/types/index.ts
   export * from './core.js'
   export * from './result.js'
   export * from './search.js'
   export * from './mcp-protocol.js'
   
   // 重複型の統合
   export type { LogActivityArgs as ActivityLogInput } from './mcp-protocol.js'
   ```

2. **既存型定義の段階的置き換え**
   - `ActivityLogInput`を`LogActivityArgs`に統合
   - 検索関連型の統一
   - 不要な型定義の削除

### Phase 4: エラーハンドリング改善
**目標**: 型安全で詳細なエラー処理

1. **型安全なエラー定義**
   ```typescript
   // src/types/errors.ts
   export type MCPError = 
     | { type: 'validation'; field: string; message: string; value?: unknown }
     | { type: 'file_system'; path: string; operation: string; message: string }
     | { type: 'internal'; component: string; message: string }
     | { type: 'mcp_protocol'; tool: string; message: string }
   
   export class TypedMCPError extends Error {
     constructor(public readonly mcpError: MCPError) {
       super(`[${mcpError.type}] ${mcpError.message}`)
       this.name = 'TypedMCPError'
     }
   
     toJSON() {
       return {
         type: this.mcpError.type,
         message: this.message,
         details: this.mcpError
       }
     }
   }
   ```

2. **詳細なバリデーションエラー**
   - フィールド単位のエラー情報
   - 修正方法の提案
   - MCPクライアント向けエラーフォーマット

## 完了後の利点

1. **コンパイル時型安全性**: TypeScriptの型チェック機能をフル活用
2. **実行時型安全性**: Zodによる実行時スキーマ検証
3. **MCPプロトコル整合性**: クライアント-サーバー間の型整合性保証
4. **保守性向上**: 型定義の中央集権化と重複排除
5. **エラー処理改善**: 詳細で一貫性のあるエラーメッセージ
6. **開発体験向上**: IDEでの自動補完とエラー検出

## 参考資料

- [Zod公式ドキュメント](https://zod.dev/)
- [TypeScript型ガード](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [MCPプロトコル仕様](https://modelcontextprotocol.io/)

## 変更履歴

- 2025-01-09: 初版作成、Phase 1の基盤整備計画策定
- 2025-01-09: `any`型使用箇所の修正完了（unknown型への置き換え）