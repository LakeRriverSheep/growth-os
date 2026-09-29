"use client";
import { useEffect, useState } from "react";
import { DAILY_ITEMS } from "@/lib/ielts";

// 今日固定备考清单：勾选状态落库 check_items（item = ielts:<key>），换设备不丢
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function DailyChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [date] = useState(todayIso);

  useEffect(() => {
    fetch(`/api/check-items?date=${date}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { item: string; checked: number }[]) => {
        const map: Record<string, boolean> = {};
        for (const r of rows) map[r.item] = !!r.checked;
        setChecked(map);
      })
      .catch(() => {});
  }, [date]);

  async function toggle(key: string, next: boolean) {
    setChecked((m) => ({ ...m, [`ielts:${key}`]: next }));
    await fetch("/api/check-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, item: `ielts:${key}`, checked: next }),
    });
  }

  const doneCount = DAILY_ITEMS.filter((i) => checked[`ielts:${i.key}`]).length;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">今日固定流程</h2>
        <span className="text-xs text-zinc-500">
          {doneCount} / {DAILY_ITEMS.length}
        </span>
      </div>
      <ul className="mt-3 grid gap-2 lg:grid-cols-2">
        {DAILY_ITEMS.map((it) => {
          const key = `ielts:${it.key}`;
          const on = !!checked[key];
          return (
            <li key={it.key}>
              <button
                onClick={() => toggle(it.key, !on)}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  on
                    ? "border-zinc-700 bg-zinc-900"
                    : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    on ? "border-zinc-100 bg-zinc-100" : "border-zinc-600"
                  }`}
                >
                  {on && <span className="h-2 w-2 rounded-full bg-zinc-900" />}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-sm ${
                      on ? "text-zinc-500 line-through" : "text-zinc-200"
                    }`}
                  >
                    {it.label}
                  </span>
                  <span className="block text-[11px] leading-5 text-zinc-500">{it.desc}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
