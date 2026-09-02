"use client";

import type { FitnessPlan, DayPlan } from "@/lib/fitness";

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

const PLACE_EMOJI: Record<string, string> = { 健身房: "🏟️", 家里: "🏠", 户外: "🌳" };

function ExerciseTable({ day }: { day: DayPlan }) {
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 text-left text-[11px] text-zinc-500">
            <th className="px-3 py-2 font-normal">动作</th>
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
                <p className="mt-0.5 text-[10px] leading-4 text-emerald-600/90">{ex.load}</p>
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-zinc-300">{ex.setsReps}</td>
              <td className="whitespace-nowrap px-2 py-2.5 text-zinc-500">{ex.rest}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DayCard({ day }: { day: DayPlan }) {
  const isRest = day.type === "休息";
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isRest ? "border-zinc-900 bg-zinc-950/40 opacity-60" : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`text-sm font-bold ${isRest ? "text-zinc-500" : "text-emerald-400"}`}>{day.day}</span>
          <span className="text-sm text-zinc-200">{day.type}</span>
        </div>
        {!isRest && (
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-[11px] text-zinc-300">
              {PLACE_EMOJI[day.place] ?? "📍"} {day.place}
            </span>
            <span className="rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-[11px] text-emerald-400">{day.slot}</span>
          </div>
        )}
      </div>
      {isRest ? (
        <p className="mt-2 text-xs text-zinc-500">休息日 · 拉伸 10 分钟 + 走路 6000 步，吃够蛋白，肌肉是休息时长的</p>
      ) : (
        <>
          <p className="mt-1 text-[11px] text-zinc-500">预计训练时长 ≈ {day.minutes} 分钟（含热身）</p>
          <ExerciseTable day={day} />
        </>
      )}
    </div>
  );
}

export default function PlanView({ plan, onRestart }: { plan: FitnessPlan; onRestart: () => void }) {
  const { overview, macros, warmup, schedule, progression, notes } = plan;
  const trainingDays = schedule.filter((d) => d.type !== "休息");

  return (
    <div className="mx-auto max-w-lg px-5 pb-16 pt-6">
      {/* 头部 */}
      <a href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
        ←
      </a>
      <h1 className="mt-3 text-2xl font-bold">
        你的 <span className="text-emerald-400">{overview.splitName}</span>
      </h1>
      <p className="mt-1 text-xs text-zinc-500">已存入数据库，重新打开不丢 · {overview.timeline}</p>

      {/* 概览卡 */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <StatCard label="分化" value={overview.daysPerWeek} unit="练/周" />
        <StatCard label="去健身房" value={overview.gymDays} unit="天" />
        <StatCard label="在家练" value={overview.homeDays} unit="天" />
      </div>

      {/* 营养数字卡 */}
      <h2 className="mt-8 text-base font-semibold text-zinc-100">🍽️ 每天吃多少</h2>
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

      {/* 热身流程 */}
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

      {/* 一周排期 */}
      <h2 className="mt-8 text-base font-semibold text-zinc-100">📅 一周怎么练</h2>
      <div className="mt-3 space-y-3">
        {schedule.map((d) => (
          <DayCard key={d.day} day={d} />
        ))}
      </div>

      {/* 渐进超负荷周期 */}
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

      {/* 底部操作 */}
      <div className="mt-8 flex gap-3">
        <button
          onClick={onRestart}
          className="flex-1 rounded-full border border-zinc-700 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
        >
          重新填写
        </button>
        <a
          href="/records"
          className="flex-1 rounded-full bg-emerald-600 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          去每日记录打卡 →
        </a>
      </div>
    </div>
  );
}
