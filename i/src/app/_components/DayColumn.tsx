"use client";
import { monthDayCn, toMin, weekdayCn } from "@/lib/date";
import {
  DAY_END_MIN,
  DAY_START_MIN,
  HOURS,
  KIND_META,
  pctTop,
  type DayBlock,
  type PlanEvent,
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

/** 一天的列：网格线在下、日程块在上、当前时间线压在最上 */
export function DayColumn({
  date,
  blocks,
  isToday,
  nowMin,
  width,
  hourH,
  contentH,
  onBlank,
  onEdit,
}: {
  date: string;
  blocks: DayBlock[];
  isToday: boolean;
  nowMin: number;
  /** 窄屏给固定宽度（一屏一天）；宽屏不给，靠 flex 均分 */
  width?: number;
  hourH: number;
  contentH: number;
  onBlank: (date: string, hour: number) => void;
  onEdit: (ev: PlanEvent) => void;
}) {
  return (
    <div
      className={`relative snap-start border-r border-zinc-800/60 ${
        width ? "shrink-0" : "min-w-0 flex-1"
      }`}
      style={{ ...(width ? { width } : {}), height: contentH, ...gridBackground(hourH) }}
    >
      {isToday && <div className="pointer-events-none absolute inset-0 bg-emerald-500/[0.045]" />}

      {/* 空白格：点一下就在这个整点新建 */}
      {HOURS.map((h) => (
        <button
          key={h}
          type="button"
          aria-label={`${date} ${h} 点 新建日程`}
          className="absolute inset-x-0 z-0 transition-colors hover:bg-zinc-600/20"
          style={{ top: `${pctTop(h * 60)}%`, height: `${100 / HOURS.length}%` }}
          onClick={() => onBlank(date, h)}
        />
      ))}

      {blocks.map((b) => (
        <TimeBlock key={b.key} b={b} hourH={hourH} onEdit={onEdit} />
      ))}

      {/* 当前时间线 */}
      {isToday && nowMin >= DAY_START_MIN && nowMin < DAY_END_MIN && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20"
          style={{ top: `${pctTop(nowMin)}%` }}
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
  onEdit,
}: {
  b: DayBlock;
  hourH: number;
  onEdit: (ev: PlanEvent) => void;
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
      onClick={ev ? () => onEdit(ev) : undefined}
      className={`absolute z-10 overflow-hidden rounded-[6px] border pl-[10px] pr-2 py-[3px] text-left ${meta.bg} ${
        meta.edge
      } ${ev ? "cursor-pointer" : "cursor-default"}`}
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
          <span className="shrink-0 tabular-nums text-white/55">{b.start}</span>
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
