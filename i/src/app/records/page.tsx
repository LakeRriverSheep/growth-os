"use client";

import { useEffect, useState } from "react";

type DayRecord = {
  training: string;
  diet: string;
  calories: string;
  done: boolean;
};

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
  const [history, setHistory] = useState<string[]>([]);

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
        <a href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← 返回首页
        </a>
        <header className="mt-4 mb-8">
          <h1 className="text-2xl font-bold">每日记录</h1>
          <p className="text-sm text-zinc-400">训练 · 饮食 · 完成情况</p>
        </header>

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
              {history.map((d) => (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    d === date
                      ? "border-emerald-500 text-emerald-400"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
