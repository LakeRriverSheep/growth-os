"use client";

import { useState } from "react";
import type { Goal } from "@/lib/goals";

type Answers = Record<string, string>;

// 模板版计划生成（TODO: 接入 AI API 后替换为真实生成）
function generatePlan(goal: Goal, answers: Answers): string[] {
  const a = Object.values(answers).join(" · ");

  const common = [
    `基于你的选择：${a}`,
    "本周期为 4 周，每周复盘一次，按完成情况调整强度。",
  ];

  const byGoal: Record<string, string[]> = {
    fitness: [
      "训练：以复合动作为主（深蹲/卧推/划船/推举），每次 4 个动作 × 4 组，8-12 次/组，渐进超负荷。",
      "饮食：每公斤体重 1.6g 蛋白质，热量盈余 200-300 大卡，训练日碳水后置。",
      "记录：每次训练把重量和组数记进「每日记录」，连续 2 周没进步就换动作。",
    ],
    ielts: [
      "每天开口练：用 7 步骨架模板练 1 道 Part 3，录音回听 1 遍。",
      "输入：每天 1 集《纸牌屋》片段，摘 3 个地道表达并造句。",
      "每周日：模拟 1 套口语题，记录卡壳点，下周针对性补。",
    ],
    music: [
      "前 2 周：每天固定时间练（绑定习惯，如晚饭后 30 分钟），只练左右手分手。",
      "后 2 周：合手练 1 首简单曲子，每天只推进 4-8 小节，不求快。",
      "验收：月底弹完整曲子一遍，录视频存档对比。",
    ],
    software: [
      "每天至少 1 个最小提交（改一行代码也算），保持手感不断档。",
      "按产品路线推进：当前优先完成 F2 问答流程 → F3 每日记录 → 数据库。",
      "每学一个概念立刻用在「I」上，不做与产品无关的练习题。",
    ],
    money: [
      "先把「I」自用跑通（10 月 1 日验收），功能不用多，要能用。",
      "同步记录自媒体数据（播放/涨粉），找到能变现的内容方向。",
      "设置一个「第一笔收入」触发器：任何渠道进账 1 元，即达成里程碑。",
    ],
  };

  return [...common, ...(byGoal[goal.id] ?? [])];
}

export default function Wizard({ goal }: { goal: Goal }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [plan, setPlan] = useState<string[] | null>(null);

  const total = goal.questions.length;
  const done = step >= total;

  function choose(value: string) {
    const q = goal.questions[step];
    const next = { ...answers, [q.key]: value };
    setAnswers(next);
    if (step + 1 < total) {
      setStep(step + 1);
    } else {
      setStep(total);
      setPlan(generatePlan(goal, next));
      localStorage.setItem(`plan-${goal.id}`, JSON.stringify(next));
    }
  }

  function restart() {
    setStep(0);
    setAnswers({});
    setPlan(null);
  }

  if (plan) {
    return (
      <div>
        <div className="rounded-2xl border border-emerald-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-emerald-400">
            ✅ {goal.title} · 4 周行动计划（已生成）
          </h2>
          <ul className="mt-4 space-y-3">
            {plan.map((p, i) => (
              <li key={i} className="flex gap-3 text-sm leading-6 text-zinc-200">
                <span className="text-emerald-500">{i + 1}.</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={restart}
          className="mt-4 rounded-full border border-zinc-700 px-5 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
        >
          重新生成
        </button>
        <p className="mt-3 text-xs text-zinc-600">
          当前为模板生成 · 接入 AI API 后将根据你的回答个性化生成
        </p>
      </div>
    );
  }

  const q = goal.questions[step];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <p className="text-xs text-zinc-500">
        第 {step + 1} / {total} 步
      </p>
      <h2 className="mt-2 text-lg font-semibold">{q.question}</h2>
      <div className="mt-4 flex flex-col gap-3">
        {q.options.map((opt) => (
          <button
            key={opt}
            onClick={() => choose(opt)}
            className="rounded-xl border border-zinc-700 px-4 py-3 text-left text-sm transition-colors hover:border-emerald-500 hover:bg-zinc-800"
          >
            {opt}
          </button>
        ))}
      </div>
      {step > 0 && (
        <button
          onClick={() => setStep(step - 1)}
          className="mt-4 text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← 上一步
        </button>
      )}
    </div>
  );
}
