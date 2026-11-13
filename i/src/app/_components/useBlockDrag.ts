"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toMin } from "@/lib/date";
import { snapDropStart, type DayBlock, type PlanEvent, type ViewRange } from "@/lib/planner";

/** 拖到的目标格：哪一天 + 从第几分钟开始 */
export type DropTarget = { date: string; startMin: number };

/** 拖动中的浮层状态（渲染用） */
export type DragTip = {
  ev: PlanEvent;
  /** 指针按下的那一列（同一列同一时间放下＝什么都不做） */
  fromDate: string;
  origStartMin: number;
  durMin: number;
  /** 视口坐标，给浮动小卡片跟随 */
  x: number;
  y: number;
  target: DropTarget | null;
  /** 按住 Shift = 移动；默认 = 复制（不动源块） */
  move: boolean;
};

export type DropResult = {
  ev: PlanEvent;
  date: string;
  startMin: number;
  durMin: number;
  mode: "copy" | "move";
};

type Opts = {
  range: ViewRange;
  /** 拖到上下边缘时自动滚动用的容器 */
  scroller: React.RefObject<HTMLDivElement | null>;
  onDrop: (r: DropResult) => void;
};

/** 移动不到这个像素数就算点击，不算拖动 */
const MOVE_THRESHOLD = 4;
/** 自动滚动触发带（px） */
const EDGE = 64;

type Handlers = {
  move?: (e: PointerEvent) => void;
  up?: (e: PointerEvent) => void;
  cancel?: () => void;
  key?: (e: KeyboardEvent) => void;
};

/**
 * 日程块拖拽：把一个块拖到任意一天、任意时间。
 *
 * 用 Pointer Events（鼠标 + 触屏同一套 API），但**触屏不启用拖拽**——
 * 手机上左右滑是切天，块一旦吃掉手势就滑不动了，手机走「点开 → 改日期」更稳。
 * 默认动作是「复制」（源块保持不变），按住 Shift 拖是「移动」。
 */
