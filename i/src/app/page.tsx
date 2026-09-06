"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import PlanView from "./goal/fitness/PlanView";
import type { FitnessPlan } from "@/lib/fitness";

const categories = [
  {
    id: "more",
    emoji: "✨",
    title: "更多目标",
    desc: "音乐 · 理财 · 学业 · 事业……",
    ready: false,
  },
];

export default function Home() {
  const [plan, setPlan] = useState<FitnessPlan | null>(null);
  const [restored, setRestored] = useState(false);

  // 进入首页时尝试拉取已保存的健身计划
  useEffect(() => {
    fetch("/api/plan?goalId=fitness")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || data.source !== "fitness-calc" || !data.plan || Array.isArray(data.plan)) return;
        setPlan(data.plan as FitnessPlan);
      })
      .catch(() => {})
      .finally(() => setRestored(true));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* 顶部标识 */}
      <header className="flex items-baseline gap-3 px-6 pt-6 pb-1">
        <h1 className="text-3xl font-bold tracking-tight">I</h1>
        <p className="text-xs text-zinc-500">电子版的自己</p>
      </header>

      {/* 主区 */}
      <main className="flex-1 px-5 pb-6 pt-3">
        {!restored ? (
          <div className="h-40 animate-pulse rounded-2xl bg-zinc-900/40" />
        ) : plan ? (
          // 已生成计划 → 直接渲染完整 PlanView（嵌入式：不显示返回按钮/营养卡）
          <PlanView plan={plan} showHeader={false} showMacros={false} />
        ) : (
          // 无计划 → 引导卡
          <Link
            href="/goal/fitness"
            className="block rounded-2xl border border-amber-800/40 bg-amber-950/15 p-6 transition-colors hover:border-amber-600"
          >
            <p className="text-2xl font-semibold text-amber-300">💪 你还没有健身计划</p>
            <p className="mt-3 text-sm leading-6 text-amber-200/80">
              点这里花 1 分钟生成你的第一份吃练计划——
              <br />
              按你的身体数据定制，5 练 2 休。
            </p>
            <p className="mt-4 text-sm text-amber-400">立即开始 →</p>
          </Link>
        )}

        {/* 其他目标入口（折叠） */}
        <section className="mt-8">
          <h2 className="px-1 text-xs font-semibold text-zinc-500">更多目标</h2>
          <div className="mt-2 space-y-2.5">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-4 opacity-50"
              >
                <span className="text-3xl">{c.emoji}</span>
                <div className="flex-1">
                  <h2 className="text-base font-semibold">{c.title}</h2>
                  <p className="mt-0.5 text-[11px] leading-5 text-zinc-500">{c.desc}</p>
                </div>
                <span className="text-xs text-zinc-600">即将上线</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
