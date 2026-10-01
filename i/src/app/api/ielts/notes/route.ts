import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { safeJson, strField, jsonErr } from "@/lib/http";

// 雅思：听力 / 阅读 按场景记录的生词与句子
// GET    /api/ielts/notes?kind=listening&scene=求职
// POST   /api/ielts/notes  body: { id, kind, scene, type, text, meaning?, syn?, note? }
//        生词用 meaning(中文意思) + syn(同义替换)，句子用 note(备注/要点)
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
      meaning: string;
      syn: string;
      note: string;
      created_at: string;
    }>(
      "SELECT id, kind, scene, type, text, meaning, syn, note, created_at FROM ielts_notes WHERE kind = ? AND scene = ? ORDER BY created_at DESC",
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
  // id 可由前端传入（编辑已有条目），新增时不传则服务端生成
  const id = strField(body.id, 64) || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const kind = strField(body.kind, 20);
  const scene = strField(body.scene, 40);
  const type = strField(body.type, 20);
  const text = strField(body.text, 500);
  const meaning = strField(body.meaning, 500);
  const syn = strField(body.syn, 500);
  const note = strField(body.note, 500);
  if (!id || !kind || !scene || !type || !text) return jsonErr("字段不完整");
  try {
    await dbRun(
      `INSERT INTO ielts_notes (id, kind, scene, type, text, meaning, syn, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET text = excluded.text, meaning = excluded.meaning, syn = excluded.syn, note = excluded.note`,
      id,
      kind,
      scene,
      type,
      text,
      meaning,
      syn,
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
