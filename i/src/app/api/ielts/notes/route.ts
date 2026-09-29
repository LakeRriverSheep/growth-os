import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { safeJson, strField, jsonErr } from "@/lib/http";

// 雅思：听力 / 阅读 按场景记录的生词与句子
// GET    /api/ielts/notes?kind=listening&scene=求职
// POST   /api/ielts/notes  body: { id, kind, scene, type, text, note }
// DELETE /api/ielts/notes?id=xx

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind") ?? "";
  const scene = req.nextUrl.searchParams.get("scene") ?? "";
  try {
    const rows = await dbAll<{
      id: string;
      kind: string;
      scene: string;
      type: string;
      text: string;
      note: string;
      created_at: string;
    }>(
      "SELECT id, kind, scene, type, text, note, created_at FROM ielts_notes WHERE kind = ? AND scene = ? ORDER BY created_at DESC",
      kind,
      scene,
    );
    return NextResponse.json(rows);
  } catch {
    return jsonErr("读取笔记失败", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");
  const id = strField(body.id, 64);
  const kind = strField(body.kind, 20);
  const scene = strField(body.scene, 40);
  const type = strField(body.type, 20);
  const text = strField(body.text, 500);
  const note = strField(body.note, 500);
  if (!id || !kind || !scene || !type || !text) return jsonErr("字段不完整");
  try {
    await dbRun(
      `INSERT INTO ielts_notes (id, kind, scene, type, text, note) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET text = excluded.text, note = excluded.note`,
      id,
      kind,
      scene,
      type,
      text,
      note,
    );
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("保存失败", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonErr("id required");
  try {
    await dbRun("DELETE FROM ielts_notes WHERE id = ?", id);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("删除失败", 500);
  }
}
