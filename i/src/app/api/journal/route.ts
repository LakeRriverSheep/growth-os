import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun, type Row } from "@/lib/db";
import { safeJson, strField, isDateStr, jsonErr } from "@/lib/http";
import { isJournalKind, type JournalEntry } from "@/lib/journal";

// 周记录图文条目
// GET    /api/journal?from=YYYY-MM-DD&to=YYYY-MM-DD → { entries: JournalEntry[] }
// POST   /api/journal   body { date, kind, title, body, images[] } → { ok, id }
// PATCH  /api/journal   body { id, ...同上 }                      → { ok }
// DELETE /api/journal?id=1                                        → { ok }

const MAX_IMAGES = 9;

function parseImages(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.startsWith("http"))
    .slice(0, MAX_IMAGES);
}

function toEntry(r: Row): JournalEntry {
  let images: string[] = [];
  try {
    const parsed = JSON.parse((r.images as string) || "[]");
    if (Array.isArray(parsed)) images = parsed.filter((x) => typeof x === "string");
  } catch {
    images = [];
  }
  return {
    id: Number(r.id),
    date: (r.date as string) ?? "",
    kind: isJournalKind(r.kind) ? r.kind : "life",
    title: (r.title as string) ?? "",
    body: (r.body as string) ?? "",
    images,
    updated_at: (r.updated_at as string) ?? "",
  };
}

function readEntry(body: Record<string, unknown>): {
  date: string;
  kind: string;
  title: string;
  body: string;
  images: string[];
} | null {
  const date = strField(body.date, 10);
  if (!isDateStr(date)) return null;

  const title = strField(body.title, 60).trim();
  const bodyText = strField(body.body, 2000).trim();
  if (!title && !bodyText) return null;

  return {
    date,
    kind: isJournalKind(body.kind) ? body.kind : "life",
    title,
    body: bodyText,
    images: parseImages(body.images),
  };
}

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  if (!isDateStr(from) || !isDateStr(to)) return jsonErr("from / to 必须是 YYYY-MM-DD");
  try {
    const rows = await dbAll<Row>(
      "SELECT * FROM journal_entries WHERE date >= ? AND date <= ? ORDER BY date, id",
      from,
      to,
    );
    return NextResponse.json({ entries: rows.map(toEntry) });
  } catch {
    return jsonErr("读取记录失败", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");
  const e = readEntry(body);
  if (!e) return jsonErr("请填写文字或图片");
  try {
    await dbRun(
      "INSERT INTO journal_entries (date, kind, title, body, images, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now','localtime'))",
      e.date,
      e.kind,
      e.title,
      e.body,
      JSON.stringify(e.images),
    );
    const row = await dbAll<Row>("SELECT last_insert_rowid() AS id");
    return NextResponse.json({ ok: true, id: Number(row[0]?.id ?? 0) });
  } catch {
    return jsonErr("保存记录失败", 500);
  }
}

export async function PATCH(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return jsonErr("id 不合法");
  const e = readEntry(body);
  if (!e) return jsonErr("请填写文字或图片");
  try {
    await dbRun(
      "UPDATE journal_entries SET date = ?, kind = ?, title = ?, body = ?, images = ?, updated_at = datetime('now','localtime') WHERE id = ?",
      e.date,
      e.kind,
      e.title,
      e.body,
      JSON.stringify(e.images),
      id,
    );
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("更新记录失败", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return jsonErr("id 不合法");
  try {
    await dbRun("DELETE FROM journal_entries WHERE id = ?", id);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("删除记录失败", 500);
  }
}
