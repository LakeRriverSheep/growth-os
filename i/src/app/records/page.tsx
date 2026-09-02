"use client";
import Link from "next/link";

import { useEffect, useState } from "react";

type DayRecord = {
  training: string;
  diet: string;
  calories: string;
  done: boolean;
};

type DayPlanLite = {
  day: string;
  type: string;
  place: string;
  slot: string;
  minutes: number;
  exercises: {
    name: string;
    muscle: string;
    startWeight: string;
    setsReps: string;
    rest: string;
    cue: string;
  }[];
};

const ALL_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function dayNameOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return ALL_DAYS[(d.getDay() + 6) % 7];
}

const emptyRecord: DayRecord = {
  training: "",
  diet: "",
  calories: "",
  done: false,
};

export default function RecordsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rec, setRec] = useState<DayRecord>(emptyRecord);
  const [savedMsg, setSavedMsg] = useState("");
  const [history, setHistory] = useState<{ date: string; done: number }[]>([]);
  const [schedule, setSchedule] = useState<DayPlanLite[] | null>(null);

  // 加载已保存的健身计划（用于「今日训练」卡片）
  useEffect(() => {
    fetch("/api/plan?goalId=fitness")
      .then((r) => r.json())
      .then((row) => {
        const sch = row?.plan?.schedule;
        if (Array.isArray(sch)) setSchedule(sch);
      })
      .catch(() => {});
  }, []);

  // 当前选中日期对应的训练日（计划含全部 7 天，休息日为 type=休息）
  const todayPlan = schedule?.find((d) => d.day === dayNameOf(date)) ?? null;
  const isTrainingDay = !!todayPlan && todayPlan.exercises.length > 0;

  function trainingText(): string {
    if (!todayPlan) return "";
    const list = todayPlan.exercises
      .map((e) => `${e.name} ${e.setsReps}@${e.startWeight}`)
      .join("，");
    return `${todayPlan.type}·${todayPlan.place}·${todayPlan.slot}：${list}`;
  }

  // 一键打卡：填入训练内容 + 标记完成 + 直接保存
  async function quickCheckIn() {
    const training = trainingText();
    const body = { date, training, diet: rec.diet, calories: rec.calories, done: true };
    await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setRec({ ...rec, training, done: true });
    setSavedMsg(`✓ 已打卡 ${date}`);
    setTimeout(() => setSavedMsg(""), 2000);
  }

  // 加载当天记录 + 全部历史日期
  useEffect(() => {
    fetch(`/api/records?date=${date}`)
      .then((r) => r.json())
      .then((row) => {
        if (row) {
          setRec({
            training: row.training ?? "",
            diet: row.diet ?? "",
            calories: row.calories ?? "",
            done: row.done === 1,
          });
        } else {
          setRec(emptyRecord);
        }
      });
    fetch("/api/records")
      .then((r) => r.json())
      .then(setHistory);
  }, [date, savedMsg]);

  async function save() {
    await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, ...rec }),
    });
    setSavedMsg(`已保存 ${date}`);
    setTimeout(() => setSavedMsg(""), 2000);
  }

  const inputCls =
    "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none";

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
      <main className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← 返回首页
        </Link>
        <header className="mt-4 mb-8">
          <h1 className="text-2xl font-bold">每日记录</h1>
          <p className="text-sm text-zinc-400">训练 · 饮食 · 完成情况</p>
        </header>

        {/* 今日训练：从健身计划自动带出，不再靠回忆填表 */}
        {schedule === null ? (
          <Link
            href="/goal/fitness"
            className="mb-6 block rounded-2xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400 transition-colors hover:border-emerald-600 hover:text-zinc-200"
          >
            还没有健身计划，先去生成一个 →（生成后这里会自动显示每天该练什么）
          </Link>
        ) : todayPlan && isTrainingDay ? (
          <div className="mb-6 rounded-2xl border border-emerald-900 bg-emerald-950/30 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-emerald-400">
                {todayPlan.day} · {todayPlan.type}
              </span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                {todayPlan.place}
              </span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                {todayPlan.slot}
              </span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                约 {todayPlan.minutes} 分钟
              </span>
            </div>
            <ul className="mt-3 space-y-1 text-xs text-zinc-400">
              {todayPlan.exercises.map((e) => (
                <li key={e.name}>
                  <span className="text-zinc-200">{e.name}</span> {e.setsReps} @
                  {e.startWeight}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={quickCheckIn}
                disabled={rec.done}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-default disabled:bg-zinc-700"
              >
                {rec.done ? "✓ 今日已打卡" : "✓ 练完了，一键打卡"}
              </button>
              <Link
                href="/goal/fitness"
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                查看完整计划（含练前练后餐）→
              </Link>
            </div>
          </div>
        ) : todayPlan ? (
          <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
            {todayPlan.day} · 休息日 —— 拉伸 10 分钟，蛋白质照常吃。
            <Link href="/goal/fitness" className="ml-2 text-xs text-zinc-500 hover:text-zinc-300">
              看完整计划 →
            </Link>
          </div>
        ) : null}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200"
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={rec.done}
                onChange={(e) => setRec({ ...rec, done: e.target.checked })}
                className="h-4 w-4 accent-emerald-500"
              />
              今日完成
            </label>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-zinc-400">
                训练内容（项目 / 组数 / 重量）
              </label>
              <textarea
                rows={3}
                value={rec.training}
                onChange={(e) => setRec({ ...rec, training: e.target.value })}
                placeholder={"例：深蹲 4×8 @60kg，卧推 4×10 @40kg"}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-zinc-400">
                饮食记录
              </label>
              <textarea
                rows={3}
                value={rec.diet}
                onChange={(e) => setRec({ ...rec, diet: e.target.value })}
                placeholder={"例：早：鸡蛋2+牛奶；午：鸡胸肉150g+米饭；晚：牛肉面"}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-zinc-400">
                今日总热量（大卡）
              </label>
              <input
                value={rec.calories}
                onChange={(e) => setRec({ ...rec, calories: e.target.value })}
                placeholder="例：2300"
                className={inputCls}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={save}
              className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              保存
            </button>
            {savedMsg && (
              <span className="text-sm text-emerald-400">{savedMsg}</span>
            )}
          </div>
        </div>

        {history.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-medium text-zinc-400">
              历史记录（{history.length} 天）
            </h2>
            <div className="flex flex-wrap gap-2">
              {history.map((h) => (
                <button
                  key={h.date}
                  onClick={() => setDate(h.date)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    h.date === date
                      ? "border-emerald-500 text-emerald-400"
                      : h.done === 1
                        ? "border-emerald-800 text-emerald-500 hover:border-emerald-600"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {h.done === 1 ? "✓ " : ""}
                  {h.date}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
