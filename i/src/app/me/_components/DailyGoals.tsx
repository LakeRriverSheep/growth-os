"use client";
import { useCallback, useEffect, useState } from "react";
import { QUOTAS, BEHAVIORS, COMPETENCE } from "@/lib/dailyGoals";

// 每日目标：① 当天量化目标（点数字直接改）② 本周达成次数 ③ 厉害的人每天会做的事
// ④ 认知 · 见识 · 能力长期清单（一次勾住就一直成立）

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function Row({
  on,
  label,
  desc,
  onClick,
}: {
  on: boolean;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
        on ? "border-zinc-700 bg-zinc-900" : "border-zinc-800 hover:border-zinc-600"
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          on ? "border-zinc-100 bg-zinc-100" : "border-zinc-600"
        }`}
      >
        {on && <span className="h-2 w-2 rounded-full bg-zinc-900" />}
      </span>
      <span className="min-w-0">
        <span
          className={`block text-sm ${on ? "text-zinc-500 line-through" : "text-zinc-200"}`}
        >
          {label}
        </span>
        {desc && <span className="block text-[11px] leading-5 text-zinc-500">{desc}</span>}
      </span>
    </button>
  );
}

export default function DailyGoals() {
  const [date] = useState(todayIso);
  const [values, setValues] = useState<Record<string, number>>({});
  const [weekDone, setWeekDone] = useState<Record<string, number>>({});
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  const loadGoals = useCallback(async (d: string) => {
    try {
      const r = await fetch(`/api/goals?date=${d}`);
      if (!r.ok) return;
      const data = await r.json();
      setValues(data.values ?? {});
      setWeekDone(data.weekDone ?? {});
    } catch {
      /* 离线时保持空 */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(`/api/goals?date=${date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) {
          setValues(d.values ?? {});
          setWeekDone(d.weekDone ?? {});
        }
      })
      .catch(() => {});
    fetch(`/api/check-items?date=${date}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { item: string; checked: number }[]) => {
        if (!alive) return;
        const map: Record<string, boolean> = {};
        for (const r of rows) map[r.item] = !!r.checked;
        setChecks(map);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [date]);

  useEffect(() => {
    fetch("/api/me-flags")
      .then((r) => (r.ok ? r.json() : {}))
      .then((map: Record<string, boolean>) => setFlags(map))
      .catch(() => {});
  }, []);

  // 点数字直接改：输入即本地更新，失焦或回车落库
  async function saveValue(key: string, v: number) {
    if (!date) return;
    setValues((m) => ({ ...m, [key]: v }));
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, item: key, value: v }),
    });
    loadGoals(date);
  }

  async function toggleCheck(key: string, next: boolean) {
    if (!date) return;
    setChecks((m) => ({ ...m, [key]: next }));
    await fetch("/api/check-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, item: key, checked: next }),
    });
  }

  async function toggleFlag(key: string, next: boolean) {
    setFlags((m) => ({ ...m, [key]: next }));
    await fetch("/api/me-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, done: next }),
    });
  }

  const behDone = BEHAVIORS.filter((b) => checks[`me:beh:${b.key}`]).length;
  const flagTotal = COMPETENCE.reduce((n, g) => n + g.items.length, 0);
  const flagDone = COMPETENCE.reduce(
    (n, g) => n + g.items.filter((i) => flags[i.key]).length,
    0,
  );
  const quotaDone = QUOTAS.filter((q) => (values[q.key] ?? 0) >= q.daily).length;

  return (
    <div className="mt-3 space-y-6">
      {/* ① 今日量化目标 */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">今日量化目标</h3>
          <span className="text-xs text-zinc-500">
            达标 {quotaDone} / {QUOTAS.length}
          </span>
        </div>

        <ul className="mt-3 space-y-2.5">
          {QUOTAS.map((q) => {
            const v = values[q.key] ?? 0;
            const ok = v >= q.daily;
            return (
              <li
                key={q.key}
                className="flex flex-col gap-2 border-b border-zinc-900 pb-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200">
                    {q.label}
                    <span className="ml-2 text-[11px] text-zinc-500">
                      每日 {q.daily} {q.unit}
                      {q.week > 0 ? ` · 每周至少 ${q.week} 次` : ""}
                    </span>
                  </p>
                  <p className="text-[11px] leading-5 text-zinc-500">{q.how}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {q.week > 0 && (
                    <span className="flex items-center gap-1" title="本周达标天数">
                      {Array.from({ length: q.week }).map((_, i) => (
                        <span
                          key={i}
                          className={`h-2 w-2 rounded-full ${
                            (weekDone[q.key] ?? 0) > i ? "bg-zinc-100" : "bg-zinc-700"
                          }`}
                        />
                      ))}
                    </span>
                  )}
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    value={values[q.key] ?? 0}
                    onChange={(e) => setValues((m) => ({ ...m, [q.key]: e.target.value === "" ? 0 : Number(e.target.value) }))}
                    onBlur={(e) => saveValue(q.key, Number(e.target.value) || 0)}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    className={`w-20 rounded-xl border bg-zinc-950 px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-zinc-500 ${
                      ok ? "border-zinc-500 text-zinc-100" : "border-zinc-800 text-zinc-300"
                    }`}
                  />
                  <span className="w-6 text-xs text-zinc-500">{q.unit}</span>
                  <span className={`w-4 text-xs ${ok ? "text-emerald-400" : "text-zinc-700"}`}>
                    {ok ? "✓" : "·"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ② 厉害的人每天会做的具体行为 */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">厉害的人每天会做的事</h3>
          <span className="text-xs text-zinc-500">
            {behDone} / {BEHAVIORS.length}
          </span>
        </div>
        <ul className="mt-3 grid gap-2 lg:grid-cols-2">
          {BEHAVIORS.map((b) => {
            const key = `me:beh:${b.key}`;
            return (
              <li key={b.key}>
                <Row
                  on={!!checks[key]}
                  label={b.label}
                  desc={b.desc}
                  onClick={() => toggleCheck(key, !checks[key])}
                />
              </li>
            );
          })}
        </ul>
      </div>

      {/* ③ 认知 · 见识 · 能力：长期建档，达成即勾 */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">
            认知 · 见识 · 能力
            <span className="ml-2 text-[11px] font-normal text-zinc-500">
              长期建档，达成即勾，不按天重置
            </span>
          </h3>
          <span className="shrink-0 text-xs text-zinc-500">
            {flagDone} / {flagTotal}
          </span>
        </div>

        <div className="mt-3 space-y-5">
          {COMPETENCE.map((g) => (
            <div key={g.group}>
              <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                {g.group}
                <span className="ml-2 normal-case tracking-normal text-zinc-600">
                  {g.items.filter((i) => flags[i.key]).length} / {g.items.length}
                </span>
              </p>
              <ul className="mt-2 grid gap-2 lg:grid-cols-2">
                {g.items.map((i) => (
                  <li key={i.key}>
                    <Row
                      on={!!flags[i.key]}
                      label={i.label}
                      desc={i.desc}
                      onClick={() => toggleFlag(i.key, !flags[i.key])}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
