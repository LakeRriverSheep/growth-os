// 周复盘的数据模型与统计聚合。
// 设计前提：一周只回看一次，所以这里不做「按天打卡」，只做「一周里发生过什么」的汇总。

export const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export type WeekItemKind =
  | "training"
  | "diet"
  | "sleep"
  | "study"
  | "thought"
  | "other";

export const KIND_META: Record<WeekItemKind, { label: string; emoji: string }> = {
  training: { label: "训练", emoji: "💪" },
  diet: { label: "饮食", emoji: "🍚" },
  sleep: { label: "睡眠", emoji: "🌙" },
  study: { label: "学习", emoji: "📖" },
  thought: { label: "思想", emoji: "🃏" },
  other: { label: "其他", emoji: "📎" },
};

export type WeekItem = {
  id: string;
  weekStart: string;
  kind: WeekItemKind;
  label: string;
  source: string;
  raw: string;
  data: Record<string, unknown>;
  createdAt: string;
};

export type WeekReport = {
  headline: string;
  highlights: string[];
  gaps: string[];
  next: string[];
  insight: string;
  source: "ai" | "template";
};

export type WeekStats = {
  trainingByPart: Record<string, number>;
  trainingDays: number;
  totalSets: number;
  totalVolume: number;
  cardioKm: number;
  cardioMin: number;
  dietDays: number;
  proteinAvg: number;
  carbAvg: number;
  fatAvg: number;
  fiberAvg: number;
  kcalAvg: number;
  sleepDays: number;
  sleepAvg: number;
  studyCount: number;
  thoughtCount: number;
  total: number;
};

// ── 日期工具（全部走本地时间，避免 UTC 把周一算成周日）─────────────

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** 任意日期 → 所在周的周一（YYYY-MM-DD） */
export function weekStartOf(input: Date | string = new Date()): string {
  const d = typeof input === "string" ? parseDate(input) : new Date(input);
  const dow = d.getDay(); // 0 = 周日
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return toDateStr(d);
}

