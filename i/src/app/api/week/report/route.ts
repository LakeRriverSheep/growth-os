import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbGet, dbRun } from "@/lib/db";
import { isDateStr, jsonErr } from "@/lib/http";
import { aiJson } from "@/lib/ai";
import {
  REPORT_SYSTEM,
  computeStats,
  rowToItem,
  templateReport,
  weekStartOf,
  type WeekReport,
} from "@/lib/week";

// GET  /api/week/report?week=2026-10-27  → 已生成的周报（没有则 null）
// POST /api/week/report  body:{weekStart} → 生成（有 AI 用 AI，没 key 走模板）

export async function GET(req: NextRequest) {
  const week = req.nextUrl.searchParams.get("week") ?? "";
  const weekStart = weekStartOf(isDateStr(week) ? week : new Date());

  const row = await dbGet<{ summary: string; source: string; updated_at: string }>(
    "SELECT summary, source, updated_at FROM week_reports WHERE week_start = ?",
    weekStart,
  );
  if (!row) return NextResponse.json({ weekStart, report: null });

  try {
    const report = JSON.parse(row.summary) as WeekReport;
    return NextResponse.json({
      weekStart,
      report: { ...report, source: row.source === "ai" ? "ai" : "template" },
      updatedAt: row.updated_at,
    });
  } catch {
    return NextResponse.json({ weekStart, report: null });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonErr("body 必须是 JSON");
  }

  const weekStart = weekStartOf(
    isDateStr(body.weekStart) ? (body.weekStart as string) : new Date(),
  );

  const rows = await dbAll<Record<string, unknown>>(
    "SELECT * FROM week_items WHERE week_start = ? ORDER BY created_at ASC",
    weekStart,
  );
  const items = rows.map(rowToItem);
  const stats = computeStats(items);

  if (items.length === 0) {
    return NextResponse.json({
      ok: false,
      warning: "这一周还没有任何条目，先上传点东西。",
      stats,
    });
  }

  const compact = items.slice(0, 60).map((i) => ({
    kind: i.kind,
    data: i.data,
    raw: i.raw.slice(0, 200),
  }));

  const userPrompt = [
    `周起始：${weekStart}`,
    `统计：${JSON.stringify(stats)}`,
    `条目：${JSON.stringify(compact).slice(0, 7000)}`,
  ].join("\n\n");

  const { data } = await aiJson<Partial<WeekReport>>(REPORT_SYSTEM, userPrompt, [], {
    maxTokens: 1200,
    timeoutMs: 90_000,
  });

  let report: WeekReport;
  if (
    data &&
    typeof data.headline === "string" &&
    Array.isArray(data.highlights) &&
    Array.isArray(data.next)
  ) {
    report = {
      headline: String(data.headline).slice(0, 40),
      highlights: data.highlights.slice(0, 4).map((s) => String(s).slice(0, 80)),
      gaps: Array.isArray(data.gaps)
        ? data.gaps.slice(0, 3).map((s) => String(s).slice(0, 80))
        : [],
      next: data.next.slice(0, 3).map((s) => String(s).slice(0, 80)),
      insight: String(data.insight ?? "").slice(0, 300),
      source: "ai",
    };
  } else {
    report = templateReport(stats);
  }

  await dbRun(
    `INSERT INTO week_reports (week_start, summary, source, updated_at)
     VALUES (?, ?, ?, datetime('now', 'localtime'))
     ON CONFLICT(week_start) DO UPDATE SET
       summary = excluded.summary,
       source = excluded.source,
       updated_at = excluded.updated_at`,
    weekStart,
    JSON.stringify(report),
    report.source,
  );

  return NextResponse.json({ ok: true, weekStart, report, stats });
}
