"use client";
import Link from "next/link";

import { useEffect, useMemo, useState } from "react";
import type { FitnessPlan, DayPlan, MealPlan } from "@/lib/fitness";

const ALL_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const PLACE_EMOJI: Record<string, string> = { 健身房: "🏟️", 家里: "🏠", 户外: "🌳" };

function StatCard({ label, value, unit, accent }: { label: string; value: number | string; unit?: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 text-center ${
        accent ? "border-emerald-600/60 bg-emerald-950/40" : "border-zinc-800 bg-zinc-900/60"
      }`}
    >
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${accent ? "text-emerald-400" : "text-zinc-100"}`}>
        {value}
        {unit && <span className="ml-0.5 text-xs font-normal text-zinc-500">{unit}</span>}
      </p>
    </div>
  );
}

function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function MealCard({ title, when, items, accent }: { title: string; when: string; items: string[]; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3.5 ${accent ? "border-emerald-700/50 bg-emerald-950/20" : "border-zinc-800 bg-zinc-900/50"}`}>
      <div className="flex items-baseline justify-between">
        <span className={`text-xs font-semibold ${accent ? "text-emerald-400" : "text-zinc-200"}`}>{title}</span>
        {when && <span className="text-[10px] text-zinc-500">{when}</span>}
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-xs leading-5 text-zinc-400">
            · {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrainingDay({
  day,
  meals,
  dateIso,
  done,
  onComplete,
}: {
  day: DayPlan;
  meals: MealPlan;
  dateIso: string;
  done: boolean;
  onComplete: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function complete() {
    setSaving(true);
    try {
      await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateIso,
          training: `${day.type} · ${day.place} · ${day.exercises.length}个动作`,
          diet: "练前餐 + 练后餐已执行",
          calories: "",
          done: true,
        }),
      });
      onComplete();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-zinc-800/80 px-2.5 py-1 text-[11px] text-zinc-300">
          {PLACE_EMOJI[day.place] ?? "📍"} {day.place}
        </span>
        <span className="rounded-full bg-emerald-950/60 px-2.5 py-1 text-[11px] text-emerald-400">{day.slot}</span>
        <span className="rounded-full bg-zinc-800/80 px-2.5 py-1 text-[11px] text-zinc-400">≈{day.minutes} 分钟</span>
      </div>

      <div className="mt-3 space-y-2.5">
        <MealCard title="🍌 练前吃" when={meals.preWorkout.when} items={meals.preWorkout.items} />
        <MealCard title="🍗 练后吃" when={meals.postWorkout.when} items={meals.postWorkout.items} accent />
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900 text-left text-[11px] text-zinc-500">
              <th className="px-3 py-2 font-normal">动作</th>
              <th className="px-2 py-2 font-normal">起始重量</th>
              <th className="px-2 py-2 font-normal">组×次</th>
              <th className="px-2 py-2 font-normal">休息</th>
            </tr>
          </thead>
          <tbody>
            {day.exercises.map((ex, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-zinc-950/40" : "bg-zinc-900/30"}>
                <td className="px-3 py-2.5">
                  <p className="text-zinc-200">{ex.name}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">{ex.muscle}</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-emerald-600/90">{ex.cue}</p>
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-xs text-zinc-300">{ex.startWeight}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-xs text-zinc-400">{ex.setsReps}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-xs text-zinc-500">{ex.rest}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={complete}
        disabled={done || saving}
        className={`mt-3 w-full rounded-full py-3 text-sm font-medium transition-colors ${
          done
            ? "cursor-default bg-emerald-950/60 text-emerald-400"
            : "bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
        }`}
      >
        {done ? "✓ 今日已完成打卡" : saving ? "记录中…" : "✓ 练完了，打卡记录"}
      </button>
    </div>
  );
}

function RestDay({ meals }: { meals: MealPlan }) {
  return (
    <div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-sm font-medium text-zinc-200">今天休息 —— 肌肉是休息时长的</p>
        <ul className="mt-2 space-y-1 text-xs leading-5 text-zinc-400">
          <li>· 拉伸 10 分钟（胸、髋、肩各 2 个动作）</li>
          <li>· 走路 6000 步，促进血液循环恢复</li>
          <li>· 蛋白吃够，睡够 7.5 小时</li>
        </ul>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {meals.meals.map((m, i) => (
          <MealCard key={i} title={m.name} when="" items={m.items} />
        ))}
      </div>
    </div>
  );
}

export default function PlanView({ plan, onRestart }: { plan: FitnessPlan; onRestart: () => void }) {
  const { overview, macros, meals, warmup, schedule, progression, notes } = plan;
  const [offset, setOffset] = useState(0);
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});

  const viewDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  }, [offset]);

  const dayIndex = (viewDate.getDay() + 6) % 7;
  const dayName = ALL_DAYS[dayIndex];
  const dayPlan = schedule.find((d) => d.day === dayName)!;
  const iso = dateStr(viewDate);
  const isToday = offset === 0;
  const done = doneMap[iso] ?? false;

  // 载入已打卡记录
  useEffect(() => {
    fetch("/api/records")
      .then((r) => r.json())
      .then((rows: { date: string; done: number }[]) => {
        const map: Record<string, boolean> = {};
        for (const r of rows ?? []) map[r.date] = !!r.done;
        setDoneMap(map);
      })
      .catch(() => {});
  }, []);

  const label = isToday
    ? "今天"
    : offset === 1
      ? "明天"
      : offset === -1
        ? "昨天"
        : `${viewDate.getMonth() + 1}/${viewDate.getDate()}`;

  return (
    <div className="mx-auto max-w-lg px-5 pb-16 pt-5">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ←
        </Link>
        <span className="text-xs text-zinc-500">
          {overview.splitName} · {overview.timeline}
        </span>
        <button onClick={onRestart} className="text-xs text-zinc-500 hover:text-zinc-300">
          重新填写
        </button>
      </div>

      {/* 日期导航 */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setOffset(offset - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
        >
          ←
        </button>
        <div className="text-center">
          <p className="text-lg font-bold">
            {dayName} <span className="text-emerald-400">{label}</span>
          </p>
          <p className="text-[11px] text-zinc-500">
            {dayPlan.type === "休息" ? "休息日" : `${dayPlan.type} · ${dayPlan.place}`}
          </p>
        </div>
        <button
          onClick={() => setOffset(offset + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
        >
          →
        </button>
      </div>

      {/* 周条 */}
      <div className="mt-3 flex justify-center gap-2">
        {ALL_DAYS.map((d, i) => {
          const dp = schedule.find((s) => s.day === d)!;
          const active = i === dayIndex;
          return (
            <button
              key={d}
              onClick={() => setOffset(offset + (i - dayIndex))}
              className={`flex h-10 w-10 flex-col items-center justify-center rounded-xl border text-[10px] transition-all ${
                active
                  ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
              }`}
            >
              <span>{d.replace("周", "")}</span>
              <span className={`mt-0.5 h-1 w-1 rounded-full ${dp.type === "休息" ? "bg-zinc-700" : "bg-emerald-500"}`} />
            </button>
          );
        })}
      </div>

      {/* 当日内容 */}
      <div className="mt-5">
        {dayPlan.type === "休息" ? (
          <RestDay meals={meals} />
        ) : (
          <TrainingDay
            day={dayPlan}
            meals={meals}
            dateIso={iso}
            done={done}
            onComplete={() => setDoneMap({ ...doneMap, [iso]: true })}
          />
        )}
      </div>

      {/* 营养数字卡 */}
      <h2 className="mt-10 text-base font-semibold text-zinc-100">🍽️ 每天吃多少</h2>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <StatCard label="基础代谢 BMR" value={macros.bmr} unit="kcal" />
        <StatCard label="每日消耗 TDEE" value={macros.tdee} unit="kcal" />
        <StatCard label={macros.targetLabel} value={macros.targetKcal} unit="kcal" accent />
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2.5">
        <StatCard label="蛋白质" value={macros.protein} unit="g" accent />
        <StatCard label="碳水" value={macros.carb} unit="g" />
        <StatCard label="脂肪" value={macros.fat} unit="g" />
      </div>
      <p className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs leading-5 text-zinc-400">
        {macros.note}
      </p>

      {/* 每日三餐 */}
      <h2 className="mt-8 text-base font-semibold text-zinc-100">🥗 平时三餐怎么吃</h2>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {meals.meals.map((m, i) => (
          <MealCard key={i} title={m.name} when="" items={m.items} />
        ))}
      </div>

      {/* 采购清单 */}
      <h2 className="mt-8 text-base font-semibold text-zinc-100">🛒 每周采购清单</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <tbody>
            {meals.shopping.map((s, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-zinc-950/40" : "bg-zinc-900/30"}>
                <td className="px-3 py-2.5 text-zinc-200">{s.item}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-xs text-emerald-400">{s.amount}</td>
                <td className="px-2 py-2.5 text-[10px] leading-4 text-zinc-500">{s.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 购买渠道 */}
      <h2 className="mt-8 text-base font-semibold text-zinc-100">📍 去哪儿买</h2>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {meals.channels.map((c, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-xs font-medium text-zinc-200">{c.name}</p>
            <p className="mt-1 text-[10px] leading-4 text-zinc-500">{c.why}</p>
          </div>
        ))}
      </div>

      {/* 厨具 */}
      <h2 className="mt-8 text-base font-semibold text-zinc-100">🍳 厨具入门（一套 ≈¥300）</h2>
      <div className="mt-3 space-y-2">
        {meals.gear.map((g, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <span className="flex-1 text-xs font-medium text-zinc-200">{g.item}</span>
            <span className="whitespace-nowrap text-[11px] text-emerald-400">{g.price}</span>
            <span className="w-1/2 text-[10px] leading-4 text-zinc-500">{g.why}</span>
          </div>
        ))}
      </div>

      {/* 热身 */}
      <h2 className="mt-8 text-base font-semibold text-zinc-100">🔥 每次开练前（10 分钟）</h2>
      <div className="mt-3 space-y-2">
        {warmup.map((w, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs leading-5 text-zinc-300">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[9px] text-zinc-400">
              {i + 1}
            </span>
            {w}
          </div>
        ))}
      </div>

      {/* 渐进周期 */}
      <h2 className="mt-8 text-base font-semibold text-zinc-100">📈 4 周怎么加重</h2>
      <div className="mt-3 space-y-2.5">
        {progression.map((p, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-emerald-400">{p.week}</span>
              <span className="text-xs font-medium text-zinc-200">{p.focus}</span>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-zinc-400">{p.how}</p>
          </div>
        ))}
      </div>

      {/* 注意事项 */}
      <h2 className="mt-8 text-base font-semibold text-zinc-100">⚡ 必须知道的事</h2>
      <div className="mt-3 space-y-2.5">
        {notes.map((n, i) => (
          <div
            key={i}
            className={`rounded-xl border p-3.5 text-xs leading-5 ${
              n.startsWith("⚠️")
                ? "border-amber-800/50 bg-amber-950/20 text-amber-200/90"
                : "border-zinc-800 bg-zinc-900/50 text-zinc-300"
            }`}
          >
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}
