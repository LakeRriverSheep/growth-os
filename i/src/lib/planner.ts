// 日程规划的数据模型 + 时间轴布局算法（纯函数，可单测）
// 时间轴范围：05:00 – 23:00，共 1080 分钟

import { fromMin, toMin, weekdayCn } from "./date.ts";

export type EventKind = "class" | "train" | "study" | "life";

export const KIND_LIST: EventKind[] = ["class", "train", "study", "life"];

/**
 * 四个分类的配色。日程块走「实心色块」而不是半透明淡底：
 * 15% 透明的底在纯黑上几乎看不出边界，而且网格线会直接穿透块内部。
 * 实心填充 + 四周 1px 描边 + 左侧 4px 主色条，边界在任何背景上都立得住。
 */
export const KIND_META: Record<
  EventKind,
  {
    label: string;
    /** 高饱和主色：选择器小圆点 + 日程块左侧色条 */
    dot: string;
    /** 选择器选中态 */
    soft: string;
    /** 日程块填充：不透明深色（黑底上边界可见）+ hover 提亮 */
    bg: string;
    /** 日程块四周描边：同色系半透明，负责把块的轮廓勾出来 */
    edge: string;
  }
> = {
  class: {
    label: "课程",
    dot: "bg-sky-400",
    soft: "border-sky-400/70 bg-[#0f3a56] text-sky-50",
    bg: "bg-[#0f3a56] hover:bg-[#154d70]",
    edge: "border-sky-400/40",
  },
  train: {
    label: "训练",
    dot: "bg-emerald-400",
    soft: "border-emerald-400/70 bg-[#0a3f2e] text-emerald-50",
    bg: "bg-[#0a3f2e] hover:bg-[#0d5540]",
    edge: "border-emerald-400/40",
  },
  study: {
    label: "学习",
    dot: "bg-amber-400",
    soft: "border-amber-400/70 bg-[#3e2c08] text-amber-50",
    bg: "bg-[#3e2c08] hover:bg-[#543b0b]",
    edge: "border-amber-400/40",
  },
  life: {
    label: "生活",
    dot: "bg-violet-400",
    soft: "border-violet-400/70 bg-[#2e1b4a] text-violet-50",
    bg: "bg-[#2e1b4a] hover:bg-[#3d2461]",
    edge: "border-violet-400/40",
  },
};

export function isKind(v: unknown): v is EventKind {
  return typeof v === "string" && (KIND_LIST as string[]).includes(v);
}

/** 一条自己排的日程（课程不在此表，由课表自动生成） */
export type PlanEvent = {
  id: number;
  /** YYYY-MM-DD；weekly=true 时只看它的星期几 */
  date: string;
  start: string;
  end: string;
  title: string;
  kind: EventKind;
  note: string;
  weekly: boolean;
};

// ── 时间轴 ──────────────────────────────────────────────────
export const DAY_START_MIN = 5 * 60;
export const DAY_END_MIN = 23 * 60;
export const DAY_SPAN_MIN = DAY_END_MIN - DAY_START_MIN; // 1080
export const HOURS = Array.from({ length: 18 }, (_, i) => 5 + i); // 5..22（共 18 格）

/** 分钟 → 时间轴上的百分比位置（0–100） */
export function pctTop(min: number): number {
  return ((min - DAY_START_MIN) / DAY_SPAN_MIN) * 100;
}

/** 时长 → 高度百分比 */
export function pctHeight(startMin: number, endMin: number): number {
  return ((endMin - startMin) / DAY_SPAN_MIN) * 100;
}

function clampMin(min: number): number {
  return Math.max(DAY_START_MIN, Math.min(DAY_END_MIN, min));
}

/** 把 [start,end] 钳到时间轴内；完全在轴外返回 null */
export function axisRange(start: string, end: string): { s: number; e: number } | null {
  let s = toMin(start);
  let e = toMin(end);
  if (Number.isNaN(s)) return null;
  if (Number.isNaN(e) || e <= s) e = s + 30;
  if (e <= DAY_START_MIN || s >= DAY_END_MIN) return null;
  s = clampMin(s);
  e = clampMin(e);
  if (e - s < 10) e = Math.min(DAY_END_MIN, s + 10);
  return { s, e };
}

