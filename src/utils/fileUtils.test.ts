import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Dirent } from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { findFilesRecursively, ensureLogsDirectory, getLogFileName, saveLog } from './fileUtils.js';
import { ActivityLog, LoggerConfig, LogResult } from '../types.js'; // 型定義をインポート

// --- Mocks ---
// fsPromises モジュールをモック化
vi.mock('fs/promises');
// path モジュールをモック化し、join と isAbsolute のみ実際の動作を使う
vi.mock('path', async () => {
  const actual = await vi.importActual<typeof path>('path');
  return {
    ...actual,
    join: (...paths: string[]) => actual.join(...paths),
    isAbsolute: (p: string) => actual.isAbsolute(p), // isAbsolute も実際の動作を使う
  };
});
// date-fns モジュールをモック化
vi.mock('date-fns');
// uuid モジュールをモック化
vi.mock('uuid');

// --- Test Data & Helpers ---
const mockFs = vi.mocked(fsPromises);
const mockFormat = vi.mocked(format);
const mockUuidv4 = vi.mocked(uuidv4);

// fs.Dirent のモックオブジェクトを作成するヘルパー関数
const createMockDirent = (name: string, type: 'file' | 'directory'): Dirent => {
  return {
    name,
    isFile: () => type === 'file',
    isDirectory: () => type === 'directory',
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  } as Dirent;
};

const testConfig: LoggerConfig = {
  logsDir: '/fake/logs',
  logFilePrefix: 'test-prefix-',
  logFileExtension: '.testlog',
};

const testLog: ActivityLog = {
  id: 'test-uuid',
  timestamp: new Date().toISOString(),
  type: 'decision_made',
  level: 'info',
  summary: 'Test log entry',
};

// --- Global Hooks ---
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.resetAllMocks();
  // console.error と console.warn をスパイ
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  // デフォルトのモック設定
  mockFormat.mockReturnValue('2025-03-30'); // 固定の日付を返すように
  mockUuidv4.mockImplementation(() => new TextEncoder().encode('test-uuid')); // 文字列を Uint8Array に変換して返す
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  vi.restoreAllMocks();
});


