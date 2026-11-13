"use client";
import { monthDayCn, toMin, weekdayCn } from "@/lib/date";
import {
  KIND_META,
  pctTop,
  type DayBlock,
  type PlanEvent,
  type ViewRange,
} from "@/lib/planner";

/** 整点实线 + 半点虚线；随每小时高度自动缩放。
 *  线刻意压暗一档（zinc-800 / zinc-900），把对比度让给日程块。 */
export function gridBackground(hourH: number) {
  return {
    backgroundImage:
      "linear-gradient(to bottom, rgb(39 39 42) 0 1px, transparent 1px)," +
      "linear-gradient(to bottom, rgb(24 24 27) 0 1px, transparent 1px)",
    backgroundSize: `100% ${hourH}px, 100% ${hourH / 2}px`,
  };
}

/** 表头单元格：周几 + 日期，今天用实心圆点出来 */
export function DayHead({
  date,
  isToday,
  width,
}: {
  date: string;
  isToday: boolean;
  /** 窄屏给固定宽度（一屏一天）；宽屏不给，靠 flex 均分，和正文列严格对齐 */
  width?: number;
}) {
  const wd = weekdayCn(date);
  const weekend = wd === "周六" || wd === "周日";

  return (
    <div
      className={`flex flex-col items-center justify-center gap-[3px] border-r border-zinc-800/60 ${
        width ? "shrink-0" : "min-w-0 flex-1"
      } ${isToday ? "bg-emerald-500/[0.045]" : ""}`}
      style={width ? { width } : undefined}
    >
      <span
        className={`text-[11px] leading-none ${
          isToday ? "text-emerald-400" : weekend ? "text-zinc-600" : "text-zinc-500"
        }`}
      >
        {wd}
      </span>
      <span
        className={
          isToday
            ? "flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[12px] font-semibold leading-none tabular-nums text-zinc-950"
            : `text-[12px] leading-none tabular-nums ${weekend ? "text-zinc-600" : "text-zinc-400"}`
        }
      >
        {monthDayCn(date)}
      </span>
    </div>
  );
}

/** 拖动落点提示：目标列上画一个虚线框，告诉你会落在几点 */
export type DropHint = { top: number; height: number; text: string };

/** 一天的列：网格线在下、日程块在上、当前时间线压在最上 */
export function DayColumn({
  date,
  blocks,
  isToday,
  nowMin,
  width,
  hourH,
  contentH,
  range,
  hours,
  hint,
  draggingKey,
  onBlank,
  onEdit,
  onBlockDown,
}: {
  date: string;
  blocks: DayBlock[];
  isToday: boolean;
  nowMin: number;
  /** 窄屏给固定宽度（一屏一天）；宽屏不给，靠 flex 均分 */
  width?: number;
  hourH: number;
  contentH: number;
  /** 可视时间范围（随当周事件自适应） */
  range: ViewRange;
  /** 可视范围内的整点刻度 */
  hours: number[];
  /** 拖动中、落点在本列时给的虚线框 */
  hint?: DropHint | null;
  /** 正在被拖走的块 key（半透明，提示「它是源」） */
  draggingKey?: string | null;
  onBlank: (date: string, hour: number) => void;
  onEdit: (ev: PlanEvent) => void;
  onBlockDown?: (e: React.PointerEvent<HTMLElement>, b: DayBlock, date: string) => void;
}) {
  const spanMin = Math.max(1, range.endMin - range.startMin);

  return (
    <div
      // data-date 是拖拽落点识别的锚：指针在哪个列上，就复制到哪一天
      data-date={date}
      className={`relative snap-start border-r border-zinc-800/60 ${
        width ? "shrink-0" : "min-w-0 flex-1"
      }`}
      style={{ ...(width ? { width } : {}), height: contentH, ...gridBackground(hourH) }}
    >
      {isToday && <div className="pointer-events-none absolute inset-0 bg-emerald-500/[0.045]" />}

      {/* 空白格：点一下就在这个整点新建 */}
      {hours.map((h) => (
        <button
          key={h}
          type="button"
          aria-label={`${date} ${h} 点 新建日程`}
          className="absolute inset-x-0 z-0 transition-colors hover:bg-zinc-600/20"
          style={{ top: `${pctTop(h * 60, range)}%`, height: `${(60 / spanMin) * 100}%` }}
          onClick={() => onBlank(date, h)}
        />
      ))}

      {blocks.map((b) => (
        <TimeBlock
          key={b.key}
          b={b}
          hourH={hourH}
          dimmed={!!draggingKey && b.key === draggingKey}
          onEdit={onEdit}
          onDown={onBlockDown ? (e) => onBlockDown(e, b, date) : undefined}
        />
      ))}

      {/* 拖动落点：虚线框 + 目标起止时间 */}
      {hint && (
        <div
          className="pointer-events-none absolute inset-x-[2px] z-20 overflow-hidden rounded-[6px] border-2 border-dashed border-emerald-400/80 bg-emerald-400/15 px-2 py-0.5"
          style={{ top: `${hint.top}%`, height: `calc(${hint.height}% - 3px)` }}
        >
          <span className="block truncate text-[11px] font-medium leading-4 tabular-nums text-emerald-100">
            {hint.text}
          </span>
        </div>
      )}

      {/* 当前时间线 */}
      {isToday && nowMin >= range.startMin && nowMin < range.endMin && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20"
          style={{ top: `${pctTop(nowMin, range)}%` }}
        >
          <div className="h-[2px] -translate-y-px bg-emerald-400" />
          <div className="absolute left-0 top-1/2 h-[9px] w-[9px] -translate-y-1/2 rounded-full bg-emerald-400" />
        </div>
      )}
    </div>
  );
}

