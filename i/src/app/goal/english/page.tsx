"use client";
import { useEffect, useState } from "react";
import {
  DAILY_ITEMS,
  IELTS_BOOKING_HINT,
  IELTS_DAILY_HOURS,
  IELTS_DEADLINE,
  IELTS_TARGET,
  daysLeft,
} from "@/lib/ielts";
import DailyChecklist from "./_components/DailyChecklist";
import PageHeader from "@/app/_components/PageHeader";

const blocks = [
  {
    href: "/goal/english/listening",
    emoji: "🎧",
    title: "听力",
    desc: "16 个场景 · 精听记生词和句子",
  },
  {
    href: "/goal/english/reading",
    emoji: "📄",
    title: "阅读",
    desc: "8 个场景 · 记同义替换和句子",
  },
  {
    href: "/goal/english/speaking",
    emoji: "🎤",
    title: "口语",
    desc: "题目 · 录音 · 转写 · 复习",
  },
  {
    href: "/goal/english/writing",
    emoji: "✍️",
    title: "写作",
    desc: "Task 1 题型 · Task 2 话题×题型",
  },
  {
    href: "/goal/english/speaking/skeleton",
    emoji: "🦴",
    title: "Part 3 骨架",
    desc: "7 步套路套 8 个话题",
  },
  {
    href: "/ielts-kit.html",
    emoji: "☑️",
    title: "词汇模板勾选",
    desc: "同义替换 · 场景词 · 写作口语模板",
  },
];

export default function EnglishPage() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => setLeft(daysLeft()), []);

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100">
      <PageHeader title="雅思" sub={`目标 ${IELTS_TARGET} · ${IELTS_DEADLINE} 前`} />

      <main className="px-6 py-6">
        {/* 目标概览 */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-zinc-900/40 p-4">
            <p className="text-[11px] text-zinc-500">目标分</p>
            <p className="mt-1 text-2xl font-semibold">{IELTS_TARGET}</p>
          </div>
          <div className="rounded-2xl bg-zinc-900/40 p-4">
            <p className="text-[11px] text-zinc-500">倒计时</p>
            <p className="mt-1 text-2xl font-semibold">
              {left === null ? "—" : left}
              <span className="ml-1 text-xs font-normal text-zinc-500">天</span>
            </p>
          </div>
          <div className="rounded-2xl bg-zinc-900/40 p-4">
            <p className="text-[11px] text-zinc-500">每天投入</p>
            <p className="mt-1 text-2xl font-semibold">
              ≥{IELTS_DAILY_HOURS}
              <span className="ml-1 text-xs font-normal text-zinc-500">小时</span>
            </p>
          </div>
          <div className="rounded-2xl border border-amber-900/50 bg-amber-950/20 p-4">
            <p className="text-[11px] text-amber-500/80">待办提醒</p>
            <p className="mt-1 text-sm leading-6 text-amber-200">{IELTS_BOOKING_HINT}</p>
          </div>
        </div>

        {/* 阶段提示 */}
        <p className="mt-4 text-xs leading-6 text-zinc-500">
          节奏：前 60 天按场景（听力 16 场景 / 阅读 8 场景）练词汇语义场 → 接下来 2 周切题型专项 →
          最后 2 周套题模考。每天 {DAILY_ITEMS.length} 件事，按顺序走完。
        </p>

        {/* 今日清单 */}
        <div className="mt-6">
          <DailyChecklist />
        </div>

        {/* 板块入口：全屏平铺 */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((b) => (
            <a
              key={b.href}
              href={b.href}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-600"
            >
              <span className="text-2xl">{b.emoji}</span>
              <h2 className="mt-2 text-base font-semibold">{b.title}</h2>
              <p className="mt-0.5 text-[11px] leading-5 text-zinc-500">{b.desc}</p>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
