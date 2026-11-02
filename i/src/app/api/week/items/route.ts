import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { dbAll, dbRun } from "@/lib/db";
import { isDateStr, jsonErr, strField } from "@/lib/http";
import {
  KIND_META,
  normalizePart,
  rowToItem,
  weekStartOf,
  type WeekItemKind,
} from "@/lib/week";

// GET  /api/week/items?week=2026-10-27  → 该周全部条目
// POST /api/week/items                   → 手动补一条
// DELETE /api/week/items?id=xxx          → 删一条

export async function GET(req: NextRequest) {
  const week = req.nextUrl.searchParams.get("week") ?? "";
  const weekStart = weekStartOf(isDateStr(week) ? week : new Date());

  const rows = await dbAll<Record<string, unknown>>(
    "SELECT * FROM week_items WHERE week_start = ? ORDER BY created_at DESC",
    weekStart,
  );

  return NextResponse.json({
    weekStart,
    items: rows.map(rowToItem),
  });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> | null = null;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonErr("body 必须是 JSON");
  }
  if (!body) return jsonErr("body 必须是 JSON");

  const kindRaw = String(body.kind ?? "other") as WeekItemKind;
  const kind: WeekItemKind = kindRaw in KIND_META ? kindRaw : "other";
  const weekStart = weekStartOf(
    isDateStr(body.weekStart) ? body.weekStart : new Date(),
  );

  const data =
    body.data && typeof body.data === "object" && !Array.isArray(body.data)
      ? (body.data as Record<string, unknown>)
      : {};
  if (kind === "training" && data.part) data.part = normalizePart(data.part);

  const id = randomUUID();
  await dbRun(
    `INSERT INTO week_items (id, week_start, kind, label, source, raw, data, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
    id,
    weekStart,
    kind,
    strField(body.label, 120),
    strField(body.source, 800),
    strField(body.raw, 4000),
    JSON.stringify(data).slice(0, 8000),
  );

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonErr("id required");
  await dbRun("DELETE FROM week_items WHERE id = ?", id);
  return NextResponse.json({ ok: true });
}
