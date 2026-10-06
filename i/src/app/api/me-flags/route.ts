import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { safeJson, strField, jsonErr } from "@/lib/http";

// 我 · 长期建档清单（认知/见识/能力）：一次勾住就一直成立
// GET  /api/me-flags → { "c1": 1, "k2": 1 }
// POST /api/me-flags  body: { key, done }

export async function GET() {
  try {
    const rows = await dbAll<{ key: string; done: number }>(
      "SELECT key, done FROM me_flags",
    );
    const map: Record<string, boolean> = {};
    for (const r of rows) map[r.key] = !!r.done;
    return NextResponse.json(map);
  } catch {
    return jsonErr("读取长期清单失败", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");
  const key = strField(body.key, 40);
  if (!key) return jsonErr("key 必填");
  const done = body.done ? 1 : 0;
  try {
    await dbRun(
      `INSERT INTO me_flags (key, done, updated_at)
       VALUES (?, ?, datetime('now', 'localtime'))
       ON CONFLICT(key) DO UPDATE SET
         done = excluded.done,
         updated_at = excluded.updated_at`,
      key,
      done,
    );
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("保存失败", 500);
  }
}
