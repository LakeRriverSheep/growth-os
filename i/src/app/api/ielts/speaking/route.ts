import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { safeJson, strField, jsonErr } from "@/lib/http";

// 雅思口语题目 + 作答（多次录音）
// GET    /api/ielts/speaking            → 题目列表（带作答次数与最近作答时间）
// POST   /api/ielts/speaking            → body { id, part, question, status }（同 id 覆盖）
// DELETE /api/ielts/speaking?id=xx      → 删题目及其作答
// GET    /api/ielts/speaking?attempts=1 → 全部作答（用于挑昨日题复习）

export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get("attempts")) {
      const rows = await dbAll<Record<string, unknown>>(
        "SELECT id, qid, text, seconds, created_at FROM ielts_attempts ORDER BY created_at DESC",
      );
      return NextResponse.json(rows);
    }
    const rows = await dbAll<Record<string, unknown>>(
      `SELECT q.id, q.part, q.question, q.status, q.created_at,
              COUNT(a.id) AS attempts,
              MAX(a.created_at) AS last_at
       FROM ielts_speaking q
       LEFT JOIN ielts_attempts a ON a.qid = q.id
       GROUP BY q.id
       ORDER BY q.created_at DESC`,
    );
    return NextResponse.json(rows);
  } catch {
    return jsonErr("读取题目失败", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");
  const id = strField(body.id, 64);
  const part = strField(body.part, 20);
  const question = strField(body.question, 500);
  const status = strField(body.status, 20) || "new";
  if (!id || !question) return jsonErr("字段不完整");
  try {
    await dbRun(
      `INSERT INTO ielts_speaking (id, part, question, status) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET part = excluded.part, question = excluded.question, status = excluded.status`,
      id,
      part,
      question,
      status,
    );
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("保存题目失败", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonErr("id required");
  try {
    await dbRun("DELETE FROM ielts_speaking WHERE id = ?", id);
    await dbRun("DELETE FROM ielts_attempts WHERE qid = ?", id);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("删除失败", 500);
  }
}
