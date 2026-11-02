import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { dbRun } from "@/lib/db";
import { isDateStr, jsonErr, strField } from "@/lib/http";
import { aiJson, aiRuntime } from "@/lib/ai";
import {
  EXTRACT_SYSTEM,
  KIND_META,
  normalizePart,
  weekStartOf,
  type WeekItemKind,
} from "@/lib/week";

// POST /api/week/extract
// body: { weekStart?, images?: string[] (dataURL), names?: string[], text?: string, url?: string }
// 把一坨「图片 + 文字 + 链接」交给多模态模型抽成结构化条目，直接落库。
// 原图不入库 —— 只留抽取结果，隐私和部署都简单。

const MAX_IMAGES = 8;
const MAX_DATA_URL = 1_400_000; // ~1MB 原图，前端已压过

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPageMeta(
  url: string,
): Promise<{ title: string; desc: string } | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 200_000);
    const title = decodeEntities(
      /<title[^>]*>([\s\S]{0,300}?)<\/title>/i.exec(html)?.[1] ?? "",
    );
    const desc = decodeEntities(
      /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']{0,500})["']/i.exec(
        html,
      )?.[1] ?? "",
    );
    if (!title && !desc) return null;
    return { title, desc };
  } catch {
    return null;
  }
}

type ExtractedItem = {
  kind?: string;
  data?: Record<string, unknown>;
  raw?: string;
};

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonErr("body 必须是 JSON");
  }

  const weekStart = weekStartOf(
    isDateStr(body.weekStart) ? (body.weekStart as string) : new Date(),
  );
  const text = strField(body.text, 4000).trim();
  const url = strField(body.url, 800).trim();
  const names = Array.isArray(body.names) ? body.names.map(String) : [];
  const images = (Array.isArray(body.images) ? body.images : [])
    .map(String)
    .filter((s) => s.startsWith("data:image/"))
    .slice(0, MAX_IMAGES)
    .filter((s) => s.length <= MAX_DATA_URL);

  if (images.length === 0 && !text && !url) {
    return jsonErr("没有可处理的内容");
  }

  const rt = aiRuntime();

  // 没有 AI key：只保留纯文字，图片无法处理（我们不存原图）
  if (!rt) {
    if (text) {
      const id = randomUUID();
      await dbRun(
        `INSERT INTO week_items (id, week_start, kind, label, source, raw, data, created_at)
         VALUES (?, ?, 'other', ?, ?, ?, '{}', datetime('now', 'localtime'))`,
        id,
        weekStart,
        "手动记的一条",
        url,
        text,
      );
      return NextResponse.json({
        ok: true,
        inserted: 1,
        skippedImages: images.length,
        warning:
          "未配置 AI key：文字已存下，图片需要多模态模型才能读。在 .env.local 里填 AI_PROVIDER + AI_API_KEY 即可。",
      });
    }
    return NextResponse.json({
      ok: false,
      inserted: 0,
      warning:
        "未配置 AI key：图片需要多模态模型才能读。在 .env.local 里填 AI_PROVIDER（qwen/kimi/doubao）+ AI_API_KEY。",
    });
  }

  if (images.length > 0 && !rt.vision) {
    return NextResponse.json({
      ok: false,
      inserted: 0,
      warning: `当前用的是 ${rt.label}，不支持图片。把 AI_PROVIDER 换成 qwen / kimi / doubao 再试。`,
    });
  }

  const page = url ? await fetchPageMeta(url) : null;

  const userPrompt = [
    `本周周一是 ${weekStart}。`,
    text ? `用户补充说明：\n${text}` : "",
    page
      ? `用户还提供了链接 ${url}\n页面标题：${page.title}\n页面描述：${page.desc}`
      : url
        ? `用户提供了链接 ${url}（页面内容抓不到，只能依据上面的文字判断）`
        : "",
    images.length > 0
      ? `共 ${images.length} 张图片，请逐张抽取，不要遗漏。`
      : "没有图片，请从文字中抽取条目。",
  ]
    .filter(Boolean)
    .join("\n\n");

  const { data, error } = await aiJson<{ items?: ExtractedItem[] }>(
    EXTRACT_SYSTEM,
    userPrompt,
    images,
    { maxTokens: 3000, timeoutMs: 120_000 },
  );

  if (!data || !Array.isArray(data.items)) {
    return NextResponse.json({
      ok: false,
      inserted: 0,
      warning: `抽取失败：${error ?? "模型没有返回 items"}`,
    });
  }

  const items = data.items.slice(0, 40);
  let inserted = 0;

  for (const raw of items) {
    const kindRaw = String(raw.kind ?? "other") as WeekItemKind;
    const kind: WeekItemKind = kindRaw in KIND_META ? kindRaw : "other";
    const d =
      raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
        ? (raw.data as Record<string, unknown>)
        : {};
    if (kind === "training" && d.part) d.part = normalizePart(d.part);

    const label =
      kind === "training"
        ? `${String(d.part ?? "训练")}${d.exercise ? ` · ${String(d.exercise)}` : ""}`
        : kind === "diet"
          ? `${String(d.meal ?? "一餐")} · ${strField(d.note, 40) || "已记录"}`
          : kind === "sleep"
            ? `睡眠 ${String(d.hours ?? "")}h`
            : kind === "study"
              ? `${String(d.course ?? "学习")}`
              : KIND_META[kind].label;

    await dbRun(
      `INSERT INTO week_items (id, week_start, kind, label, source, raw, data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      randomUUID(),
      weekStart,
      kind,
      strField(label, 120),
      url,
      strField(raw.raw, 2000),
      JSON.stringify(d).slice(0, 8000),
    );
    inserted += 1;
  }

  return NextResponse.json({
    ok: true,
    inserted,
    total: items.length,
    provider: rt.label,
    pageTitle: page?.title ?? "",
    names,
  });
}
