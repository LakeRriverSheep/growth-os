import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { safeJson, isDateStr, strField, jsonErr } from "@/lib/http";

// 时间线打勾项（热身 / 各餐内容）：
// GET  /api/check-items?date=YYYY-MM-DD            → 当天全部 { item, checked }
// GET  /api/check-items?date=...&item=xxx          → 单个
// POST /api/check-items  body: { date, item, checked }
// item 由前端约定唯一（如 warmup:0、lunch:1），存数据库，刷新/换端不丢
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  const item = req.nextUrl.searchParams.get("item");
  if (!date || !isDateStr(date)) {
    return jsonErr("date 必填，格式应为 YYYY-MM-DD");
  }
  try {
    if (item) {
      const rows = await dbAll<{ item: string; checked: number }>(
        "SELECT item, checked FROM check_items WHERE date = ? AND item = ?",
        date,
        item,
      );
      return NextResponse.json(rows[0] ?? null);
    }
    const rows = await dbAll<{ item: string; checked: number }>(
      "SELECT item, checked FROM check_items WHERE date = ?",
      date,
    );
    return NextResponse.json(rows);
  } catch {
    return jsonErr("读取勾选状态失败", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");

  const date = typeof body.date === "string" ? body.date : "";
  const item = strField(body.item, 200);
  if (!isDateStr(date) || !item) {
    return jsonErr("date 与 item 必填（date 格式 YYYY-MM-DD）");
  }
  const checked = body.checked ? 1 : 0;

  try {
    await dbRun(
      `INSERT INTO check_items (date, item, checked, updated_at)
       VALUES (?, ?, ?, datetime('now', 'localtime'))
       ON CONFLICT(date, item) DO UPDATE SET
         checked = excluded.checked,
         updated_at = excluded.updated_at`,
      date,
      item,
      checked,
    );
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("保存勾选状态失败，请稍后重试", 500);
  }
}