// --- Test Suites ---
describe('findFilesRecursively', () => {
  // (既存の findFilesRecursively のテストスイートはそのまま)
  it('空のディレクトリの場合、空の配列を返すこと', async () => {
    mockFs.readdir.mockResolvedValue([]);
    const result = await findFilesRecursively('/fake/dir', 'prefix-', '.json', 3);
    expect(result).toEqual([]);
    expect(mockFs.readdir).toHaveBeenCalledWith('/fake/dir', { withFileTypes: true });
  });

  it('条件に一致するファイルのみを返すこと', async () => {
    const dirents: Dirent[] = [
      createMockDirent('prefix-file1.json', 'file'),
      createMockDirent('other-file.txt', 'file'),
      createMockDirent('prefix-file2.json', 'file'),
      createMockDirent('subdir', 'directory'),
    ];
    mockFs.readdir.mockResolvedValue(dirents);
    const result = await findFilesRecursively('/fake/dir', 'prefix-', '.json', 0);
    expect(result).toEqual([
      path.join('/fake/dir', 'prefix-file1.json'),
      path.join('/fake/dir', 'prefix-file2.json'),
    ]);
    expect(mockFs.readdir).toHaveBeenCalledTimes(1);
    expect(mockFs.readdir).toHaveBeenCalledWith('/fake/dir', { withFileTypes: true });
  });

  it('サブディレクトリを再帰的に検索すること (maxDepth内)', async () => {
    const rootDirents: Dirent[] = [
      createMockDirent('prefix-root-file.json', 'file'),
      createMockDirent('subdir1', 'directory'),
      createMockDirent('other.txt', 'file'),
    ];
    const subdir1Dirents: Dirent[] = [
      createMockDirent('prefix-sub1-file.json', 'file'),
      createMockDirent('subdir2', 'directory'),
    ];
    const subdir2Dirents: Dirent[] = [
      createMockDirent('prefix-sub2-file.json', 'file'),
    ];

    mockFs.readdir.mockImplementation(async (dirPath) => {
        const fakeDir = '/fake/dir';
        const subdir1 = path.join(fakeDir, 'subdir1');
        const subdir2 = path.join(subdir1, 'subdir2');

        if (dirPath === fakeDir) return rootDirents;
        if (dirPath === subdir1) return subdir1Dirents;
        if (dirPath === subdir2) return subdir2Dirents;
        return [];
    });

    const result = await findFilesRecursively('/fake/dir', 'prefix-', '.json', 1);

    expect(result).toEqual([
      path.join('/fake/dir', 'prefix-root-file.json'),
      path.join('/fake/dir/subdir1', 'prefix-sub1-file.json'),
    ]);
    expect(mockFs.readdir).toHaveBeenCalledTimes(2);
    expect(mockFs.readdir).toHaveBeenCalledWith('/fake/dir', { withFileTypes: true });
    expect(mockFs.readdir).toHaveBeenCalledWith(path.join('/fake/dir', 'subdir1'), { withFileTypes: true });
    expect(mockFs.readdir).not.toHaveBeenCalledWith(path.join('/fake/dir/subdir1', 'subdir2'), { withFileTypes: true });
  });

 it('maxDepth が 0 の場合、サブディレクトリを検索しないこと', async () => {
    const dirents: Dirent[] = [
        createMockDirent('prefix-file1.json', 'file'),
        createMockDirent('subdir', 'directory'),
        createMockDirent('prefix-file2.json', 'file'),
    ];
    mockFs.readdir.mockResolvedValue(dirents);

    const result = await findFilesRecursively('/fake/dir', 'prefix-', '.json', 0);
    expect(result).toEqual([
      path.join('/fake/dir', 'prefix-file1.json'),
      path.join('/fake/dir', 'prefix-file2.json'),
    ]);
    expect(mockFs.readdir).toHaveBeenCalledTimes(1);
    expect(mockFs.readdir).toHaveBeenCalledWith('/fake/dir', { withFileTypes: true });
  });


  it('fs.readdir がエラーを返した場合、空の配列を返し、エラーをログに出力すること', async () => {
    const error = new Error('Permission denied');
    mockFs.readdir.mockRejectedValue(error);

    const result = await findFilesRecursively('/forbidden/dir', 'prefix-', '.json', 1);

    expect(result).toEqual([]);
    expect(mockFs.readdir).toHaveBeenCalledWith('/forbidden/dir', { withFileTypes: true });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error reading directory /forbidden/dir:', error);
  });
});

describe('ensureLogsDirectory', () => {
  it('ディレクトリが存在する場合、mkdir を呼び出さないこと', async () => {
    mockFs.access.mockResolvedValue(undefined); // access が成功する

    await ensureLogsDirectory('/existing/dir');

    expect(mockFs.access).toHaveBeenCalledWith('/existing/dir');
    expect(mockFs.mkdir).not.toHaveBeenCalled();
  });

  it('ディレクトリが存在しない場合、mkdir を呼び出すこと', async () => {
    const error = new Error('ENOENT'); // access が失敗するエラー
    (error as any).code = 'ENOENT';
    mockFs.access.mockRejectedValue(error);
    mockFs.mkdir.mockResolvedValue(undefined); // mkdir は成功する

    await ensureLogsDirectory('/new/dir');

    expect(mockFs.access).toHaveBeenCalledWith('/new/dir');
    expect(mockFs.mkdir).toHaveBeenCalledWith('/new/dir', { recursive: true });
  });

  it('access が ENOENT 以外のエラーを投げた場合、エラーが再スローされること', async () => {
    const error = new Error('Permission denied');
    mockFs.access.mockRejectedValue(error);

    await expect(ensureLogsDirectory('/forbidden/dir')).rejects.toThrow('Permission denied');

    expect(mockFs.access).toHaveBeenCalledWith('/forbidden/dir');
    expect(mockFs.mkdir).not.toHaveBeenCalled();
  });
});

