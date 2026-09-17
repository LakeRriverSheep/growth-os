"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  mondayOf,
  monthDayCn,
  parseYmd,
  termWeek,
  todayYmd,
  toMin,
} from "@/lib/date";
import { coursesOnDate } from "@/lib/schedule";
import { DAY_END_MIN, DAY_START_MIN, HOURS, buildDay, type PlanEvent } from "@/lib/planner";
import EventSheet, { type SheetPayload, type SheetState } from "./EventSheet";
import { DayColumn, DayHead } from "./DayColumn";

/** 前后各缓冲一周：手机上左右滑动时不至于一滑就出头 */
const PAD = 7;
const TOTAL = 21;
const ROWS = HOURS.length; // 05:00–23:00 → 18 格
const AXIS_W = 56; // 左侧时间轴宽度
const HEAD_H = 52; // 表头行高度
const MIN_HOUR = 56; // 每小时最小高度：再挤就让它纵向滚动，不硬塞进一屏
const MAX_HOUR = 120;
const NARROW_W = 768; // 窄于此宽度：一屏一天，左右滑动

type Layout = { w: number; h: number; narrow: boolean; hourH: number; sbw: number };

function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function hourMinLabel(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export default function Planner() {
  const [anchor, setAnchor] = useState("");
  const [today, setToday] = useState("");
  const [nowMin, setNowMin] = useState(-1);
  const [events, setEvents] = useState<PlanEvent[]>([]);
  const [version, setVersion] = useState(0);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [layout, setLayout] = useState<Layout>({
    w: 0,
    h: 0,
    narrow: false,
    hourH: MIN_HOUR,
    sbw: 0,
  });
  const [focusIdx, setFocusIdx] = useState(PAD);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const resizeObs = useRef<ResizeObserver | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const didPinScroll = useRef(false);
  const wantDateRef = useRef<string | null>(null);

  // 量容器：宽度决定是否窄屏，高度决定每小时多高。
  // 用回调 ref 而不是 useLayoutEffect([])：首帧 anchor 还没值、滚动容器尚未挂载，
  // 一次性 effect 会量到 null 之后再也不会重跑。
  const attachScroll = useCallback((el: HTMLDivElement | null) => {
    scrollRef.current = el;
    resizeObs.current?.disconnect();
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      // 纵向滚动条宽度：表头在滚动容器外，要自己留出这条缝才能和正文列对齐
      const sbw = Math.max(0, el.offsetWidth - el.clientWidth);
      setLayout((prev) => {
        const narrow = w < NARROW_W;
        const hourH = Math.min(MAX_HOUR, Math.max(MIN_HOUR, h / ROWS));
        if (
          prev.w === w &&
          prev.h === h &&
          prev.narrow === narrow &&
          prev.hourH === hourH &&
          prev.sbw === sbw
        ) {
          return prev;
        }
        return { w, h, narrow, hourH, sbw };
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    resizeObs.current = ro;
  }, []);

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

  const colW = useMemo(() => {
    if (!layout.w) return 0;
    const inner = Math.max(0, layout.w - AXIS_W);
    return layout.narrow ? Math.max(200, inner) : 0;
  }, [layout.w, layout.narrow]);

  const contentH = layout.hourH * ROWS;

  /** 桌面上只渲染本周 7 列（横滑交给手机） */
  const cols = useMemo(
    () => (layout.narrow ? days : days.slice(PAD, PAD + 7)),
    [days, layout.narrow],
  );

  const board = useMemo(
    () => cols.map((d) => ({ date: d, blocks: buildDay(d, coursesOnDate(d), events) })),
    [cols, events],
  );

  /** 本周最早的一个日程开始时间（用于首屏滚动定位） */
  const earliestMin = useMemo(() => {
    let m = DAY_END_MIN;
    for (const { blocks } of board) {
      for (const b of blocks) m = Math.min(m, toMin(b.start));
    }
    return m;
  }, [board]);

  const jumpTo = useCallback(
    (min: number, smooth: boolean) => {
      const el = scrollRef.current;
      if (!el) return;
      const target = Math.max(DAY_START_MIN, min);
      el.scrollTo({
        top: ((target - DAY_START_MIN) / 60) * layout.hourH,
        behavior: smooth ? "smooth" : "auto",
      });
    },
    [layout.hourH],
  );

  // 首屏：把 06:00–07:00 一带顶到最上面，早上第一节课不用往下翻
  useEffect(() => {
    if (!layout.h || didPinScroll.current) return;
    const first = Number.isFinite(earliestMin) ? earliestMin : 7 * 60;
    jumpTo(Math.min(7 * 60, first - 30), false);
    didPinScroll.current = true;
  }, [layout.h, earliestMin, jumpTo]);

  const syncHead = useCallback((sl: number) => {
    const h = headRef.current;
    if (h) h.style.transform = sl ? `translateX(${-sl}px)` : "";
  }, []);

  // 窄屏：切周后回到本周周一那一屏；表头同步平移
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !layout.narrow || !colW) return;
    const raf = requestAnimationFrame(() => {
      const want = wantDateRef.current;
      const idx = want ? days.indexOf(want) : -1;
      const i = idx >= 0 ? idx : PAD;
      wantDateRef.current = null;
      el.scrollLeft = i * colW;
      setFocusIdx(i);
      syncHead(el.scrollLeft);
    });
    return () => cancelAnimationFrame(raf);
  }, [monday, layout.narrow, colW, days, syncHead]);

  // 宽屏：没有横向滚动，表头别留位移
  useEffect(() => {
    if (!layout.narrow) syncHead(0);
  }, [layout.narrow, syncHead]);

  // 横向滚动：表头跟手平移；只在跨过一整天时才更新状态（避免每帧重渲染）
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        syncHead(el.scrollLeft);
        if (!layout.narrow || !colW) return;
        const i = Math.max(0, Math.min(TOTAL - 1, Math.round(el.scrollLeft / colW)));
        setFocusIdx((prev) => (prev === i ? prev : i));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [layout.narrow, colW, syncHead]);

  const focusDate = days[focusIdx] ?? monday;

  /** 当前时间落在可视范围内时，时间轴上给一个绿标，和列里的时间线对上 */
  const nowVisible =
    !!today && cols.includes(today) && nowMin >= DAY_START_MIN && nowMin < DAY_END_MIN;

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

  /** 窄屏：按天翻（滑得动就直接滑） */
  function goDay(n: number) {
    if (!layout.narrow) {
      setAnchor(addDays(monday, 7 * n));
      return;
    }
    const target = addDays(focusDate, n);
    const el = scrollRef.current;
    const idx = days.indexOf(target);
    if (el && idx >= 0 && colW > 0) {
      el.scrollTo({ left: idx * colW, behavior: "smooth" });
      return;
    }
    setAnchor(target);
  }

  /** 今天：回到本周、切到今天的列、滚到当前时间 */
  function goToday() {
    wantDateRef.current = today;
    setAnchor(today);
    jumpTo(nowMin >= 0 ? nowMin - 90 : 7 * 60, true);
    const el = scrollRef.current;
    const idx = days.indexOf(today);
    if (el && layout.narrow && idx >= 0 && colW > 0) {
      el.scrollTo({ left: idx * colW, behavior: "smooth" });
    }
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

        <div className="flex items-center gap-1.5">
          <button
            className={btn}
            onClick={() => goDay(-1)}
            aria-label={layout.narrow ? "上一天" : "上一周"}
          >
            ‹
          </button>
          <button className={btn} onClick={goToday}>
            今天
          </button>
          <button
            className={btn}
            onClick={() => goDay(1)}
            aria-label={layout.narrow ? "下一天" : "下一周"}
          >
            ›
          </button>
        </div>

        <div className="min-w-0 truncate text-sm text-zinc-300">
          <span className="md:hidden">
            第 {termWeek(focusDate)} 周 · {monthDayCn(focusDate)}
          </span>
          <span className="hidden md:inline">
            {md.getFullYear()}年{md.getMonth() + 1}月
            <span className="mx-1.5 text-zinc-700">·</span>
            <span className="text-zinc-400">
              第 {weekNo} 周 {monthDayCn(monday)}–{monthDayCn(addDays(monday, 6))}
            </span>
          </span>
        </div>

        <Link
          href="/goal/fitness"
          className="ml-auto shrink-0 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100"
        >
          健身
        </Link>
      </header>

      {/* 表头：在滚动容器之外，所以纵向永远贴顶；横向靠 translateX 跟着走 */}
      <div
        className="flex shrink-0 select-none border-b border-zinc-800 bg-zinc-950"
        style={{ height: HEAD_H }}
      >
        <div
          className="flex shrink-0 flex-col items-center justify-center border-r border-zinc-800/80"
          style={{ width: AXIS_W }}
        >
          <span className="text-[10px] leading-3 text-zinc-600">{md.getMonth() + 1}月</span>
          <span className="mt-0.5 text-[10px] leading-3 text-zinc-700">第{weekNo}周</span>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden" style={{ paddingRight: layout.sbw }}>
          <div ref={headRef} className="planner-headrow flex h-full">
            {board.map(({ date }) => (
              <DayHead
                key={date}
                date={date}
                isToday={date === today}
                width={layout.narrow ? colW : undefined}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 主体：一个容器同时管纵向滚动与（窄屏的）横向滑动 */}
      <div
        ref={attachScroll}
        className={`planner-scroll min-h-0 flex-1 select-none ${
          layout.narrow
            ? "snap-x snap-mandatory scroll-pl-14 overflow-auto"
            : "overflow-x-hidden overflow-y-auto"
        }`}
      >
        {/* 窄屏下这一行要 w-max：否则 sticky 的包含块只有一屏宽，左侧时间轴钉不住 */}
        <div
          className={`flex items-start ${layout.narrow ? "w-max" : "w-full"}`}
          style={{ height: contentH }}
        >
          {/* 时间轴：纵向随内容、横向钉住 */}
          <aside
            className="sticky left-0 z-30 shrink-0 border-r border-zinc-800/80 bg-zinc-950"
            style={{ width: AXIS_W, height: contentH }}
          >
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[11px] leading-none tabular-nums text-zinc-500"
                style={{ top: (h - HOURS[0]) * layout.hourH + 5 }}
              >
                {hourLabel(h)}
              </div>
            ))}

            {nowVisible && (
              <div
                className="absolute right-1 -translate-y-1/2 rounded bg-emerald-500 px-1 py-px text-[10px] font-semibold leading-none tabular-nums text-zinc-950"
                style={{ top: ((nowMin - DAY_START_MIN) / 60) * layout.hourH }}
              >
                {hourMinLabel(nowMin)}
              </div>
            )}
          </aside>

          {board.map(({ date, blocks }) => (
            <DayColumn
              key={date}
              date={date}
              blocks={blocks}
              isToday={date === today}
              nowMin={nowMin}
              width={layout.narrow ? colW : undefined}
              hourH={layout.hourH}
              contentH={contentH}
              onBlank={openNew}
              onEdit={(ev) => setSheet({ mode: "edit", event: ev })}
            />
          ))}
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
