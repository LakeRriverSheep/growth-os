"use client";
import { useMemo } from "react";
import type { FitnessPlan } from "@/lib/fitness";

const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export default function PlanSummary({
  plan,
  updatedAt,
  onViewFull,
  onEdit,
}: {
  plan: FitnessPlan;
  updatedAt?: string;
  onViewFull: () => void;
  onEdit: () => void;
}) {
  const today = useMemo(() => new Date(), []);
  const todayIdx = (today.getDay() + 6) % 7;
  const todayDay = WEEK_DAYS[todayIdx];
  const todayPlan = plan.schedule.find((d) => d.day === todayDay);

  const trainingDays = plan.schedule.filter((d) => d.type !== "休息");
  const restDays = plan.schedule.filter((d) => d.type === "休息");

  // 最近一次更新时间（相对）
  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "刚刚";

  return (
    <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/10 p-4">
      {/* 顶部 meta */}
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-semibold text-emerald-400">📋 我的当前计划</p>
          <p className="mt-1 text-[10px] text-zinc-500">
            {plan.overview.splitName} · {plan.overview.timeline} · 更新于 {updatedLabel}
          </p>
        </div>
        <span className="rounded-full bg-emerald-900/50 px-2 py-0.5 text-[10px] text-emerald-300">
          {trainingDays.length} 练 {restDays.length} 休
        </span>
      </div>

      {/* 营养速览 */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-center">
          <p className="text-[9px] text-zinc-500">目标热量 · {plan.macros.targetLabel.split("（")[0]}</p>
          <p className="text-sm font-bold text-emerald-400 tabular-nums">{plan.macros.targetKcal}<span className="ml-0.5 text-[9px] font-normal text-zinc-500">kcal</span></p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-center">
          <p className="text-[9px] text-zinc-500">蛋白质</p>
          <p className="text-sm font-bold text-zinc-100 tabular-nums">{plan.macros.protein}<span className="ml-0.5 text-[9px] font-normal text-zinc-500">g</span></p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-center">
          <p className="text-[9px] text-zinc-500">碳水</p>
          <p className="text-sm font-bold text-zinc-100 tabular-nums">{plan.macros.carb}<span className="ml-0.5 text-[9px] font-normal text-zinc-500">g</span></p>
        </div>
      </div>

      {/* 今天：高亮 */}
      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold text-zinc-200">
            🎯 今天 · {todayDay}
            <span className="ml-2 text-[10px] font-normal text-zinc-500">{todayPlan?.type ?? "休息"}</span>
          </p>
          {todayPlan?.place && todayPlan.place !== "—" && (
            <span className="text-[10px] text-zinc-500">
              {todayPlan.place} · {todayPlan.slot} · ≈{todayPlan.minutes}分
            </span>
          )}
        </div>
        {todayPlan && todayPlan.exercises.length > 0 ? (
          <p className="mt-1.5 text-[11px] leading-5 text-zinc-400">
            {todayPlan.exercises.slice(0, 4).map((e) => e.name).join(" · ")}
            {todayPlan.exercises.length > 4 && ` · 等 ${todayPlan.exercises.length} 个动作`}
          </p>
        ) : (
          <p className="mt-1.5 text-[11px] leading-5 text-zinc-500">休息日 · 拉伸 + 走路 6000 步 + 蛋白质吃够</p>
        )}
      </div>

      {/* 周排期 7 天一行 */}
      <div className="mt-3 grid grid-cols-7 gap-1">
        {plan.schedule.map((d) => {
          const active = d.day === todayDay;
          const isRest = d.type === "休息";
          return (
            <div
              key={d.day}
              className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg border px-1 py-1 ${
                active
                  ? "border-emerald-500 bg-emerald-950/60"
                  : isRest
                    ? "border-zinc-800/50 bg-zinc-900/30"
                    : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              <span className={`text-[9px] ${active ? "text-emerald-300" : "text-zinc-500"}`}>{d.day.replace("周", "")}</span>
              <span className={`mt-0.5 text-[10px] font-medium ${active ? "text-emerald-300" : isRest ? "text-zinc-600" : "text-zinc-300"}`}>
                {isRest ? "休" : d.type.split("（")[0].slice(0, 2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onViewFull}
          className="flex-1 rounded-full bg-emerald-600 py-2.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
        >
          📖 查看完整计划
        </button>
        <button
          onClick={onEdit}
          className="flex-1 rounded-full border border-zinc-700 bg-zinc-900/60 py-2.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500"
        >
          ✏️ 调整 / 重新制定
        </button>
      </div>
    </div>
  );
}
