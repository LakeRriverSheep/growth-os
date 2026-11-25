import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbRun, type Row } from "@/lib/db";
import { safeJson, jsonErr } from "@/lib/http";
import { IDENTITY_DEFAULT, type Identity } from "@/lib/identity";

// 身份层 CRUD：整份 JSON 存 identity 表（key='main'）
// GET  /api/identity            → 返回整份（库空时返回默认值）
// POST /api/identity            body: 完整 Identity → 整体写回

const KEY = "main";

function sanitize(v: unknown): Identity {
  const d = IDENTITY_DEFAULT;
  if (!v || typeof v !== "object") return d;
  const o = v as Record<string, unknown>;
  const strArr = (x: unknown): string[] =>
    Array.isArray(x) ? x.filter((s): s is string => typeof s === "string").map((s) => s.slice(0, 200)) : [];
  return {
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt.slice(0, 20) : d.updatedAt,
    profile: Array.isArray(o.profile)
      ? (o.profile as any[]).map((p) => ({
          group: typeof p?.group === "string" ? p.group.slice(0, 30) : "",
          tags: strArr(p?.tags),
        })).filter((p) => p.group)
      : d.profile,
    motives: strArr(o.motives),
    actions: Array.isArray(o.actions)
      ? (o.actions as any[]).map((a) => ({
          goal: typeof a?.goal === "string" ? a.goal.slice(0, 40) : "",
          action: typeof a?.action === "string" ? a.action.slice(0, 300) : "",
        })).filter((a) => a.goal)
      : d.actions,
    bans: strArr(o.bans),
    dailyQuestions: strArr(o.dailyQuestions),
  };
}

export async function GET() {
  try {
    const row = await dbGet<Row>("SELECT data FROM identity WHERE key = ?", KEY);
    if (row?.data) {
      try {
        const parsed = JSON.parse(row.data as string);
        return NextResponse.json(sanitize(parsed));
      } catch {
        return NextResponse.json(IDENTITY_DEFAULT);
      }
    }
    return NextResponse.json(IDENTITY_DEFAULT);
  } catch {
    return jsonErr("读取身份层失败", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");
  const data = sanitize(body);
  try {
    await dbRun(
      `INSERT INTO identity (key, data, updated_at)
       VALUES (?, ?, datetime('now', 'localtime'))
       ON CONFLICT(key) DO UPDATE SET
         data = excluded.data,
         updated_at = excluded.updated_at`,
      KEY,
      JSON.stringify(data),
    );
    return NextResponse.json({ ok: true });
  } catch {
    return jsonErr("保存身份层失败", 500);
  }
}
