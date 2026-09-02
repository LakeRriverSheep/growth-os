"use client";

import { useEffect, useRef, useState } from "react";
import type { EnglishInput, EnglishPlan } from "@/lib/english";
import EnglishPlanView from "./EnglishPlanView";

type Opt = { value: string; label: string; sub?: string; emoji: string };

const EXAMS: Opt[] = [
  { value: "四级", label: "四级", sub: "CET-4", emoji: "📝" },
  { value: "六级", label: "六级", sub: "CET-6", emoji: "📚" },
  { value: "雅思", label: "雅思", sub: "IELTS", emoji: "🌍" },
  { value: "考研英语", label: "考研英语", sub: "英一/英二", emoji: "🎓" },
  { value: "中考英语", label: "中考英语", sub: "升学", emoji: "🏫" },
  { value: "高考英语", label: "高考英语", sub: "升学", emoji: "✏️" },
];

const LEVELS: Opt[] = [
  { value: "基础薄弱", label: "基础薄弱", sub: "考试常在及格线附近", emoji: "🌱" },
  { value: "中等", label: "中等", sub: "飘过及格线", emoji: "🚶" },
  { value: "中上", label: "中上", sub: "有底子想冲高分", emoji: "🚀" },
];

const TARGETS: Record<string, string[]> = {
  四级: ["425（过线）", "500", "550+"],
  六级: ["425（过线）", "500", "550+"],
  雅思: ["6.5", "7.0", "7.5", "8.0+"],
  考研英语: ["60", "70", "80+"],
  中考英语: ["90/120", "105/120", "115+"],
  高考英语: ["110/150", "125/150", "140+"],
};

const HOURS: Opt[] = [
  { value: "1", label: "1 小时", sub: "课业/工作很忙", emoji: "🕐" },
  { value: "1.5", label: "1.5 小时", sub: "挤出固定时间", emoji: "🕑" },
  { value: "2", label: "2 小时", sub: "备考是主线", emoji: "🕒" },
  { value: "3", label: "3 小时+", sub: "全职冲刺", emoji: "🔥" },
];

const WEAK: Opt[] = [
  { value: "词汇", label: "词汇", sub: "单词记不住", emoji: "📖" },
  { value: "听力", label: "听力", sub: "听了像没听", emoji: "🎧" },
  { value: "阅读", label: "阅读", sub: "做题慢错得多", emoji: "📄" },
  { value: "写作", label: "写作", sub: "下不了笔", emoji: "✍️" },
  { value: "口语", label: "口语", sub: "开不了口", emoji: "🗣️" },
  { value: "翻译", label: "翻译", sub: "译不成句", emoji: "🔁" },
];

const STEP_TITLES = ["考什么试？", "现在什么水平？", "目标多少分？", "考试日期？", "每天能学多久？", "哪里最薄弱？"];
const STEP_HINTS = [
  "选你要考的那门",
  "诚实点，计划才不会自欺欺人",
  "够得着的目标才是好目标",
  "倒计时决定整个计划的节奏",
  "按真实可用时间选，别高估自己",
  "可多选 · 薄弱项会拿到最多的时间",
];

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
}

