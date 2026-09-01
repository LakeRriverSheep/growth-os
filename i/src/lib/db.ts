import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// 数据库文件放项目 data/ 目录，跟着 git 仓库走（双机同步）
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "i.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    date TEXT PRIMARY KEY,
    training TEXT DEFAULT '',
    diet TEXT DEFAULT '',
    calories TEXT DEFAULT '',
    done INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);
