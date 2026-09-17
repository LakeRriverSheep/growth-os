import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun, type Row } from "@/lib/db";
import { safeJson, strField, isDateStr, jsonErr } from "@/lib/http";
import { fromMin, toMin } from "@/lib/date";
import { isKind, type EventKind, type PlanEvent } from "@/lib/planner";

// 周计划日历里自己排的日程
// GET    /api/events?from=YYYY-MM-DD&to=YYYY-MM-DD
//          → { events: PlanEvent[] }  范围命中的 + 所有「每周重复」的
// POST   /api/events   body { date, start, end, title, kind, note, weekly } → { ok }
// PATCH  /api/events   body { id, ...同上 }                                → { ok }
// DELETE /api/events?id=1                                                  → { ok }

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_MIN = 23 * 60 + 59;

type Clean = {
  date: string;
  start: string;
  end: string;
  title: string;
  kind: EventKind;
  note: string;
  weekly: number;
};

function toEvent(r: Row): PlanEvent {
  return {
    id: Number(r.id),
    date: (r.date as string) ?? "",
    start: (r.start as string) ?? "",
    end: (r.end as string) ?? "",
    title: (r.title as string) ?? "",
    kind: isKind(r.kind) ? r.kind : "life",
    note: (r.note as string) ?? "",
    weekly: !!r.weekly,
  };
}

/** 字段清洗 + 时间合理性兜底；不合法返回 null */
function readEvent(body: Record<string, unknown>): Clean | null {
  const date = strField(body.date, 10);
  if (!isDateStr(date)) return null;

  const title = strField(body.title, 60).trim();
  if (!title) return null;

  const rawStart = strField(body.start, 5);
  if (!TIME_RE.test(rawStart)) return null;

  const rawEnd = strField(body.end, 5);
  const s = toMin(rawStart);
  let e = TIME_RE.test(rawEnd) ? toMin(rawEnd) : s + 60;
  if (e <= s) e = Math.min(MAX_MIN, s + 60);

  return {
    date,
    start: rawStart,
    end: fromMin(e),
    title,
    kind: isKind(body.kind) ? body.kind : "life",
    note: strField(body.note, 200).trim(),
    weekly: body.weekly ? 1 : 0,
  };
}

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  if (!isDateStr(from) || !isDateStr(to)) return jsonErr("from / to 必须是 YYYY-MM-DD");
  try {
    const rows = await dbAll<Row>(
      "SELECT * FROM events WHERE weekly = 1 OR (date >= ? AND date <= ?) ORDER BY start, id",
      from,
      to,
    );
    return NextResponse.json({ events: rows.map(toEvent) });
  } catch {
    return jsonErr("读取日程失败", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");
  const ev = readEvent(body);
  if (!ev) return jsonErr("请填写标题和合法的日期、时间");
  try {
    await dbRun(
      "INSERT INTO events (date, start, end, title, kind, note, weekly, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))",
      ev.date,
      ev.start,
      ev.end,
      ev.title,
      ev.kind,
      ev.note,
      ev.weekly,
    );
    const row = await dbAll<Row>("SELECT last_insert_rowid() AS id");
    return NextResponse.json({ ok: true, id: Number(row[0]?.id ?? 0) });
  } catch {
    return jsonErr("保存日程失败，请稍后重试", 500);
  }
}

export async function PATCH(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return jsonErr("id 不合法");
  const ev = readEvent(body);
  if (!ev) return jsonErr("请填写标题和合法的日期、时间");
  try {
    await dbRun(
      "UPDATE events SET date = ?, start = ?, end = ?, title = ?, kind = ?, note = ?, weekly = ?, updated_at = datetime('now','localtime') WHERE id = ?",
      ev.date,
      ev.start,
      ev.end,
      ev.title,
      ev.kind,
      ev.note,
      ev.weekly,
      id,
    );
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("更新日程失败，请稍后重试", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return jsonErr("id 不合法");
  try {
    await dbRun("DELETE FROM events WHERE id = ?", id);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("删除日程失败，请稍后重试", 500);
  }
}