function Card({
  opt,
  selected,
  onClick,
  small,
}: {
  opt: Opt;
  selected: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all active:scale-95 ${
        selected
          ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
          : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600"
      } ${small ? "min-h-[84px]" : "min-h-[110px]"}`}
    >
      <span className={small ? "text-xl" : "text-2xl"}>{opt.emoji}</span>
      <span className="mt-1.5 text-sm font-medium">{opt.label}</span>
      {opt.sub && (
        <span className={`mt-1 text-[11px] ${selected ? "text-emerald-500/80" : "text-zinc-500"}`}>{opt.sub}</span>
      )}
      {selected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] text-zinc-950">
          ✓
        </span>
      )}
    </button>
  );
}

export default function EnglishForm() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<EnglishPlan | null>(null);
  const [restored, setRestored] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<EnglishInput>({
    exam: "雅思",
    level: "中等",
    target: "",
    examDate: defaultDate(),
    hours: "2",
    weak: [],
  });

  useEffect(() => {
    fetch("/api/plan?goalId=english")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.source === "english-calc" && data.plan && !Array.isArray(data.plan)) {
          setPlan(data.plan as EnglishPlan);
        }
      })
      .catch(() => {})
      .finally(() => setRestored(true));
  }, []);

  function toggleWeak(value: string) {
    setForm((f) => ({
      ...f,
      weak: f.weak.includes(value) ? f.weak.filter((v) => v !== value) : [...f.weak, value],
    }));
  }

  function goTo(i: number) {
    const c = containerRef.current;
    if (!c) return;
    setStep(i);
    c.scrollTo({ top: i * c.clientHeight, behavior: "smooth" });
  }

  function onScroll() {
    const c = containerRef.current;
    if (!c) return;
    const i = Math.round(c.scrollTop / c.clientHeight);
    if (i !== step && i >= 0 && i < STEP_TITLES.length) setStep(i);
  }

  const daysLeft = Math.max(
    1,
    Math.ceil((new Date(form.examDate).getTime() - Date.now()) / 86400000),
  );

  function canNext(): boolean {
    switch (step) {
      case 2:
        return form.target !== "";
      case 5:
        return form.weak.length > 0;
      default:
        return true;
    }
  }

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: "english", answers: form }),
      });
      const data = await res.json();
      if (data?.plan) setPlan(data.plan as EnglishPlan);
    } catch {
      alert("生成失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  function next() {
    if (step < STEP_TITLES.length - 1) goTo(step + 1);
    else submit();
  }

  function restart() {
    setPlan(null);
    setStep(0);
    setForm({ exam: "雅思", level: "中等", target: "", examDate: defaultDate(), hours: "2", weak: [] });
    requestAnimationFrame(() => containerRef.current?.scrollTo({ top: 0 }));
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
        <p className="mt-5 text-sm text-zinc-400">正在排你的备考作战表…</p>
      </div>
    );
  }

  if (plan) return <EnglishPlanView plan={plan} onRestart={restart} />;
  if (!restored) return null;

  const targetOptions = TARGETS[form.exam] ?? TARGETS["四级"];

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-lg flex-col">
      {/* 顶部：返回 + 进度 */}
      <div className="flex items-center gap-3 px-5 pt-5">
        <a href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ←
        </a>
        <div className="flex flex-1 gap-1">
          {STEP_TITLES.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-emerald-500" : "bg-zinc-800"}`}
            />
          ))}
        </div>
        <span className="text-xs tabular-nums text-zinc-500">
          {step + 1}/{STEP_TITLES.length}
        </span>
      </div>

      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 snap-y snap-mandatory overflow-y-auto scroll-smooth overscroll-contain"
      >
        {/* 1 考试类型 */}
        <section className="flex min-h-full snap-start snap-always flex-col justify-center px-5 pb-28 pt-8">
          <h1 className="text-2xl font-bold">{STEP_TITLES[0]}</h1>
          <p className="mt-1.5 text-xs text-zinc-500">{STEP_HINTS[0]}</p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {EXAMS.map((o) => (
              <Card key={o.value} opt={o} small selected={form.exam === o.value} onClick={() => setForm({ ...form, exam: o.value, target: "" })} />
            ))}
          </div>
        </section>

        {/* 2 当前水平 */}
        <section className="flex min-h-full snap-start snap-always flex-col justify-center px-5 pb-28 pt-8">
          <h1 className="text-2xl font-bold">{STEP_TITLES[1]}</h1>
          <p className="mt-1.5 text-xs text-zinc-500">{STEP_HINTS[1]}</p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {LEVELS.map((o) => (
              <Card key={o.value} opt={o} small selected={form.level === o.value} onClick={() => setForm({ ...form, level: o.value })} />
            ))}
          </div>
        </section>

        {/* 3 目标分数 */}
        <section className="flex min-h-full snap-start snap-always flex-col justify-center px-5 pb-28 pt-8">
          <h1 className="text-2xl font-bold">{STEP_TITLES[2]}</h1>
          <p className="mt-1.5 text-xs text-zinc-500">
            {STEP_HINTS[2]} · 当前考试：{form.exam}
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {targetOptions.map((t) => (
              <Card
                key={t}
                opt={{ value: t, label: t, emoji: "🎯" }}
                selected={form.target === t}
                onClick={() => setForm({ ...form, target: t })}
              />
            ))}
          </div>
        </section>

        {/* 4 考试日期 */}
        <section className="flex min-h-full snap-start snap-always flex-col justify-center px-5 pb-28 pt-8">
          <h1 className="text-2xl font-bold">{STEP_TITLES[3]}</h1>
          <p className="mt-1.5 text-xs text-zinc-500">{STEP_HINTS[3]}</p>
          <div className="mt-8">
            <input
              type="date"
              value={form.examDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm({ ...form, examDate: e.target.value })}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-5 text-center text-2xl font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none [color-scheme:dark]"
            />
            <div className="mt-4 flex justify-center gap-2">
              {[
                { label: "1 个月后", d: 30 },
                { label: "2 个月", d: 60 },
                { label: "3 个月", d: 90 },
                { label: "半年", d: 180 },
              ].map(({ label, d }) => (
                <button
                  key={d}
                  onClick={() => {
                    const dt = new Date();
                    dt.setDate(dt.getDate() + d);
                    setForm({ ...form, examDate: dt.toISOString().slice(0, 10) });
                  }}
                  className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-5 text-center text-sm text-zinc-400">
              距今 <span className="text-xl font-bold text-emerald-400">{daysLeft}</span> 天 ≈{" "}
              {Math.ceil(daysLeft / 7)} 周
            </p>
          </div>
        </section>

        {/* 5 每天时间 */}
        <section className="flex min-h-full snap-start snap-always flex-col justify-center px-5 pb-28 pt-8">
          <h1 className="text-2xl font-bold">{STEP_TITLES[4]}</h1>
          <p className="mt-1.5 text-xs text-zinc-500">{STEP_HINTS[4]}</p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {HOURS.map((o) => (
              <Card key={o.value} opt={o} selected={form.hours === o.value} onClick={() => setForm({ ...form, hours: o.value })} />
            ))}
          </div>
        </section>

        {/* 6 薄弱项 */}
        <section className="flex min-h-full snap-start snap-always flex-col justify-center px-5 pb-28 pt-8">
          <h1 className="text-2xl font-bold">{STEP_TITLES[5]}</h1>
          <p className="mt-1.5 text-xs text-zinc-500">{STEP_HINTS[5]}</p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {WEAK.map((o) => (
              <Card key={o.value} opt={o} small selected={form.weak.includes(o.value)} onClick={() => toggleWeak(o.value)} />
            ))}
          </div>
        </section>
      </div>

      {/* 底部操作栏 */}
      <div className="absolute inset-x-0 bottom-0 border-t border-zinc-800/60 bg-zinc-950/85 px-5 pb-6 pt-3 backdrop-blur">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => goTo(step - 1)} className="rounded-full px-4 py-2.5 text-sm text-zinc-500 hover:text-zinc-300">
              上一步
            </button>
          )}
          <button
            onClick={next}
            disabled={!canNext()}
            className="flex-1 rounded-full bg-emerald-600 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {step === STEP_TITLES.length - 1 ? "🎯 生成备考作战表" : "下一步"}
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-zinc-600">上下滑动也可切换步骤</p>
      </div>
    </div>
  );
}
