// 思想卡片的「AI 精炼」：输入一段长文，输出「分类 + 每类总结 + 原文摘录」。
// 纯文本任务，DeepSeek 即可，不需要视觉模型。没 key 走本地降级（按空行分段）。

export type RefineGroup = {
  category: string;
  summary: string;
  excerpts: string[];
};

export type RefineResult = {
  title: string;
  groups: RefineGroup[];
  source: "ai" | "local";
};

export const REFINE_SYSTEM = `你是思想整理的助手。用户会给你一段日记/随笔/想法（可能很长、很杂）。

任务：把内容按主题分类，每类写一句总结，并原样摘录支撑该类的原文句子。

只输出 JSON，不要 markdown 代码块，不要解释。格式：
{"title":"一句话概括全文","groups":[{"category":"分类名（2-6字）","summary":"这一类在说什么（一句话）","excerpts":["原文句子1","原文句子2"]}]}

规则：
1. 分类 2-5 个，按内容自然聚合，类别之间不要重叠。
2. summary 用你自己的话概括，excerpts 必须【原样照抄】原文里真实存在的句子（不要改写、不要合并），每类 1-3 条。
3. excerpts 一定要能在原文里逐字找到，这是用来高亮原文的。
4. 不编造、不补充原文没有的观点。
5. 保持克制，句子尽量短。`;

export const REFINE_USER = (text: string) => `以下是用户写的原文：\n\n${text}`;

/** 无 AI 时的降级：按空行切成段，每段首句当摘要、整段当摘录 */
export function localRefine(text: string): RefineResult {
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const groups: RefineGroup[] = blocks.slice(0, 8).map((block, i) => {
    const firstLine = block.split(/\n/)[0].trim();
    const excerpt = firstLine.slice(0, 60);
    return {
      category: `段落 ${i + 1}`,
      summary: excerpt || "（空）",
      excerpts: excerpt ? [excerpt] : [],
    };
  });

  return {
    title: "",
    groups,
    source: "local",
  };
}

/** 校验并规整 AI 返回的结构 */
export function normalizeRefine(raw: unknown): RefineResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.groups)) return null;

  const groups: RefineGroup[] = [];
  for (const g of obj.groups) {
    if (!g || typeof g !== "object") continue;
    const o = g as Record<string, unknown>;
    const category = String(o.category ?? "").trim();
    const summary = String(o.summary ?? "").trim();
    if (!category && !summary) continue;
    const excerpts = Array.isArray(o.excerpts)
      ? o.excerpts.map((s) => String(s).trim()).filter(Boolean).slice(0, 4)
      : [];
    groups.push({ category: category || "未命名", summary, excerpts });
  }
  if (groups.length === 0) return null;

  return {
    title: String(obj.title ?? "").trim(),
    groups: groups.slice(0, 6),
    source: "ai",
  };
}
