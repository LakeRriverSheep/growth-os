"use client";

import { useEffect, useState } from "react";
import type { Goal } from "@/lib/goals";

type Answers = Record<string, string>;

export default function Wizard({ goal }: { goal: Goal }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [plan, setPlan] = useState<string[] | null>(null);
  const [source, setSource] = useState<"template" | "ai">("template");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);

  const total = goal.questions.length;

  // 进入卡片时恢复已保存的计划
  useEffect(() => {
    fetch(`/api/plan?goalId=${goal.id}`)
      .then((r) => r.json())
      .then((saved) => {
        if (saved && Array.isArray(saved.plan) && saved.plan.length > 0) {
          setPlan(saved.plan);
          setAnswers(saved.answers ?? {});
          setSource(saved.source === "ai" ? "ai" : "template");
          setStep(total);
        }
      })
      .catch(() => {})
      .finally(() => setRestoring(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal.id]);

  async function generate(finalAnswers: Answers) {
    setLoading(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: goal.id, answers: finalAnswers }),
      });
      const data = await res.json();
      setPlan(data.plan);
      setSource(data.source);
    } catch {
      setPlan(["生成失败，请稍后重试。"]);
      setSource("template");
    } finally {
      setLoading(false);
    }
  }

  function choose(value: string) {
    const q = goal.questions[step];
    const next = { ...answers, [q.key]: value };
    setAnswers(next);
    if (step + 1 < total) {
      setStep(step + 1);
    } else {
      setStep(total);
      generate(next);
    }
  }

  function restart() {
    setStep(0);
    setAnswers({});
    setPlan(null);
  }

  if (restoring) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
        <p className="text-sm text-zinc-500">读取中…</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
        <p className="mt-4 text-sm text-zinc-400">正在生成你的 4 周行动计划…</p>
      </div>
    );
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
          {source === "ai"
            ? "由 AI 根据你的回答个性化生成"
            : "当前为模板生成 · 在 i/.env.local 填入 DEEPSEEK_API_KEY 后即为 AI 生成"}
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
