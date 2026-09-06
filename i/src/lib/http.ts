// 路由层小工具：统一 JSON 解析/校验/错误响应
import { NextRequest, NextResponse } from "next/server";

/** 安全解析请求体：非法/空 JSON 返回 null，而不是让路由 500 */
export async function safeJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateStr(v: unknown): v is string {
  return typeof v === "string" && DATE_RE.test(v) && v.length === 10;
}

/** 简单长度限制的字符串清洗（拦截垃圾超长输入） */
export function strField(v: unknown, max = 2000): string {
  if (typeof v !== "string") return "";
  return v.slice(0, max);
}

export function jsonErr(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
