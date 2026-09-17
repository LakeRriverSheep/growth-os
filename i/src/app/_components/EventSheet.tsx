"use client";
import { useState } from "react";
import { fromMin, toMin } from "@/lib/date";
import { KIND_LIST, KIND_META, type EventKind, type PlanEvent } from "@/lib/planner";

export type SheetState =
  | { mode: "new"; date: string; start: string; end: string }
  | { mode: "edit"; event: PlanEvent };

export type SheetPayload = {
  date: string;
  start: string;
  end: string;
  title: string;
  kind: EventKind;
  note: string;
  weekly: boolean;
};

const MAX_MIN = 23 * 60 + 59;

export default function EventSheet({
  state,
  onClose,
  onSave,
  onDelete,
}: {
  state: SheetState;
  onClose: () => void;
  onSave: (p: SheetPayload) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const init: PlanEvent =
    state.mode === "edit"
      ? state.event
      : {
          id: 0,
          date: state.date,
          start: state.start,
          end: state.end,
          title: "",
          kind: "life",
          note: "",
          weekly: false,
        };

  const [title, setTitle] = useState(init.title);
  const [start, setStart] = useState(init.start);
  const [end, setEnd] = useState(init.end);
  const [kind, setKind] = useState<EventKind>(init.kind);
  const [note, setNote] = useState(init.note);
  const [weekly, setWeekly] = useState(init.weekly);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const isEdit = state.mode === "edit";

  /** 改开始时间时保持原时长，结束时间跟着走 */
  function changeStart(v: string) {
    const dur = Math.max(30, toMin(end) - toMin(start));
    setStart(v);
    const ns = toMin(v);
    if (!Number.isNaN(ns)) setEnd(fromMin(Math.min(MAX_MIN, ns + dur)));
  }

  async function submit() {
    if (busy || !title.trim()) return;
    setBusy(true);
    try {
      await onSave({ date: init.date, start, end, title: title.trim(), kind, note, weekly });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    if (!confirmDel) {
      setConfirmDel(true);
      return;
    }
    setBusy(true);
    try {
      await onDelete(init.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const timeInput =
    "rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-600 [color-scheme:dark]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-2xl border border-zinc-800 bg-zinc-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:w-[400px] md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onClose();
          }}
          placeholder="要做什么？"
          className="w-full bg-transparent text-base font-medium text-zinc-100 outline-none placeholder:text-zinc-600"
        />

        <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
          <input type="time" value={start} onChange={(e) => changeStart(e.target.value)} className={timeInput} />
          <span className="text-zinc-600">–</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={timeInput}
          />
          <span className="ml-1 text-[11px] text-zinc-600">{init.date}</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {KIND_LIST.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                kind === k
                  ? KIND_META[k].soft
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${KIND_META[k].dot}`} />
              {KIND_META[k].label}
            </button>
          ))}
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="备注（地点、要点…可留空）"
          className="mt-3 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
        />

        <label className="mt-3 flex cursor-pointer select-none items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={weekly}
            onChange={(e) => setWeekly(e.target.checked)}
            className="h-3.5 w-3.5 accent-emerald-500"
          />
          每周重复（按星期几）
        </label>

        <div className="mt-4 flex items-center gap-2">
          {isEdit && (
            <button
              onClick={remove}
              disabled={busy}
              className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                confirmDel
                  ? "border-red-500 bg-red-500/15 text-red-300"
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              }`}
            >
              {confirmDel ? "再点一次删除" : "删除"}
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={busy || !title.trim()}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-950 transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
