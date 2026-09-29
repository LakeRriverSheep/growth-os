import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { safeJson, strField, jsonErr } from "@/lib/http";

// 雅思写作练习：Task1 按题型 / Task2 按话题 x 题型
// GET    /api/ielts/writing?task=task1|task2
// POST   /api/ielts/writing  body: { id, task, topic, qtype, title, content }
// DELETE /api/ielts/writing?id=xx

export async function GET(req: NextRequest) {
  const task = req.nextUrl.searchParams.get("task") ?? "";
  try {
    const rows = await dbAll<Record<string, unknown>>(
      "SELECT id, task, topic, qtype, title, content, created_at FROM ielts_writing WHERE task = ? ORDER BY created_at DESC",
      task,
    );
    return NextResponse.json(rows);
  } catch {
    return jsonErr("读取写作练习失败", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");
  const id = strField(body.id, 64);
  const task = strField(body.task, 10);
  const topic = strField(body.topic, 40);
  const qtype = strField(body.qtype, 40);
  const title = strField(body.title, 300);
  const content = strField(body.content, 20000);
  if (!id || !task) return jsonErr("字段不完整");
  try {
    await dbRun(
      `INSERT INTO ielts_writing (id, task, topic, qtype, title, content) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET topic = excluded.topic, qtype = excluded.qtype,
       title = excluded.title, content = excluded.content`,
      id,
      task,
      topic,
      qtype,
      title,
      content,
    );
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("保存写作练习失败", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonErr("id required");
  try {
    await dbRun("DELETE FROM ielts_writing WHERE id = ?", id);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("删除失败", 500);
  }
}
