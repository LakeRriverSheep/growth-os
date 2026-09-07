import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun, type Row } from "@/lib/db";
import { safeJson, strField, jsonErr } from "@/lib/http";

// 每周时间线自定义（按星期几）
// GET  /api/week-schedule?weekday=周一
//    → { edits: { node: { time, hidden } }, customs: [{ id, time, title, note }] }
// POST /api/week-schedule body { weekday, edits, customs }  → 整份替换该星期几的自定义
const WEEKDAYS = new Set(["周一", "周二", "周三", "周四", "周五", "周六", "周日"]);

export async function GET(req: NextRequest) {
  const weekday = req.nextUrl.searchParams.get("weekday") ?? "";
  if (!WEEKDAYS.has(weekday)) return jsonErr("weekday 必须为 周一..周日");
  try {
    const editRows = await dbAll<Row>("SELECT node, time, hidden FROM week_node_edits WHERE weekday = ?", weekday);
    const customRows = await dbAll<Row>(
      "SELECT id, time, title, note FROM week_custom WHERE weekday = ? ORDER BY id",
      weekday,
    );
    const edits: Record<string, { time: string; hidden: boolean }> = {};
    for (const r of editRows) edits[r.node as string] = { time: (r.time as string) ?? "", hidden: !!r.hidden };
    const customs = customRows.map((r) => ({
      id: r.id as number,
      time: (r.time as string) ?? "",
      title: (r.title as string) ?? "",
      note: (r.note as string) ?? "",
    }));
    return NextResponse.json({ edits, customs });
  } catch {
    return jsonErr("读取周计划失败", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");
  const weekday = typeof body.weekday === "string" ? body.weekday : "";
  if (!WEEKDAYS.has(weekday)) return jsonErr("weekday 必须为 周一..周日");

  const editsIn = body.edits && typeof body.edits === "object" && !Array.isArray(body.edits)
    ? (body.edits as Record<string, unknown>)
    : {};
  const customsIn = Array.isArray(body.customs) ? (body.customs as Record<string, unknown>[]) : [];

  const editClean: { node: string; time: string; hidden: number }[] = [];
  for (const [node, v] of Object.entries(editsIn)) {
    const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
    editClean.push({
      node: strField(node, 50),
      time: strField(o.time, 12),
      hidden: o.hidden ? 1 : 0,
    });
  }
  const customClean = customsIn
    .map((c) => ({
      time: strField(c.time, 12),
      title: strField(c.title, 200),
      note: strField(c.note, 500),
    }))
    .filter((c) => c.time || c.title);

  try {
    // 整份替换：先删该星期几的旧数据再写入（数据量小，事务简单可靠）
    await dbRun("DELETE FROM week_node_edits WHERE weekday = ?", weekday);
    await dbRun("DELETE FROM week_custom WHERE weekday = ?", weekday);
    for (const e of editClean) {
      await dbRun(
        "INSERT INTO week_node_edits (weekday, node, time, hidden, updated_at) VALUES (?, ?, ?, ?, datetime('now','localtime'))",
        weekday,
        e.node,
        e.time,
        e.hidden,
      );
    }
    for (const c of customClean) {
      await dbRun(
        "INSERT INTO week_custom (weekday, time, title, note, updated_at) VALUES (?, ?, ?, ?, datetime('now','localtime'))",
        weekday,
        c.time,
        c.title,
        c.note,
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("保存周计划失败，请稍后重试", 500);
  }
}