export function useBlockDrag({ range, scroller, onDrop }: Opts) {
  const [tip, setTip] = useState<DragTip | null>(null);

  const tipRef = useRef<DragTip | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const pressPoint = useRef({ x: 0, y: 0 });
  const grabMin = useRef(0);
  const durMin = useRef(0);
  const origin = useRef<{ date: string; startMin: number }>({ date: "", startMin: 0 });
  const shift = useRef(false);
  const moved = useRef(false);
  const live = useRef(false);
  const frame = useRef(0);
  const scrollFrame = useRef(0);
  const guard = useRef(false);
  const handlers = useRef<Handlers>({});
  const rangeRef = useRef(range);
  const dropRef = useRef(onDrop);

  useEffect(() => {
    rangeRef.current = range;
  }, [range]);
  useEffect(() => {
    dropRef.current = onDrop;
  }, [onDrop]);

  /** 指针坐标 → 落在哪一天的第几分钟；不在任何一天上返回 null */
  const computeTarget = useCallback((x: number, y: number): DropTarget | null => {
    const rg = rangeRef.current;
    const span = Math.max(1, rg.endMin - rg.startMin);
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const col = el?.closest<HTMLElement>("[data-date]");
    if (!col) return null;
    const date = col.dataset.date || "";
    const r = col.getBoundingClientRect();
    if (!date || r.height <= 0) return null;
    // 指针跑到列上下端之外时贴边处理，别让「差几像素」判成失败
    const ratio = Math.max(0, Math.min(1, (y - r.top) / r.height));
    const pointerMin = rg.startMin + ratio * span;
    return {
      date,
      startMin: snapDropStart(pointerMin, grabMin.current, durMin.current, origin.current.startMin, rg),
    };
  }, []);

  /** 每帧最多刷新一次：指针每动一像素都 setState 会把 7 列全重渲染 */
  const flush = useCallback(() => {
    const prev = tipRef.current;
    if (!prev || !live.current) return;
    const p = pointer.current;
    const next: DragTip = {
      ...prev,
      x: p.x,
      y: p.y,
      target: computeTarget(p.x, p.y),
      move: shift.current,
    };
    if (
      prev.x === next.x &&
      prev.y === next.y &&
      prev.move === next.move &&
      prev.target?.date === next.target?.date &&
      prev.target?.startMin === next.target?.startMin
    ) {
      return;
    }
    tipRef.current = next;
    setTip(next);
  }, [computeTarget]);

  const schedule = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      flush();
    });
  }, [flush]);

  /** 靠边自动滚动：不然「06:00 拖到 22:00」得先手动滚屏，根本拖不动 */
  const step = useCallback(() => {
    const el = scroller.current;
    if (!live.current || !el) return;
    const r = el.getBoundingClientRect();
    const y = pointer.current.y;
    let dy = 0;
    if (y < r.top + EDGE) dy = -Math.min(24, (r.top + EDGE - y) / 2);
    else if (y > r.bottom - EDGE) dy = Math.min(24, (y - (r.bottom - EDGE)) / 2);
    if (!dy) return;
    el.scrollTop += dy;
    schedule();
  }, [scroller, schedule]);

  const detach = useCallback(() => {
    const h = handlers.current;
    if (h.move) window.removeEventListener("pointermove", h.move);
    if (h.up) window.removeEventListener("pointerup", h.up);
    if (h.cancel) window.removeEventListener("pointercancel", h.cancel);
    if (h.key) {
      window.removeEventListener("keydown", h.key);
      window.removeEventListener("keyup", h.key);
    }
    handlers.current = {};
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    if (scrollFrame.current) {
      cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = 0;
    }
    document.body.style.cursor = "";
  }, []);

  /** 收尾：commit=true 才落地，false 只清理（Esc / 指针被系统抢走） */
  const finish = useCallback(
    (commit: boolean, x: number, y: number, withShift: boolean) => {
      if (!live.current) return;
      live.current = false;
      detach();

      const prev = tipRef.current;
      tipRef.current = null;
      setTip(null);
      if (!prev) return;

      // 真拖动过就吃掉紧随其后的 click，否则放手瞬间会弹出编辑面板
      if (moved.current) {
        guard.current = true;
        setTimeout(() => {
          guard.current = false;
        }, 300);
      }
      if (!commit || !moved.current) return;

      const target = computeTarget(x, y);
      if (!target) return;
      if (target.date === origin.current.date && target.startMin === origin.current.startMin) return;
      dropRef.current({
        ev: prev.ev,
        date: target.date,
        startMin: target.startMin,
        durMin: durMin.current,
        mode: withShift ? "move" : "copy",
      });
    },
    [computeTarget, detach],
  );

  const begin = useCallback(
    (e: React.PointerEvent<HTMLElement>, b: DayBlock, date: string) => {
      // 课程块（课表生成的）不可拖：库里没有它，复制出来的会是一条无主日程
      const ev = b.event;
      if (!ev || e.button !== 0 || e.pointerType === "touch") return;
      e.preventDefault();
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const s = toMin(b.start);
      let eMin = toMin(b.end);
      if (Number.isNaN(eMin) || eMin <= s) eMin = s + 30;
      durMin.current = Math.max(5, eMin - s);
      grabMin.current = rect.height
        ? Math.max(0, Math.min(durMin.current, ((e.clientY - rect.top) / rect.height) * durMin.current))
        : 0;
      origin.current = { date, startMin: s };
      pointer.current = { x: e.clientX, y: e.clientY };
      pressPoint.current = { x: e.clientX, y: e.clientY };
      shift.current = e.shiftKey;
      moved.current = false;
      live.current = true;

      const first: DragTip = {
        ev,
        fromDate: date,
        origStartMin: s,
        durMin: durMin.current,
        x: e.clientX,
        y: e.clientY,
        target: { date, startMin: s },
        move: e.shiftKey,
      };
      tipRef.current = first;
      setTip(first);

      const h: Handlers = {
        move: (evt) => {
          pointer.current = { x: evt.clientX, y: evt.clientY };
          shift.current = evt.shiftKey;
          if (!moved.current) {
            const d =
              Math.abs(evt.clientX - pressPoint.current.x) +
              Math.abs(evt.clientY - pressPoint.current.y);
            if (d >= MOVE_THRESHOLD) moved.current = true;
          }
          schedule();
        },
        up: (evt) => finish(true, evt.clientX, evt.clientY, evt.shiftKey),
        cancel: () => finish(false, 0, 0, false),
        key: (evt) => {
          if (evt.key === "Escape") {
            finish(false, 0, 0, false);
            return;
          }
          if (evt.key !== "Shift") return;
          shift.current = evt.type === "keydown";
          schedule();
        },
      };
      handlers.current = h;
      window.addEventListener("pointermove", h.move!);
      window.addEventListener("pointerup", h.up!);
      window.addEventListener("pointercancel", h.cancel!);
      window.addEventListener("keydown", h.key!);
      window.addEventListener("keyup", h.key!);
      document.body.style.cursor = "grabbing";

      if (!scrollFrame.current) {
        const loop = () => {
          if (!live.current) {
            scrollFrame.current = 0;
            return;
          }
          step();
          scrollFrame.current = requestAnimationFrame(loop);
        };
        scrollFrame.current = requestAnimationFrame(loop);
      }
    },
    [finish, schedule, step],
  );

  // 卸载兜底
  useEffect(() => {
    const h = handlers.current;
    return () => {
      live.current = false;
      detach();
      void h;
    };
  }, [detach]);

  /** 紧随拖动的那次 click 要忽略（别顺手弹出编辑面板） */
  const consumeClick = useCallback(() => {
    if (!guard.current) return false;
    guard.current = false;
    return true;
  }, []);

  return { tip, begin, consumeClick };
}
