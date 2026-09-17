// 日程规划的数据模型 + 时间轴布局算法（纯函数，可单测）
// 时间轴范围：05:00 – 23:00，共 1080 分钟

import { fromMin, toMin, weekdayCn } from "./date.ts";

export type EventKind = "class" | "train" | "study" | "life";

export const KIND_LIST: EventKind[] = ["class", "train", "study", "life"];

export const KIND_META: Record<
  EventKind,
  { label: string; dot: string; block: string; soft: string }
> = {
  class: {
    label: "课程",
    dot: "bg-sky-400",
    block: "border-sky-500/50 bg-sky-500/15 text-sky-50",
    soft: "border-sky-500 bg-sky-500/20 text-sky-100",
  },
  train: {
    label: "训练",
    dot: "bg-emerald-400",
    block: "border-emerald-500/50 bg-emerald-500/15 text-emerald-50",
    soft: "border-emerald-500 bg-emerald-500/20 text-emerald-100",
  },
  study: {
    label: "学习",
    dot: "bg-amber-400",
    block: "border-amber-500/50 bg-amber-500/15 text-amber-50",
    soft: "border-amber-500 bg-amber-500/20 text-amber-100",
  },
  life: {
    label: "生活",
    dot: "bg-violet-400",
    block: "border-violet-500/50 bg-violet-500/15 text-violet-50",
    soft: "border-violet-500 bg-violet-500/20 text-violet-100",
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

/**
 * 同一列里时间重叠的日程并排摆放。
 * 做法：按开始时间排序 → 贪心分配到第一个空闲子列 → 同一「连通簇」内统一列数。
 */
export function layoutColumn<E extends { start: string; end: string }>(items: E[]): Placed<E>[] {
  const list = items
    .map((item) => {
      const s = toMin(item.start);
      let e = toMin(item.end);
      if (Number.isNaN(e) || e <= s) e = s + 30;
      return { item, s, e: Number.isNaN(s) ? 0 : e };
    })
    .sort((a, b) => a.s - b.s || a.e - b.e);

  const out: Placed<E>[] = [];
  let cluster: { item: E; col: number }[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const cols = Math.max(1, colEnds.length);
    for (const c of cluster) out.push({ item: c.item, col: c.col, cols });
    cluster = [];
    colEnds = [];
    clusterEnd = -1;
  };

  for (const it of list) {
    if (cluster.length && it.s >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= it.s);
    if (col === -1) {
      colEnds.push(it.e);
      col = colEnds.length - 1;
    } else {
      colEnds[col] = it.e;
    }
    cluster.push({ item: it.item, col });
    clusterEnd = Math.max(clusterEnd, it.e);
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
  sub: string;
  kind: EventKind;
  start: string;
  end: string;
  top: number;
  height: number;
  col: number;
  cols: number;
};

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
};

/** 把「课程 + 自定义日程」合并成一天的可视块列表，附带并排布局与百分比定位 */
export function buildDay(
  date: string,
  courses: CourseLike[],
  events: PlanEvent[],
): DayBlock[] {
  type Raw = {
    key: string;
    event: PlanEvent | null;
    title: string;
    sub: string;
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
      sub: c.place || c.teacher,
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

  const placed = layoutColumn(raws.map((r) => ({ start: fromMin(r.s), end: fromMin(r.e), raw: r })));

  return placed
    .map((p) => {
      const raw = p.item.raw;
      const s = toMin(p.item.start);
      const e = toMin(p.item.end);
      return {
        key: raw.key,
        event: raw.event,
        title: raw.title,
        sub: raw.sub,
        kind: raw.kind,
        start: raw.start,
        end: raw.end,
        top: pctTop(s),
        height: pctHeight(s, e),
        col: p.col,
        cols: p.cols,
      };
    })
    .sort((a, b) => a.top - b.top);
}
