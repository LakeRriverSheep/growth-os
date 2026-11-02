import { NextRequest, NextResponse } from "next/server";
import { jsonErr, strField } from "@/lib/http";
import { aiJson } from "@/lib/ai";
import {
  REFINE_SYSTEM,
  REFINE_USER,
  localRefine,
  normalizeRefine,
  type RefineResult,
} from "@/lib/refine";

// POST /api/thoughts/refine  body: { text }
// 返回 { title, groups:[{category,summary,excerpts}], source }
// 有 AI key 用 AI，没 key / 失败走本地按段降级（保证功能能跑）。

const MAX_TEXT = 20000;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonErr("body 必须是 JSON");
  }

  const text = strField(body.text, MAX_TEXT).trim();
  if (!text) return jsonErr("没有可精炼的内容");

  const { data, error } = await aiJson<unknown>(REFINE_SYSTEM, REFINE_USER(text), [], {
    maxTokens: 1600,
    timeoutMs: 90_000,
  });

  if (data) {
    const normalized = normalizeRefine(data);
    if (normalized) return NextResponse.json(normalized as RefineResult);
    // AI 返回了但结构不对，落本地
  }

  const fallback: RefineResult = localRefine(text);
  return NextResponse.json({
    ...fallback,
    note: error ? `AI 未用（${error}），已按段落本地整理` : "已按段落本地整理",
  } as RefineResult & { note?: string });
}
