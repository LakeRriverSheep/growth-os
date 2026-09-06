import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { safeJson, isDateStr, strField, jsonErr } from "@/lib/http";

// /api/exercise-logs?date=2026-09-06  → 那天所有动作记录
// /api/exercise-logs?date=2026-09-06&name=杠铃平板卧推  → 单个动作
// POST body: { date, name, checked?, weight?, reps?, sets? }
// → 单条 upsert，刷新不丢
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  const name = req.nextUrl.searchParams.get("name");
  if (!date || !isDateStr(date)) {
    return jsonErr("date 必填，格式应为 YYYY-MM-DD");
  }
  try {
    if (name) {
      const row = await dbAll<{ exercise_name: string; checked: number; weight: string; reps: string; sets: string }>(
        "SELECT exercise_name, checked, weight, reps, sets FROM exercise_logs WHERE date = ? AND exercise_name = ?",
        date,
        name,
      );
      return NextResponse.json(row[0] ?? null);
    }
    const rows = await dbAll<{ exercise_name: string; checked: number; weight: string; reps: string; sets: string }>(
      "SELECT exercise_name, checked, weight, reps, sets FROM exercise_logs WHERE date = ?",
      date,
    );
    return NextResponse.json(rows);
  } catch {
    return jsonErr("读取动作记录失败", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");

  const date = typeof body.date === "string" ? body.date : "";
  const exName = strField(body.name, 120);
  if (!isDateStr(date) || !exName) {
    return jsonErr("date 与 name 必填（date 格式 YYYY-MM-DD）");
  }

  const checked = body.checked ? 1 : 0;
  const weight = strField(body.weight, 50);
  const reps = strField(body.reps, 50);
  const sets = strField(body.sets, 50);

  try {
    await dbRun(
      `INSERT INTO exercise_logs (date, exercise_name, checked, weight, reps, sets, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
       ON CONFLICT(date, exercise_name) DO UPDATE SET
         checked = excluded.checked,
         weight = excluded.weight,
         reps = excluded.reps,
         sets = excluded.sets,
         updated_at = excluded.updated_at`,
      date,
      exName,
      checked,
      weight,
      reps,
      sets,
    );
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("保存动作记录失败，请稍后重试", 500);
  }
}
