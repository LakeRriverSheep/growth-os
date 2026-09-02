"use client";

import type { EnglishPlan } from "@/lib/english";

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

export default function EnglishPlanView({ plan, onRestart }: { plan: EnglishPlan; onRestart: () => void }) {
  const { overview, daily, milestones, notes } = plan;
  const totalMinutes = daily.reduce((s, t) => s + t.minutes, 0);

  return (
    <div className="mx-auto max-w-lg px-5 pb-16 pt-6">
      <a href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
        ←
      </a>
      <h1 className="mt-3 text-2xl font-bold">
        {overview.exam} · 目标 <span className="text-emerald-400">{overview.target}</span>
      </h1>
      <p className="mt-1 text-xs text-zinc-500">已存入数据库，重新打开不丢</p>

      {/* 概览卡 */}
      <div className="mt-5 grid grid-cols-4 gap-2.5">
        <StatCard label="倒计时" value={overview.daysLeft} unit="天" accent />
        <StatCard label="周期" value={overview.weeks} unit="周" />
        <StatCard label="每天" value={overview.dailyHours} unit="h" />
        <StatCard label="总投入" value={overview.totalHours} unit="h" />
      </div>

      {/* 每日任务 */}
      <h2 className="mt-8 text-base font-semibold text-zinc-100">📋 每天要做什么（共 {Math.floor(totalMinutes / 60)} 小时 {totalMinutes % 60} 分钟）</h2>
      <div className="mt-3 space-y-2.5">
        {daily.map((t, i) => (
          <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-950/60 text-[11px] text-emerald-400">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-zinc-100">{t.name}</span>
              </div>
              <span className="rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-xs tabular-nums text-emerald-400">
                {t.minutes} 分钟
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-400" style={{ paddingLeft: "2.25rem" }}>
              {t.how}
            </p>
          </div>
        ))}
      </div>

      {/* 阶段里程碑 */}
      <h2 className="mt-8 text-base font-semibold text-zinc-100">🗺️ 三个阶段怎么打</h2>
      <div className="mt-3 space-y-0">
        {milestones.map((m, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
              {i < milestones.length - 1 && <span className="w-px flex-1 bg-zinc-800" />}
            </div>
            <div className="pb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-zinc-100">{m.phase}</span>
                <span className="text-[11px] text-emerald-500">{m.range}</span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-zinc-400">{m.goal}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 注意事项 */}
      <h2 className="mt-2 text-base font-semibold text-zinc-100">⚡ 必须知道的事</h2>
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
