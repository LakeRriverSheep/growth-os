// 双模数据层：
// - 设置了 TURSO_DATABASE_URL → 云端 SQLite（生产环境 + 手机/PC/Mac 多端同一数据库）
// - 否则 → 本地 node:sqlite（data/i.db，开发用，零配置）
// 统一异步 API：dbGet / dbAll / dbRun，调用方无感切换。

import type { DatabaseSync } from "node:sqlite";
import type { Client } from "@libsql/client";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS records (
    date TEXT PRIMARY KEY,
    training TEXT DEFAULT '',
    diet TEXT DEFAULT '',
    calories TEXT DEFAULT '',
    done INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS plans (
    goal_id TEXT PRIMARY KEY,
    answers TEXT DEFAULT '{}',
    plan TEXT DEFAULT '[]',
    source TEXT DEFAULT 'template',
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`;

type SqlValue = string | number | null;
export type Row = Record<string, unknown>;

const useTurso = !!process.env.TURSO_DATABASE_URL;

let local: DatabaseSync | null = null;
let remote: Client | null = null;
let ready: Promise<void> | null = null;

async function init(): Promise<void> {
  if (useTurso) {
    const { createClient } = await import("@libsql/client");
    remote = createClient({
      url: process.env.TURSO_DATABASE_URL as string,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    await remote.executeMultiple(SCHEMA);
  } else {
    const { DatabaseSync } = await import("node:sqlite");
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    local = new DatabaseSync(path.join(dataDir, "i.db"));
    local.exec(SCHEMA);
  }
}

function ensureReady(): Promise<void> {
  if (!ready) ready = init();
  return ready;
}

export async function dbGet<T = Row>(
  sql: string,
  ...params: SqlValue[]
): Promise<T | undefined> {
  await ensureReady();
  if (remote) {
    const rs = await remote.execute({ sql, args: params });
    return rs.rows[0] as T | undefined;
  }
  return local!.prepare(sql).get(...params) as T | undefined;
}

export async function dbAll<T = Row>(
  sql: string,
  ...params: SqlValue[]
): Promise<T[]> {
  await ensureReady();
  if (remote) {
    const rs = await remote.execute({ sql, args: params });
    return rs.rows as unknown as T[];
  }
  return local!.prepare(sql).all(...params) as T[];
}

export async function dbRun(sql: string, ...params: SqlValue[]): Promise<void> {
  await ensureReady();
  if (remote) {
    await remote.execute({ sql, args: params });
    return;
  }
  local!.prepare(sql).run(...params);
}

/** 当前使用的数据库模式（调试用） */
export function dbMode(): "turso" | "local" {
  return useTurso ? "turso" : "local";
}