/** 日程块：实心色块（左侧 4px 主色条 + 四周 1px 描边）。
 *  不用半透明底——黑底上看不出边界，网格线还会穿透块内部。
 *  行数按块的实际像素高度决定，短块只留一行、长块才铺满三行。 */
function TimeBlock({
  b,
  hourH,
  dimmed,
  onEdit,
  onDown,
}: {
  b: DayBlock;
  hourH: number;
  /** 正在被拖走：压暗，让「源」和「落点」一眼分开 */
  dimmed?: boolean;
  onEdit: (ev: PlanEvent) => void;
  onDown?: (e: React.PointerEvent<HTMLElement>) => void;
}) {
  const meta = KIND_META[b.kind];
  const px = ((toMin(b.end) - toMin(b.start)) / 60) * hourH;
  const w = 100 / b.cols;
  const ev = b.event;

  const oneLine = px < 38;
  const showSub = px >= 60;
  const showAll = px >= 82;

  return (
    <button
      type="button"
      // 只有自己排的日程能拖；课程块（ev == null）拖了也没有可复制的记录
      onPointerDown={ev ? onDown : undefined}
      onClick={ev ? () => onEdit(ev) : undefined}
      className={`absolute z-10 overflow-hidden rounded-[6px] border pl-[10px] pr-2 py-[3px] text-left transition-opacity ${meta.bg} ${
        meta.edge
      } ${ev ? "cursor-grab active:cursor-grabbing" : "cursor-default"} ${
        dimmed ? "opacity-30" : ""
      }`}
      style={{
        top: `${b.top}%`,
        height: `calc(${b.height}% - 3px)`,
        left: `calc(${b.col * w}% + 2px)`,
        width: `calc(${w}% - 4px)`,
      }}
    >
      {/* 左侧主色条：独立元素，被块的圆角裁剪，比 border-left 更可控 */}
      <span className={`pointer-events-none absolute inset-y-0 left-0 w-[4px] ${meta.dot}`} />

      {oneLine ? (
        <span className="flex items-baseline gap-1.5 overflow-hidden text-[11px] leading-4">
          <span className="truncate font-semibold text-white">{b.title}</span>
          <span className="shrink-0 tabular-nums text-white/55">
            {b.start}–{b.end}
          </span>
        </span>
      ) : (
        <>
          <span className="block truncate text-[12px] font-semibold leading-4 text-white">
            {b.title}
          </span>
          <span className="block truncate text-[11px] leading-4 tabular-nums text-white/60">
            {b.start}–{b.end}
            {showAll && b.weeks ? ` · ${b.weeks}` : ""}
          </span>
          {showSub && b.sub && (
            <span className="block truncate text-[11px] leading-4 text-white/45">{b.sub}</span>
          )}
        </>
      )}
    </button>
  );
}