// ── 重叠布局 ────────────────────────────────────────────────
export type Placed<E> = { item: E; col: number; cols: number };

/** 事件块最小可视高度（px）：短事件也至少撑到能显示「标题 + 起止时间」一行的高度，不再被裁成细条 */
export const MIN_BLOCK_PX = 30;

/**
 * 同一列里时间上「真正撞到一起」的日程并排摆放。
 * 做法：按开始时间排序 → 贪心分配到第一个空闲子列 → 同一「连通簇」内统一列数。
 *
 * minDurMin（最短可视时长，分钟）用于处理短事件：
 * - 两个相邻短事件：各自视觉时长都被拉长，于是左右分列，而不是上下叠成细条互相盖标题；
 * - 短事件后面跟着一个「有间隔的正常事件」：不挤成窄列。短事件的视觉尾巴对长事件是「良性
 *   重叠」（长事件照旧用真实结束时间找列、DOM 靠后自然盖在短事件空白尾巴之上），
 *   两者都保持整列宽，谁的内容都不被裁。
 */
export function layoutColumn<E extends { start: string; end: string }>(
  items: E[],
  minDurMin = 0,
): Placed<E>[] {
  const list = items
    .map((item) => {
      const s = toMin(item.start);
      let e = toMin(item.end);
      if (Number.isNaN(e) || e <= s) e = s + 30;
      const isShort = minDurMin > 0 && e - s < minDurMin;
      const ve = isShort ? Math.max(e, s + minDurMin) : e; // 视觉终点
      return { item, s, e, ve, isShort };
    })
    .sort((a, b) => a.s - b.s || a.e - b.e);

  const out: Placed<E>[] = [];
  let cluster: { item: E; col: number }[] = [];
  // 每列两个终点：真实结束（长事件找列用）、视觉终点（短事件找列用）
  let colTrueEnd: number[] = [];
  let colVe: number[] = [];
  let clusterTrueEnd = -1;
  let clusterVe = -1;

  const flush = () => {
    const cols = Math.max(1, colVe.length);
    for (const c of cluster) out.push({ item: c.item, col: c.col, cols });
    cluster = [];
    colTrueEnd = [];
    colVe = [];
    clusterTrueEnd = -1;
    clusterVe = -1;
  };

  for (const it of list) {
    // 断簇的判据因长短而异：短事件只要视觉上没碰到簇就断；长事件只认真实时间重叠
    // （短事件的视觉尾巴不算冲突），这样短×长不会被强行并进同一簇。
    const mustFlush =
      cluster.length > 0 && (it.isShort ? it.s >= clusterVe : it.s >= clusterTrueEnd);
    if (mustFlush) flush();

    let col = it.isShort
      ? colVe.findIndex((end) => end <= it.s)
      : colTrueEnd.findIndex((end) => end <= it.s);
    if (col === -1) {
      colTrueEnd.push(it.e);
      colVe.push(it.ve);
      col = colTrueEnd.length - 1;
    } else {
      colTrueEnd[col] = Math.max(colTrueEnd[col], it.e);
      colVe[col] = Math.max(colVe[col], it.ve);
    }
    cluster.push({ item: it.item, col });
    clusterTrueEnd = Math.max(clusterTrueEnd, it.e);
    clusterVe = Math.max(clusterVe, it.ve);
  }
  flush();
  return out;
}

// ── 一天的可视块 ────────────────────────────────────────────
export type DayBlock = {
  key: string;
  /** 有 event = 自己排的（可点开编辑）；null = 课表来的，只读 */
  event: PlanEvent | null;
  title: string;
  /** 第三行：课程的「第1-2节 · 图书馆5楼5机房」，自己排的就是备注 */
  sub: string;
  /** 第二行尾部的角标：课程的「单周 / 双周」 */
  weeks?: string;
  kind: EventKind;
  start: string;
  end: string;
  top: number;
  height: number;
  col: number;
  cols: number;
};

