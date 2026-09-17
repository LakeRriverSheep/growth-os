"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, mondayOf, monthDayCn, parseYmd, termWeek, todayYmd, weekdayCn } from "@/lib/date";
import { coursesOnDate } from "@/lib/schedule";
import {
  DAY_END_MIN,
  DAY_START_MIN,
  HOURS,
  KIND_META,
  buildDay,
  pctTop,
  type DayBlock,
  type PlanEvent,
} from "@/lib/planner";
import EventSheet, { type SheetPayload, type SheetState } from "./EventSheet";

const PAD = 7; // 前后各缓冲一周，手机横滑够用
const TOTAL = 21;

function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export default function Planner() {
  const [anchor, setAnchor] = useState("");
  const [today, setToday] = useState("");
  const [nowMin, setNowMin] = useState(-1);
  const [events, setEvents] = useState<PlanEvent[]>([]);
  const [version, setVersion] = useState(0);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [focusIdx, setFocusIdx] = useState(PAD);
  const scroller = useRef<HTMLDivElement | null>(null);

  // 客户端时间：只在挂载后取，避免服务端渲染水合不一致
  useEffect(() => {
    const first = new Date();
    setToday(todayYmd(first));
    setAnchor(todayYmd(first));
    setNowMin(first.getHours() * 60 + first.getMinutes());
    const id = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
      setToday(todayYmd(d));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const monday = anchor ? mondayOf(anchor) : "";

  const days = useMemo(() => {
    if (!monday) return [] as string[];
    const start = addDays(monday, -PAD);
    return Array.from({ length: TOTAL }, (_, i) => addDays(start, i));
  }, [monday]);

  // 拉取「本周 ± 1 周」范围内的日程（每周重复的会一并返回）
  useEffect(() => {
    if (!monday) return;
    let alive = true;
    const from = addDays(monday, -PAD);
    const to = addDays(monday, PAD + 6);
    fetch(`/api/events?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setEvents(Array.isArray(d.events) ? (d.events as PlanEvent[]) : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [monday, version]);

  // 切周 → 手机端回到本周第一屏
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const colW = el.clientWidth;
      if (colW <= 0 || el.scrollWidth <= el.clientWidth + 2) return;
      el.scrollLeft = PAD * colW;
      setFocusIdx(PAD);
    });
    return () => cancelAnimationFrame(raf);
  }, [monday]);

  // 横滑 → 记录当前聚焦的列（手机上的标题与翻页按钮跟着走）
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const colW = el.clientWidth;
        if (colW <= 0) return;
        setFocusIdx(Math.max(0, Math.min(TOTAL - 1, Math.round(el.scrollLeft / colW))));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [monday]);

  const board = useMemo(
    () => days.map((d) => ({ date: d, blocks: buildDay(d, coursesOnDate(d), events) })),
    [days, events],
  );

  const focusDate = days[focusIdx] ?? monday;

  const openNew = useCallback((date: string, hour: number) => {
    setSheet({
      mode: "new",
      date,
      start: hourLabel(hour),
      end: hourLabel(Math.min(23, hour + 1)),
    });
  }, []);

  async function handleSave(p: SheetPayload) {
    const id = sheet?.mode === "edit" ? sheet.event.id : 0;
    await fetch("/api/events", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id, ...p } : p),
    });
    setVersion((v) => v + 1);
  }

  async function handleDelete(id: number) {
    await fetch(`/api/events?id=${id}`, { method: "DELETE" });
    setVersion((v) => v + 1);
  }

  /** 手机：按天翻（滑不动就直接换 anchor） */
  function goDay(n: number) {
    const target = addDays(focusDate, n);
    const el = scroller.current;
    const idx = days.indexOf(target);
    const colW = el ? el.clientWidth : 0;
    if (el && idx >= 0 && colW > 0 && el.scrollWidth > el.clientWidth + 2) {
      el.scrollTo({ left: idx * colW, behavior: "smooth" });
      return;
    }
    setAnchor(target);
  }

  if (!monday) return <div className="h-[100dvh] bg-zinc-950" />;

  const md = parseYmd(monday);
  const weekNo = termWeek(monday);
  const btn =
    "rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100";

  return (
    <div className="flex h-[100dvh] flex-col bg-zinc-950 text-zinc-100">
      {/* 顶栏 */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800 px-3 md:px-4">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight">I</span>
          <span className="hidden text-[11px] text-zinc-600 sm:inline">周计划</span>
        </div>

        {/* 手机：翻天 */}
        <div className="flex items-center gap-1.5 md:hidden">
          <button className={btn} onClick={() => goDay(-1)} aria-label="上一天">
            ‹
          </button>
          <button className={btn} onClick={() => setAnchor(today)}>
            今天
          </button>
          <button className={btn} onClick={() => goDay(1)} aria-label="下一天">
            ›
          </button>
        </div>

        {/* 桌面：翻周 */}
        <div className="hidden items-center gap-1.5 md:flex">
          <button className={btn} onClick={() => setAnchor(addDays(monday, -7))} aria-label="上一周">
            ‹
          </button>
          <button className={btn} onClick={() => setAnchor(today)}>
            今天
          </button>
          <button className={btn} onClick={() => setAnchor(addDays(monday, 7))} aria-label="下一周">
            ›
          </button>
        </div>

        <div className="min-w-0 truncate text-sm text-zinc-300 md:hidden">
          {monthDayCn(focusDate)} {weekdayCn(focusDate)}
        </div>
        <div className="hidden min-w-0 truncate text-sm md:block">
          {md.getFullYear()}年{md.getMonth() + 1}月
          <span className="mx-1.5 text-zinc-700">·</span>
          <span className="text-zinc-400">
            第 {weekNo} 周 {monthDayCn(monday)}–{monthDayCn(addDays(monday, 6))}
          </span>
        </div>

        <Link
          href="/goal/fitness"
          className="ml-auto shrink-0 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100"
        >
          健身
        </Link>
      </header>

      {/* 主体：外层纵向滚动（时间轴跟着走），日列区独立横向滑动（手机一屏一天） */}
      <div className="planner-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="flex min-h-full w-full">
          <aside className="flex w-12 shrink-0 flex-col bg-zinc-950">
            <div className="h-11 shrink-0 border-b border-zinc-800" />
            <div className="planner-daygrid relative">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute right-1.5 translate-y-[3px] text-[10px] tabular-nums text-zinc-600"
                  style={{ top: `${pctTop(h * 60)}%` }}
                >
                  {h}:00
                </div>
              ))}
            </div>
          </aside>

          <div
            ref={scroller}
            className="flex min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto md:snap-none"
          >
            {board.map(({ date, blocks }, i) => (
              <DayColumn
                key={date}
                date={date}
                blocks={blocks}
                isToday={date === today}
                nowMin={nowMin}
                buffer={i < PAD || i > PAD + 6}
                onBlank={openNew}
                onEdit={(ev) => setSheet({ mode: "edit", event: ev })}
              />
            ))}
          </div>
        </div>
      </div>

      {sheet && (
        <EventSheet
          state={sheet}
          onClose={() => setSheet(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function DayColumn({
  date,
  blocks,
  isToday,
  nowMin,
  buffer,
  onBlank,
  onEdit,
}: {
  date: string;
  blocks: DayBlock[];
  isToday: boolean;
  nowMin: number;
  /** 前后缓冲的那一周：桌面端不显示 */
  buffer: boolean;
  onBlank: (date: string, hour: number) => void;
  onEdit: (ev: PlanEvent) => void;
}) {
  const wd = weekdayCn(date);
  const weekend = wd === "周六" || wd === "周日";

  return (
    <div
      className={`planner-col flex snap-start flex-col border-r border-zinc-900 ${
        buffer ? "planner-col--buffer" : ""
      } ${isToday ? "bg-zinc-900/25" : ""}`}
    >
      <div className="sticky top-0 z-20 flex h-11 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-2">
        <span className={`text-[11px] ${isToday ? "text-zinc-200" : weekend ? "text-zinc-600" : "text-zinc-500"}`}>
          {wd}
        </span>
        <span
          className={`text-[11px] tabular-nums ${
            isToday
              ? "flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-100 px-1.5 font-semibold text-zinc-950"
              : "text-zinc-600"
          }`}
        >
          {monthDayCn(date)}
        </span>
      </div>

      <div className="planner-gridlines planner-daygrid relative">
        {/* 空白格：点一下就在这个整点新建 */}
        {HOURS.map((h) => (
          <button
            key={h}
            aria-label={`${date} ${h} 点 新建`}
            className="absolute inset-x-0 transition-colors hover:bg-zinc-700/20"
            style={{ top: `${pctTop(h * 60)}%`, height: `${100 / 18}%` }}
            onClick={() => onBlank(date, h)}
          />
        ))}

        {/* 日程块 */}
        {blocks.map((b) => {
          const w = 100 / b.cols;
          const meta = KIND_META[b.kind];
          const ev = b.event;
          return (
            <button
              key={b.key}
              disabled={!ev}
              onClick={() => ev && onEdit(ev)}
              className={`absolute z-10 overflow-hidden rounded-md border px-1.5 py-[3px] text-left leading-tight ${meta.block} ${
                ev ? "cursor-pointer hover:brightness-125" : "cursor-default"
              }`}
              style={{
                top: `${b.top}%`,
                height: `calc(${b.height}% - 2px)`,
                left: `calc(${b.col * w}% + 1px)`,
                width: `calc(${w}% - 3px)`,
              }}
            >
              <span className="block truncate text-[11px] font-medium">{b.title}</span>
              <span className="block truncate text-[10px] opacity-70">
                {b.start}
                {b.sub ? ` · ${b.sub}` : ""}
              </span>
            </button>
          );
        })}

        {/* 当前时间线 */}
        {isToday && nowMin >= DAY_START_MIN && nowMin < DAY_END_MIN && (
          <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: `${pctTop(nowMin)}%` }}>
            <div className="h-px bg-rose-500" />
            <div className="absolute -top-[3px] left-0 h-[7px] w-[7px] rounded-full bg-rose-500" />
          </div>
        )}
      </div>
    </div>
  );
}
