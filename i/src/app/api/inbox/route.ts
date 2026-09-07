import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun, type Row } from "@/lib/db";
import { safeJson, strField, jsonErr } from "@/lib/http";

// 全局"随手待办"（无固定时间、不分日期）
// GET  /api/inbox → [{ id, text, checked }]
// POST /api/inbox actions：
//   { action: 'add', text }           新增
//   { action: 'toggle', id, checked } 勾选/取消
//   { action: 'delete', id }          删除
export async function GET() {
  try {
    const rows = await dbAll<Row>("SELECT id, text, checked FROM inbox ORDER BY id DESC");
    return NextResponse.json(
      rows.map((r) => ({ id: r.id as number, text: (r.text as string) ?? "", checked: !!r.checked })),
    );
  } catch {
    return jsonErr("读取待办失败", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");
  const action = body.action;
  try {
    if (action === "add") {
      const text = strField(body.text, 300).trim();
      if (!text) return jsonErr("待办内容不能为空");
      await dbRun("INSERT INTO inbox (text, checked) VALUES (?, 0)", text);
      return NextResponse.json({ ok: true });
    }
    if (action === "toggle") {
      const id = Number(body.id);
      if (!Number.isInteger(id)) return jsonErr("id 无效");
      await dbRun("UPDATE inbox SET checked = ? WHERE id = ?", body.checked ? 1 : 0, id);
      return NextResponse.json({ ok: true });
    }
    if (action === "delete") {
      const id = Number(body.id);
      if (!Number.isInteger(id)) return jsonErr("id 无效");
      await dbRun("DELETE FROM inbox WHERE id = ?", id);
      return NextResponse.json({ ok: true });
    }
    return jsonErr("action 必须为 add / toggle / delete");
  } catch {
    return jsonErr("操作待办失败，请稍后重试", 500);
  }
}