describe('getLogFileName', () => {
  it('デフォルト設定と現在の日付で正しいファイル名を生成すること', () => {
    const config = { logFilePrefix: 'roo-activity-', logFileExtension: '.json' }; // デフォルト値を明示的に渡す
    const date = new Date(2025, 2, 30); // March 30, 2025
    mockFormat.mockReturnValue('2025-03-30'); // 固定の日付文字列

    const fileName = getLogFileName(config, date);

    expect(fileName).toBe('roo-activity-2025-03-30.json');
    expect(mockFormat).toHaveBeenCalledWith(date, 'yyyy-MM-dd');
  });

  it('カスタム設定と指定された日付で正しいファイル名を生成すること', () => {
    const config = { logFilePrefix: 'custom-', logFileExtension: '.log' };
    const date = new Date(2024, 11, 25); // December 25, 2024
    mockFormat.mockReturnValue('2024-12-25'); // 固定の日付文字列

    const fileName = getLogFileName(config, date);

    expect(fileName).toBe('custom-2024-12-25.log');
    expect(mockFormat).toHaveBeenCalledWith(date, 'yyyy-MM-dd');
  });
});

describe('saveLog', () => {
  const logFilePath = path.join(testConfig.logsDir, `${testConfig.logFilePrefix}2025-03-30${testConfig.logFileExtension}`);

  beforeEach(() => {
    // ensureLogsDirectory と getLogFileName は常に成功すると仮定
    // (これらの関数のテストは別に行うため)
    // vi.spyOn(fileUtils, 'ensureLogsDirectory').mockResolvedValue(undefined); // モジュール自身はモックできない
    // vi.spyOn(fileUtils, 'getLogFileName').mockReturnValue('test-prefix-2025-03-30.testlog');
    // -> 代わりに fs.access/mkdir と format をモックする
    mockFs.access.mockResolvedValue(undefined); // ディレクトリは存在すると仮定
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFormat.mockReturnValue('2025-03-30');
  });

  it('新しいログファイルを作成し、ログを書き込むこと', async () => {
    const error = new Error('ENOENT'); // readFile が失敗するエラー
    (error as any).code = 'ENOENT';
    mockFs.readFile.mockRejectedValue(error);
    mockFs.writeFile.mockResolvedValue(undefined); // writeFile は成功する

    const result = await saveLog(testLog, testConfig);

    expect(mockFs.access).toHaveBeenCalledWith(testConfig.logsDir); // ensureLogsDirectory の動作確認
    expect(mockFs.mkdir).not.toHaveBeenCalled();
    expect(mockFormat).toHaveBeenCalledWith(expect.any(Date), 'yyyy-MM-dd'); // getLogFileName の動作確認
    expect(mockFs.readFile).toHaveBeenCalledWith(logFilePath, 'utf-8');
    expect(mockFs.writeFile).toHaveBeenCalledWith(logFilePath, JSON.stringify([testLog], null, 2), 'utf-8');
    expect(result).toEqual({ success: true, value: { logId: testLog.id } });
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('既存のログファイルにログを追記すること', async () => {
    const existingLog: ActivityLog = { id: 'existing-uuid', timestamp: 'prev-time', type: 'command_execution', level: 'debug', summary: 'Existing log' };
    const existingLogs = [existingLog];
    mockFs.readFile.mockResolvedValue(JSON.stringify(existingLogs)); // 既存のログを返す
    mockFs.writeFile.mockResolvedValue(undefined);

    const result = await saveLog(testLog, testConfig);

    expect(mockFs.readFile).toHaveBeenCalledWith(logFilePath, 'utf-8');
    expect(mockFs.writeFile).toHaveBeenCalledWith(logFilePath, JSON.stringify([...existingLogs, testLog], null, 2), 'utf-8');
    expect(result).toEqual({ success: true, value: { logId: testLog.id } });
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('カスタムログディレクトリを使用すること', async () => {
    const customDir = '/custom/logs';
    const customLogFilePath = path.join(customDir, `${testConfig.logFilePrefix}2025-03-30${testConfig.logFileExtension}`);
    const error = new Error('ENOENT');
    (error as any).code = 'ENOENT';
    mockFs.readFile.mockRejectedValue(error);
    mockFs.writeFile.mockResolvedValue(undefined);

    const result = await saveLog(testLog, testConfig, customDir);

    expect(mockFs.access).toHaveBeenCalledWith(customDir); // カスタムディレクトリを確認
    expect(mockFs.readFile).toHaveBeenCalledWith(customLogFilePath, 'utf-8');
    expect(mockFs.writeFile).toHaveBeenCalledWith(customLogFilePath, JSON.stringify([testLog], null, 2), 'utf-8');
    expect(result).toEqual({ success: true, value: { logId: testLog.id } });
  });

  it('カスタムログディレクトリが絶対パスでない場合、エラーを返すこと', async () => {
    const customDir = 'relative/logs'; // 相対パス
    const result = await saveLog(testLog, testConfig, customDir);

    expect(result).toEqual({ success: false, error: { message: `ログディレクトリは絶対パスで指定する必要があります: ${customDir}` } });
    expect(mockFs.access).not.toHaveBeenCalled();
    expect(mockFs.readFile).not.toHaveBeenCalled();
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });

  it('readFile が ENOENT 以外のエラーを投げた場合、警告をログに出力し、新規ファイルとして書き込むこと', async () => {
    const readError = new Error('Permission denied');
    mockFs.readFile.mockRejectedValue(readError);
    mockFs.writeFile.mockResolvedValue(undefined);

    const result = await saveLog(testLog, testConfig);

    expect(mockFs.readFile).toHaveBeenCalledWith(logFilePath, 'utf-8');
    expect(consoleWarnSpy).toHaveBeenCalledWith(`既存ログファイルの読み込みに失敗しました: ${logFilePath}`, readError);
    expect(mockFs.writeFile).toHaveBeenCalledWith(logFilePath, JSON.stringify([testLog], null, 2), 'utf-8'); // 新規扱い
    expect(result).toEqual({ success: true, value: { logId: testLog.id } });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

   it('ログファイルの内容がJSON配列でない場合、警告をログに出力し、新規ファイルとして書き込むこと', async () => {
    mockFs.readFile.mockResolvedValue('{"invalid": "json"}'); // 配列でないJSON
    mockFs.writeFile.mockResolvedValue(undefined);

    const result = await saveLog(testLog, testConfig);

    expect(mockFs.readFile).toHaveBeenCalledWith(logFilePath, 'utf-8');
    expect(consoleWarnSpy).toHaveBeenCalledWith(`ログファイルの内容が配列形式ではありません: ${logFilePath}。新規ファイルとして扱います。`);
    expect(mockFs.writeFile).toHaveBeenCalledWith(logFilePath, JSON.stringify([testLog], null, 2), 'utf-8'); // 新規扱い
    expect(result).toEqual({ success: true, value: { logId: testLog.id } });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('writeFile がエラーを投げた場合、エラーをログに出力し、失敗の結果を返すこと', async () => {
    const writeError = new Error('Disk full');
    mockFs.readFile.mockResolvedValue('[]'); // 既存ファイルは空
    mockFs.writeFile.mockRejectedValue(writeError);

    const result = await saveLog(testLog, testConfig);

    expect(mockFs.writeFile).toHaveBeenCalledWith(logFilePath, JSON.stringify([testLog], null, 2), 'utf-8');
    expect(consoleErrorSpy).toHaveBeenCalledWith('ログの保存中にエラーが発生しました:', writeError);
    expect(result).toEqual({ success: false, error: { message: `ログ保存エラー: ${writeError.message}` } });
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('ensureLogsDirectory (内部の fs.access/mkdir) がエラーを投げた場合、失敗の結果を返すこと', async () => {
    const accessError = new Error('Permission denied');
    mockFs.access.mockRejectedValue(accessError); // access が失敗

    const result = await saveLog(testLog, testConfig);

    expect(mockFs.access).toHaveBeenCalledWith(testConfig.logsDir);
    expect(mockFs.mkdir).not.toHaveBeenCalled(); // mkdir は呼ばれない
    expect(mockFs.readFile).not.toHaveBeenCalled();
    expect(mockFs.writeFile).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('ログの保存中にエラーが発生しました:', accessError);
    expect(result).toEqual({ success: false, error: { message: `ログ保存エラー: ${accessError.message}` } });
  });
});