/** 周一 + n 天 */
export function addDays(dateStr: string, n: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** 该周七天日期数组 */
export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** "10.27 – 11.02" */
export function weekRangeLabel(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const fmt = (s: string) => {
    const d = parseDate(s);
    return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
  };
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

/** ISO 周号（用于分享卡上的 WEEK 44） */
export function isoWeekNo(dateStr: string): number {
  const d = parseDate(dateStr);
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.valueOf() - firstThursday.valueOf();
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
}

/** 该周相对今天：本周 / 上周 / 第 N 周前 */
export function weekRelativeLabel(weekStart: string): string {
  const cur = weekStartOf(new Date());
  const diffDays = Math.round(
    (parseDate(cur).valueOf() - parseDate(weekStart).valueOf()) / 86400000,
  );
  const weeks = Math.round(diffDays / 7);
  if (weeks === 0) return "本周";
  if (weeks === 1) return "上周";
  if (weeks > 1) return `${weeks} 周前`;
  if (weeks === -1) return "下周";
  return `${-weeks} 周后`;
}

// ── 数值兜底 ────────────────────────────────────────────────

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function divide(a: number, b: number): number {
  if (!b) return 0;
  return Math.round((a / b) * 10) / 10;
}

const PART_ALIASES: Record<string, string> = {
  胸: "胸", chest: "胸",
  背: "背", back: "背",
  肩: "肩", shoulder: "肩", shoulders: "肩",
  腿: "腿", leg: "腿", legs: "腿",
  腹: "腹", core: "腹", abs: "腹",
  有氧: "有氧", cardio: "有氧", 跑: "有氧", 骑行: "有氧", 游泳: "有氧",
  全身: "全身", fullbody: "全身",
};

export function normalizePart(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return PART_ALIASES[s] ?? (s ? String(v).trim() : "");
}

// ── 聚合 ────────────────────────────────────────────────────

export function computeStats(items: WeekItem[]): WeekStats {
  const trainingByPart: Record<string, number> = {};
  const trainingDaySet = new Set<string>();
  const dietDates = new Set<string>();
  const sleepDates = new Set<string>();

  let totalSets = 0;
  let totalVolume = 0;
  let cardioKm = 0;
  let cardioMin = 0;
  let protein = 0;
  let carb = 0;
  let fat = 0;
  let fiber = 0;
  let kcal = 0;
  let sleepSum = 0;
  let studyCount = 0;
  let thoughtCount = 0;

  for (const item of items) {
    const d = item.data || {};

    if (item.kind === "training") {
      const part = normalizePart(d.part);
      if (part) trainingByPart[part] = (trainingByPart[part] ?? 0) + 1;
      if (d.date) trainingDaySet.add(String(d.date));

      const sets = num(d.sets);
      const reps = num(d.reps);
      const weight = num(d.weight);
      totalSets += sets;
      totalVolume += sets * reps * weight;

      if (part === "有氧") {
        cardioKm += num(d.distance);
        cardioMin += num(d.duration);
      }
    }

    if (item.kind === "diet") {
      if (d.date) dietDates.add(String(d.date));
      protein += num(d.protein);
      carb += num(d.carb);
      fat += num(d.fat);
      fiber += num(d.fiber);
      kcal += num(d.kcal);
    }

    if (item.kind === "sleep") {
      if (d.date) sleepDates.add(String(d.date));
      sleepSum += num(d.hours);
    }

    if (item.kind === "study") studyCount += 1;
    if (item.kind === "thought") thoughtCount += 1;
  }

  const dietDays = dietDates.size;
  const sleepDays = sleepDates.size;

  return {
    trainingByPart,
    trainingDays: trainingDaySet.size,
    totalSets,
    totalVolume: Math.round(totalVolume),
    cardioKm: Math.round(cardioKm * 10) / 10,
    cardioMin: Math.round(cardioMin),
    dietDays,
    proteinAvg: divide(protein, dietDays),
    carbAvg: divide(carb, dietDays),
    fatAvg: divide(fat, dietDays),
    fiberAvg: divide(fiber, dietDays),
    kcalAvg: divide(kcal, dietDays),
    sleepDays,
    sleepAvg: divide(sleepSum, sleepDays),
    studyCount,
    thoughtCount,
    total: items.length,
  };
}

/** 训练格：胸 1 · 背 1 · 肩 2 …（分享卡和页面都用它） */
export function trainingPartLine(stats: WeekStats): string {
  const order = ["胸", "背", "肩", "腿", "腹", "有氧", "全身"];
  const entries = Object.entries(stats.trainingByPart)
    .filter(([, n]) => n > 0)
    .sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  if (entries.length === 0) return "这周没留下训练记录";
  return entries.map(([k, v]) => `${k} ${v}`).join(" · ");
}

// ── 无 AI 时的模板周报 ──────────────────────────────────────

export function templateReport(stats: WeekStats): WeekReport {
  const parts = Object.keys(stats.trainingByPart).filter((k) => k !== "有氧");
  const headline =
    stats.total === 0
      ? "这周还是空的"
      : `练了 ${stats.trainingDays} 天，记了 ${stats.total} 条`;

  const highlights: string[] = [];
  if (parts.length > 0) highlights.push(`覆盖 ${parts.join("/")}，共 ${stats.trainingDays} 个训练日`);
  if (stats.cardioKm > 0) highlights.push(`有氧 ${stats.cardioKm} km / ${stats.cardioMin} 分钟`);
  if (stats.dietDays > 0)
    highlights.push(`饮食记了 ${stats.dietDays} 天，蛋白日均 ${stats.proteinAvg}g`);
  if (stats.sleepDays > 0) highlights.push(`睡眠日均 ${stats.sleepAvg} 小时`);
  if (highlights.length === 0) highlights.push("还没有可汇总的数据");

  const gaps: string[] = [];
  const allParts = ["胸", "背", "肩", "腿", "腹"];
  const missing = allParts.filter((p) => !stats.trainingByPart[p]);
  if (missing.length > 0 && stats.trainingDays > 0)
    gaps.push(`${missing.join("/")} 这周没有记录`);
  if (stats.dietDays > 0 && stats.proteinAvg > 110)
    gaps.push(`蛋白日均 ${stats.proteinAvg}g，超了 110g 封顶`);
  if (stats.dietDays > 0 && stats.carbAvg < 200)
    gaps.push(`碳水 ${stats.carbAvg}g，训练日目标 220g`);
  if (stats.dietDays > 0 && stats.fatAvg < 45)
    gaps.push(`脂肪 ${stats.fatAvg}g，低于 45g 保底`);
  if (stats.sleepDays > 0 && stats.sleepAvg < 7)
    gaps.push(`睡眠 ${stats.sleepAvg}h，低于 7 小时`);
  if (stats.total < 5) gaps.push("记录条数偏少，周末多丢两张截图就够");
  if (gaps.length === 0) gaps.push("没有明显缺口");

  const next: string[] = [];
  if (missing.length > 0) next.push(`下周补一次${missing[0]}`);
  if (stats.cardioKm === 0) next.push("安排一次 30 分钟有氧");
  if (stats.dietDays > 0 && stats.carbAvg < 220) next.push("主食加量，碳水往 220g 推");
  if (stats.dietDays > 0 && stats.fatAvg < 45) next.push("脂肪补到 45g，保留蛋黄和带皮鸡腿");
  if (stats.sleepDays > 0 && stats.sleepAvg < 7) next.push("把入睡时间往前挪 30 分钟");
  if (next.length === 0) next.push("按本周节奏继续，只加重量不加项");
  if (next.length === 1) next.push("周末留 20 分钟，把这周的截图存进来");

  const insight =
    stats.total === 0
      ? "上传几张截图就行——训练记录、饭照、体重报告都可以。不用每天记，周末一次性丢进来。"
      : `这周你留下了 ${stats.total} 条痕迹。${stats.trainingDays > 0 ? `训练覆盖 ${stats.trainingDays} 天，` : ""}${
          stats.cardioKm > 0 ? `有氧 ${stats.cardioKm} km。` : ""
        }数据不用完美，能看见趋势就够了。`;

  return { headline, highlights, gaps, next, insight, source: "template" };
}

// ── DB 行 → 领域对象 ────────────────────────────────────────

export function rowToItem(row: Record<string, unknown>): WeekItem {
  let data: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(String(row.data ?? "{}"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      data = parsed as Record<string, unknown>;
    }
  } catch {
    data = {};
  }
  const kind = String(row.kind ?? "other") as WeekItemKind;
  return {
    id: String(row.id ?? ""),
    weekStart: String(row.week_start ?? ""),
    kind: kind in KIND_META ? kind : "other",
    label: String(row.label ?? ""),
    source: String(row.source ?? ""),
    raw: String(row.raw ?? ""),
    data,
    createdAt: String(row.created_at ?? ""),
  };
}

// ── 给模型的抽取指令 ────────────────────────────────────────

export const EXTRACT_SYSTEM = `你是个人生活数据的抽取器。用户会给你图片（健身 App 训练截图、饮食照片、体重体脂报告、课程表、聊天记录、笔记截图等）和/或文字说明。

任务：把其中所有可结构化的事实抽成条目。宁可少抽，绝不编造。看不清、不确定的数字直接省略。

只输出 JSON，不要 markdown 代码块，不要任何解释。格式：
{"items":[{"kind":"training","data":{...},"raw":"该条对应的简短原文/描述"}]}

kind 与 data 字段：
- training: {"date":"YYYY-MM-DD","part":"胸|背|肩|腿|腹|有氧|全身","exercise":"动作名","sets":3,"reps":10,"weight":60,"duration":0,"distance":0,"note":""}
- diet: {"date":"YYYY-MM-DD","meal":"早|午|晚|加餐","protein":0,"carb":0,"fat":0,"fiber":0,"kcal":0,"note":"吃了什么"}
- sleep: {"date":"YYYY-MM-DD","bed":"23:30","wake":"07:00","hours":7.5,"feel":"描述"}
- study: {"date":"YYYY-MM-DD","course":"课程名","topic":"学了什么","note":""}
- thought: {"text":"用户表达的认知/思想，保留原话"}
- other: {"note":"其他值得记住的事"}

规则：
1. 一张图里有多个动作就拆成多条 training，每条一个动作。
2. 图片里没有明确日期的，省略 date 字段，不要猜。
3. 营养素只填图上真实出现的数字，没有就省略。
4. 用户粘贴的文字里如果有计划、想法、课程，按上面归类。
5. 最多输出 40 条。`;

export const REPORT_SYSTEM = `你在帮用户写一周复盘。用户会给你这一周的结构化数据。

只输出 JSON，不要 markdown 代码块，不要解释。格式：
{"headline":"不超过 18 字的一句话标题","highlights":["3 条，每条不超过 30 字，必须是数据支撑的事实"],"gaps":["2 条，指出这周的缺口或异常"],"next":["2 条下周可执行的具体动作"],"insight":"60-100 字的洞察，用第二人称「你」"}

要求：
- 只使用数据里出现的数字，一个都不许编。
- 语气克制、具体，不要鼓励式废话，不要感叹号。
- next 必须是可执行动作（加多少、补哪天），不是「继续保持」这种空话。
- 数据很少时直接说少，不要硬凑。`;
