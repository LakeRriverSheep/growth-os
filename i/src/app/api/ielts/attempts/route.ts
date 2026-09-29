import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { safeJson, strField, jsonErr } from "@/lib/http";

// 雅思口语作答录音的文字转写（一次录音 = 一条 attempt）
// GET    /api/ielts/attempts?qid=xx
// POST   /api/ielts/attempts  body: { id, qid, text, seconds }
// DELETE /api/ielts/attempts?id=xx

export async function GET(req: NextRequest) {
  const qid = req.nextUrl.searchParams.get("qid") ?? "";
  try {
    const rows = await dbAll<Record<string, unknown>>(
      "SELECT id, qid, text, seconds, created_at FROM ielts_attempts WHERE qid = ? ORDER BY created_at DESC",
      qid,
    );
    return NextResponse.json(rows);
  } catch {
    return jsonErr("读取作答失败", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");
  const id = strField(body.id, 64);
  const qid = strField(body.qid, 64);
  const text = strField(body.text, 8000);
  const seconds = Number(body.seconds) || 0;
  if (!id || !qid) return jsonErr("字段不完整");
  try {
    await dbRun(
      "INSERT INTO ielts_attempts (id, qid, text, seconds) VALUES (?, ?, ?, ?)",
      id,
      qid,
      text,
      Math.round(seconds),
    );
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("保存作答失败", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonErr("id required");
  try {
    await dbRun("DELETE FROM ielts_attempts WHERE id = ?", id);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("删除失败", 500);
  }
}
