// 统一 AI 调用层。
// 所有供应商都走 OpenAI 兼容的 /chat/completions 协议，差异只在 baseURL / model / 鉴权。
// 没有配置 key 时返回 null —— 调用方自己做本地降级（与项目「不填 key 也能跑」的约定一致）。
//
// 环境变量：
//   AI_PROVIDER = qwen | kimi | doubao | deepseek   （默认 deepseek）
//   AI_API_KEY  = 对应平台的 key（也可沿用已有的 DEEPSEEK_API_KEY）
//   AI_MODEL    = 覆盖默认模型名（可选）

export type AiProvider = "qwen" | "kimi" | "doubao" | "deepseek";

type ProviderConfig = {
  base: string;
  model: string;
  vision: boolean;
  label: string;
};

const PROVIDERS: Record<AiProvider, ProviderConfig> = {
  // 阿里云百炼（通义千问）：视觉 + 文本，国内直连稳定
  qwen: {
    base: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-vl-max-latest",
    vision: true,
    label: "通义千问",
  },
  // Moonshot：kimi-latest 支持图片输入
  kimi: {
    base: "https://api.moonshot.cn/v1",
    model: "kimi-latest",
    vision: true,
    label: "Kimi",
  },
  // 火山方舟：模型名随版本变动，建议用 AI_MODEL 指定（如 doubao-seed-1-6-250615）
  doubao: {
    base: "https://ark.cn-beijing.volces.com/api/v3",
    model: "doubao-1-5-vision-pro-32k-250115",
    vision: true,
    label: "豆包",
  },
  deepseek: {
    base: "https://api.deepseek.com",
    model: "deepseek-chat",
    vision: false,
    label: "DeepSeek",
  },
};

export type AiRuntime = {
  provider: AiProvider;
  model: string;
  base: string;
  vision: boolean;
  key: string;
  label: string;
};

/** 读取当前配置；没配 key 返回 null */
export function aiRuntime(): AiRuntime | null {
  const key = (process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || "").trim();
  if (!key) return null;
  const raw = (process.env.AI_PROVIDER || "deepseek").toLowerCase();
  const provider: AiProvider = raw in PROVIDERS ? (raw as AiProvider) : "deepseek";
  const conf = PROVIDERS[provider];
  return {
    provider,
    model: (process.env.AI_MODEL || conf.model).trim(),
    base: conf.base,
    vision: conf.vision,
    key,
    label: conf.label,
  };
}

/** 供前端显示「AI 是否可用 / 能不能看图」 */
export function aiStatus(): { ready: boolean; vision: boolean; label: string } {
  const rt = aiRuntime();
  if (!rt) return { ready: false, vision: false, label: "未配置" };
  return { ready: true, vision: rt.vision, label: rt.label };
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatResult = {
  ok: true;
  text: string;
} | {
  ok: false;
  error: string;
};

async function chatRaw(
  system: string,
  userContent: string | ContentPart[],
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<ChatResult> {
  const rt = aiRuntime();
  if (!rt) return { ok: false, error: "未配置 AI key" };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 90_000);

  try {
    const res = await fetch(`${rt.base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${rt.key}`,
      },
      body: JSON.stringify({
        model: rt.model,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 2000,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `AI ${res.status}: ${body.slice(0, 300)}` };
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    if (!text) return { ok: false, error: "AI 返回为空" };
    return { ok: true, text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

/** 从模型输出里抠出 JSON —— 兼容 ```json 包裹、前后带解释文字的情况 */
export function parseJsonLoose<T>(text: string): T | null {
  const cleaned = text
    .replace(/^\uFEFF/, "")
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  const tryParse = (s: string): T | null => {
    try {
      return JSON.parse(s) as T;
    } catch {
      return null;
    }
  };

  const direct = tryParse(cleaned);
  if (direct) return direct;

  // 退一步：截取第一个 { 到最后一个 }（或 [ ]）
  for (const [open, close] of [["{", "}"], ["[", "]"]]) {
    const s = cleaned.indexOf(open);
    const e = cleaned.lastIndexOf(close);
    if (s >= 0 && e > s) {
      const hit = tryParse(cleaned.slice(s, e + 1));
      if (hit) return hit;
    }
  }
  return null;
}

/** 要求模型返回 JSON 并解析；失败返回 null */
export async function aiJson<T>(
  system: string,
  user: string,
  images: string[] = [],
  opts: { maxTokens?: number; timeoutMs?: number } = {},
): Promise<{ data: T | null; error?: string }> {
  const rt = aiRuntime();
  if (!rt) return { data: null, error: "未配置 AI key" };

  let content: string | ContentPart[] = user;
  if (images.length > 0) {
    if (!rt.vision) {
      return { data: null, error: `${rt.label} 不支持图片输入，请换 AI_PROVIDER` };
    }
    content = [
      { type: "text", text: user },
      ...images.map<ContentPart>((url) => ({ type: "image_url", image_url: { url } })),
    ];
  }

  const res = await chatRaw(system, content, opts);
  if (!res.ok) return { data: null, error: res.error };

  const parsed = parseJsonLoose<T>(res.text);
  if (!parsed) return { data: null, error: "AI 输出不是合法 JSON" };
  return { data: parsed };
}