/** "4-18双" → "双周"；每周的课返回空串 */
export function parityLabel(weeks: string): string {
  const m = /(单|双)\s*$/.exec(weeks.trim());
  return m ? `${m[1]}周` : "";
}

/** 该日期命中的自定义日程：weekly 的按星期几匹配，其余按日期精确匹配 */
export function eventsForDate(date: string, events: PlanEvent[]): PlanEvent[] {
  const wd = weekdayCn(date);
  return events.filter((e) => (e.weekly ? weekdayCn(e.date) === wd : e.date === date));
}

/** 课程 → 可视块（供日历渲染） */
export type CourseLike = {
  id: string;
  name: string;
  place: string;
  teacher: string;
  start: string;
  end: string;
  weeks: string;
  /** 节次，如 "1-2"（课表来的才有） */
  period?: string;
};

/** 把「课程 + 自定义日程」合并成一天的可视块列表，附带并排布局与百分比定位。
 *  hourH：每小时对应的像素高度（日历缩放），用于把 MIN_BLOCK_PX 换算成最短可视时长，
 *  保证短任务也至少显示「标题 + 起止时间」一行，不会被裁成看不见的细条。 */
export function buildDay(
  date: string,
  courses: CourseLike[],
  events: PlanEvent[],
  hourH = 56,
): DayBlock[] {
  type Raw = {
    key: string;
    event: PlanEvent | null;
    title: string;
    sub: string;
    weeks?: string;
    kind: EventKind;
    start: string;
    end: string;
    s: number;
    e: number;
  };

  const raws: Raw[] = [];

  for (const c of courses) {
    const r = axisRange(c.start, c.end);
    if (!r) continue;
    raws.push({
      key: `c:${c.id}`,
      event: null,
      title: c.name,
      sub: [c.period ? `第${c.period}节` : "", c.place || c.teacher].filter(Boolean).join(" · "),
      weeks: parityLabel(c.weeks),
      kind: "class",
      start: c.start,
      end: c.end,
      s: r.s,
      e: r.e,
    });
  }

  for (const e of eventsForDate(date, events)) {
    const r = axisRange(e.start, e.end);
    if (!r) continue;
    raws.push({
      key: `e:${e.id}`,
      event: e,
      title: e.title,
      sub: e.note,
      kind: e.kind,
      start: e.start,
      end: e.end,
      s: r.s,
      e: r.e,
    });
  }

  raws.sort((a, b) => a.s - b.s || a.e - b.e);

  // 最短可视时长：把 MIN_BLOCK_PX 按小时高度换算成分钟，短事件据此参与重叠判断并撑开高度。
  const minDurMin = Math.ceil((MIN_BLOCK_PX / hourH) * 60);

  const placed = layoutColumn(
    raws.map((r) => ({ start: fromMin(r.s), end: fromMin(r.e), raw: r })),
    minDurMin,
  );

  return placed
    .map((p) => {
      const raw = p.item.raw;
      const s = raw.s;
      const e = raw.e;
      // 短事件的高度撑到至少 minDurMin：优先向下扩，顶到 23:00 就把整块上移补足，保证不被裁。
      const visDur = Math.min(minDurMin, DAY_SPAN_MIN);
      let topMin = s;
      let botMin = Math.min(DAY_END_MIN, Math.max(e, s + visDur));
      if (botMin - topMin < visDur) {
        topMin = Math.max(DAY_START_MIN, botMin - visDur);
      }
      return {
        key: raw.key,
        event: raw.event,
        title: raw.title,
        sub: raw.sub,
        weeks: raw.weeks,
        kind: raw.kind,
        start: raw.start,
        end: raw.end,
        top: pctTop(topMin),
        height: pctHeight(topMin, botMin),
        col: p.col,
        cols: p.cols,
      };
    })
    .sort((a, b) => a.top - b.top);
}
