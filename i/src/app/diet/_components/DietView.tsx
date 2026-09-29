"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buildDietPlan, type DietPlan, type DietMacros } from "@/lib/diet";
import {
  DietSummaryTable,
  FoodLibrarySection,
} from "../../goal/fitness/_components/MealPairCard";

// 饮食页主体：服务端已把计划算好传进来（首屏直接出内容，不再等 fetch）
export default function DietView({
  initial,
}: {
  initial: { macros: DietMacros | null; dietPlan: DietPlan | null };
}) {
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(initial.dietPlan);
  const [macros, setMacros] = useState<DietMacros | null>(initial.macros);
  const [loaded, setLoaded] = useState(!!initial.dietPlan);

  // 服务端没拿到（例如首次访问无计划）时，兜底再拉一次
  useEffect(() => {
    if (initial.dietPlan) return;
    fetch("/api/plan?goalId=fitness")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const plan = data?.plan;
        if (!plan || Array.isArray(plan) || !plan.macros) return;
        const m = plan.macros as DietMacros;
        const safeMacros = { ...m, carbRest: m.carbRest ?? Math.round(m.carb * 0.75) };
        setMacros(safeMacros);
        setDietPlan((plan.diet as DietPlan) ?? buildDietPlan(safeMacros));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [initial.dietPlan]);

  return (
    <main className="w-full px-6 pb-16 pt-6">
      {!loaded ? (
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-zinc-900/40" />
      ) : !dietPlan || !macros ? (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-800 p-6">
          <p className="text-sm leading-6 text-zinc-400">
            还没有生成健身计划，饮食搭配跟着计划一起出。
          </p>
          <Link href="/goal/fitness" className="mt-3 inline-block text-sm text-amber-400">
            去生成吃练计划 →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 目标量 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-zinc-900/40 p-4">
              <p className="text-[11px] text-zinc-500">目标热量</p>
              <p className="mt-1 text-base font-semibold">{macros.targetKcal} kcal</p>
            </div>
            <div className="rounded-2xl bg-zinc-900/40 p-4">
              <p className="text-[11px] text-zinc-500">蛋白质</p>
              <p className="mt-1 text-base font-semibold">{macros.protein} g</p>
            </div>
            <div className="rounded-2xl bg-zinc-900/40 p-4">
              <p className="text-[11px] text-zinc-500">碳水</p>
              <p className="mt-1 text-base font-semibold">{macros.carb} g</p>
            </div>
            <div className="rounded-2xl bg-zinc-900/40 p-4">
              <p className="text-[11px] text-zinc-500">脂肪</p>
              <p className="mt-1 text-base font-semibold">{macros.fat} g</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <DietSummaryTable plan={dietPlan} />
            </div>
            <section>
              <h2 className="mb-3 text-sm font-semibold text-zinc-200">我的食材库</h2>
              <FoodLibrarySection />
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
