"use client";

import type { DietPlan, Food, FoodRole, MealPairing } from "@/lib/diet";
import { foodLibrary } from "@/lib/diet";

// 角色配色：蛋白=翡翠 / 碳水=琥珀 / 脂肪=紫 / 蔬菜=青
const ROLE_STYLE: Record<FoodRole, string> = {
  蛋白: "bg-emerald-950/60 text-emerald-400",
  碳水: "bg-amber-950/60 text-amber-400",
  脂肪: "bg-violet-950/60 text-violet-300",
  蔬菜: "bg-cyan-950/60 text-cyan-300",
};

const MACRO_STYLE = "shrink-0 text-[10px] tabular-nums text-zinc-500";

/** 一行食材：名称 + 份量 + 该项的 P/C/F/热量 */
function FoodRow({ f, dim }: { f: Food; dim?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={`min-w-0 flex-1 text-[11px] leading-5 ${dim ? "text-zinc-400" : "text-zinc-300"}`}>
        {f.name}
        <span className="ml-1 text-[10px] text-zinc-500">{f.portion}</span>
        {f.fresh && (
          <span className="ml-1 rounded-full bg-rose-950/70 px-1 py-px text-[9px] leading-none text-rose-300">新</span>
        )}
      </span>
      <span className={MACRO_STYLE}>
        P{f.p} C{f.c} F{f.f} · {f.kcal}kcal
      </span>
    </div>
  );
}

/**
 * 一餐的食材搭配卡：蛋白质 / 碳水 / 脂肪 / 蔬菜 分组给可选项 + 一个推荐组合。
 * 不再逐条维护「今天吃什么」，按组选就行。
 */
export function MealPairCard({
  meal,
  time,
  doneItem,
  doneChecked,
  onToggleDone,
}: {
  meal: MealPairing;
  /** 时间线节点已显示时间时传空，避免重复 */
  time?: string;
  doneItem?: string;
  doneChecked?: boolean;
  onToggleDone?: () => void;
}) {
  const t = meal.target;
  const c = meal.combo.total;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span className="text-xs font-semibold text-zinc-100">
          {meal.emoji} {meal.title}
        </span>
        <span className="text-[10px] tabular-nums text-zinc-500">
          {time ? `${time} · ` : ""}本餐目标 ≈{t.kcal}kcal
        </span>
      </div>
      <p className="mt-1 text-[10px] tabular-nums text-zinc-500">
        蛋白 {t.p}g · 碳水 {t.c}g · 脂肪 {t.f}g
      </p>

      <div className="mt-2.5 space-y-2.5">
        {meal.groups.map((g) => (
          <div key={g.role}>
            <div className="flex items-baseline gap-1.5">
              <span className={`rounded-full px-1.5 py-px text-[9px] leading-none ${ROLE_STYLE[g.role]}`}>{g.role}</span>
              <span className="text-[10px] text-zinc-500">{g.label}</span>
            </div>
            <div className="mt-1 space-y-0.5 border-l border-zinc-800 pl-2.5">
              {g.options.map((f, i) => (
                <FoodRow key={`${g.role}-${i}`} f={f} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-2.5">
        <p className="text-[10px] font-semibold text-emerald-400">✅ 推荐组合</p>
        <p className="mt-0.5 text-[11px] leading-5 text-zinc-200">{meal.combo.label}</p>
        <p className="mt-0.5 text-[10px] tabular-nums text-emerald-300/90">
          合计 ≈{c.kcal}kcal · 蛋白 {c.p}g / 碳水 {c.c}g / 脂肪 {c.f}g
        </p>
      </div>

      <p className="mt-2 text-[10px] leading-5 text-zinc-500">💡 {meal.tip}</p>

      {doneItem && onToggleDone && (
        <button
          onClick={onToggleDone}
          aria-pressed={!!doneChecked}
          className="mt-2.5 flex w-full items-center gap-2 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-left transition-colors hover:border-zinc-600"
        >
          <span
            aria-hidden
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border text-[9px] leading-none ${
              doneChecked ? "border-emerald-500 bg-emerald-500 text-zinc-950" : "border-zinc-700 text-zinc-500"
            }`}
          >
            {doneChecked ? "✓" : ""}
          </span>
          <span className={`text-[11px] ${doneChecked ? "text-emerald-300 line-through opacity-80" : "text-zinc-400"}`}>
            这一餐按搭配吃完了
          </span>
        </button>
      )}
    </div>
  );
}

/** 一天的搭配汇总：早/中/晚三张卡的目标与推荐组合一行看全 */
export function DietSummaryTable({ plan }: { plan: DietPlan }) {
  const t = plan.comboTotal;
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800">
      <div className="flex items-baseline justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <p className="text-xs font-semibold text-emerald-400">📊 全天搭配合计</p>
        <span className="text-[10px] tabular-nums text-zinc-500">
          目标 {plan.target.kcal}kcal · 蛋白 {plan.target.p}g / 碳水 {plan.target.c}g / 脂肪 {plan.target.f}g
        </span>
      </div>
      {plan.meals.map((m) => (
        <div key={m.key} className="flex items-baseline gap-2 border-b border-zinc-800/60 px-3 py-2 last:border-b-0">
          <span className="w-16 shrink-0 text-[11px] text-zinc-300">
            {m.emoji} {m.title}
          </span>
          <span className="min-w-0 flex-1 truncate text-[10px] text-zinc-500">{m.combo.label}</span>
          <span className={MACRO_STYLE}>{m.combo.total.kcal}kcal</span>
        </div>
      ))}
      <div className="flex items-baseline justify-between bg-emerald-950/20 px-3 py-2">
        <span className="text-[11px] font-semibold text-emerald-400">合计</span>
        <span className="text-[10px] tabular-nums text-emerald-300">
          ≈{t.kcal}kcal · 蛋白 {t.p}g / 碳水 {t.c}g / 脂肪 {t.f}g
        </span>
      </div>
      <ul className="space-y-1 border-t border-zinc-800 px-3 py-2.5">
        {plan.rules.map((x, i) => (
          <li key={i} className="text-[11px] leading-5 text-zinc-400">
            · {x}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 我的食材库：按蛋白 / 碳水 / 脂肪 / 蔬菜分组列全，方便替换与采购 */
export function FoodLibrarySection() {
  const groups = foodLibrary();
  return (
    <div className="space-y-2.5">
      {groups.map((g) => (
        <div key={g.role} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3.5">
          <div className="flex items-baseline gap-1.5">
            <span className={`rounded-full px-1.5 py-px text-[9px] leading-none ${ROLE_STYLE[g.role]}`}>{g.role}</span>
            <span className="text-[10px] text-zinc-500">{g.label}</span>
          </div>
          <div className="mt-1.5 space-y-0.5">
            {g.items.map((f, i) => (
              <FoodRow key={i} f={f} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
