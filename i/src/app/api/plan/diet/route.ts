import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbRun, type Row } from "@/lib/db";
import { safeJson, jsonErr } from "@/lib/http";

// 可编辑饮食清单（早餐/午餐/加餐/晚餐/练前/练后 的条目增删改）
// 独立存放，重新生成计划不会覆盖用户手改的清单。

const ALLOWED = new Set(["breakfast", "lunch", "snack", "dinner", "pre", "post"]);

function parseSections(raw: string | undefined): Record<string, string[]> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

// 只保留合法 key 的字符串数组，逐条截断防垃圾数据
function sanitizeSections(input: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!ALLOWED.has(k) || !Array.isArray(v)) continue;
    out[k] = v.slice(0, 50).map((s) => (typeof s === "string" ? s.slice(0, 200) : String(s).slice(0, 200)));
  }
  return out;
}

// GET /api/plan/diet?goalId=fitness → { sections: {...} }
export async function GET(req: NextRequest) {
  const goalId = req.nextUrl.searchParams.get("goalId");
  if (!goalId) return jsonErr("goalId required");
  try {
    const row = await dbGet<Row>("SELECT sections FROM diet_overrides WHERE goal_id = ?", goalId);
    return NextResponse.json({ sections: row ? parseSections(row.sections as string) : {} });
  } catch {
    return jsonErr("读取饮食清单失败", 500);
  }
}

// POST /api/plan/diet  body: { goalId, sections }
export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  if (!body) return jsonErr("请求体必须是 JSON 对象");
  const goalId = body.goalId;
  if (typeof goalId !== "string" || !goalId) return jsonErr("goalId required");
  const sections = sanitizeSections(body.sections);

  try {
    await dbRun(
      `INSERT INTO diet_overrides (goal_id, sections, updated_at)
       VALUES (?, ?, datetime('now', 'localtime'))
       ON CONFLICT(goal_id) DO UPDATE SET
         sections = excluded.sections,
         updated_at = excluded.updated_at`,
      goalId,
      JSON.stringify(sections),
    );
    return NextResponse.json({ ok: true, sections });
  } catch {
    return jsonErr("保存饮食清单失败", 500);
  }
}
