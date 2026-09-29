import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";

// 思想卡片（reflection-cards 合并版）：前端数据存 cards 表
// GET 读全部 / POST upsert / DELETE 按 id 删除
// 安全：请求须带 X-Access-Token 头，与环境变量 APP_TOKEN 一致，否则 401。
// 兼容旧版：数据仍在 reflection-cards 的 Turso 库时，前端设置页把
// 「同步地址」填为 https://reflection-cards.vercel.app 即可继续读写旧库。

function tokenOk(req: NextRequest): boolean {
  const expect = process.env.APP_TOKEN;
  if (!expect) return false;
  const got =
    req.headers.get("x-access-token") ||
    (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!got || got.length !== expect.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expect.charCodeAt(i);
  return diff === 0; // 常数时间比对，防时序侧信道
}

export async function GET(req: NextRequest) {
  if (!tokenOk(req)) {
    return NextResponse.json({ error: "unauthorized: 访问口令不对" }, { status: 401 });
  }
  try {
    const rows = await dbAll<{ id: string; data: string; updated: number }>(
      "SELECT id, data, updated FROM cards",
    );
    return NextResponse.json(
      rows.map((r) => {
        let data: unknown = {};
        try {
          data = JSON.parse(r.data);
        } catch {
          data = {};
        }
        return { id: r.id, data, updated: r.updated };
      }),
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "读取卡片失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!tokenOk(req)) {
    return NextResponse.json({ error: "unauthorized: 访问口令不对" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const list = Array.isArray(body) ? body : [body];
    for (const row of list) {
      if (!row || !row.id) continue;
      await dbRun(
        "INSERT INTO cards (id, data, updated) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated = excluded.updated",
        String(row.id),
        JSON.stringify(row.data ?? {}),
        Number(row.updated) || 0,
      );
    }
    return NextResponse.json({ ok: true, count: list.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "保存卡片失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!tokenOk(req)) {
    return NextResponse.json({ error: "unauthorized: 访问口令不对" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    for (const id of ids) {
      await dbRun("DELETE FROM cards WHERE id = ?", String(id));
    }
    return NextResponse.json({ ok: true, count: ids.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "删除卡片失败" }, { status: 500 });
  }
}
