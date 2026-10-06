import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { safeJson, isDateStr, strField, jsonErr } from "@/lib/http";
import { QUOTAS } from "@/lib/dailyGoals";

// 每日目标的当天完成量 + 本周达成次数
// GET  /api/goals?date=YYYY-MM-DD → { date, values, weekDone }
//   values:   { ielts: 3, fitness: 1.5, study: 1 }  当天各项完成量
//   weekDone: { ielts: 3, fitness: 2 }              本周（周一起）各项达标天数
// POST /api/goals  body: { date, item, value }

const WEEKLY_TARGETS = Object.fromEntries(QUOTAS.map((q) => [q.key, q]));

/** 该日期所在周的周一（本地时区） */
function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  const dow = (d.getDay() + 6) % 7; // 周一 = 0
  d.setDate(d.getDate() - dow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!isDateStr(date)) return jsonErr("date 必填，格式应为 YYYY-MM-DD");
  try {
    const from = mondayOf(date);
    const rows = await dbAll<{ date: string; item: string; value: number }>(
      "SELECT date, item, value FROM daily_goals WHERE date >= ? AND date <= ?",
      from,
      date,
    );
    const values: Record<string, number> = {};
    const weekDone: Record<string, number> = {};
    for (const q of QUOTAS) weekDone[q.key] = 0;
    for (const r of rows) {
      const v = Number(r.value) || 0;
      if (r.date === date) values[r.item] = v;
      const q = WEEKLY_TARGETS[r.item];
      if (q && v >= q.daily) weekDone[r.item] = (weekDone[r.item] ?? 0) + 1;
    }
    return NextResponse.json({ date, from, values, weekDone });
  } catch {
    return jsonErr("读取每日目标失败", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");
  const date = typeof body.date === "string" ? body.date : "";
  const item = strField(body.item, 40);
  const value = Number(body.value);
  if (!isDateStr(date) || !item) return jsonErr("date 与 item 必填");
  if (!Number.isFinite(value) || value < 0) return jsonErr("value 必须是非负数字");
  try {
    await dbRun(
      `INSERT INTO daily_goals (date, item, value, updated_at)
       VALUES (?, ?, ?, datetime('now', 'localtime'))
       ON CONFLICT(date, item) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      date,
      item,
      Math.round(value * 100) / 100,
    );
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("保存失败", 500);
  }
}
