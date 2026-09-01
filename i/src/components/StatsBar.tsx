"use client";

import { useEffect, useState } from "react";

type Row = { date: string; done: number };

export default function StatsBar() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/records")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setRows(data))
      .catch(() => {});
  }, []);

  const total = rows.length;
  const done = rows.filter((r) => r.done === 1).length;

  if (total === 0) return null;

  return (
    <div className="mb-8 flex gap-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4">
      <div>
        <p className="text-2xl font-bold text-emerald-400">{done}</p>
        <p className="text-xs text-zinc-500">完成天数</p>
      </div>
      <div>
        <p className="text-2xl font-bold">{total}</p>
        <p className="text-xs text-zinc-500">累计记录</p>
      </div>
      <div className="ml-auto self-center">
        <a href="/records" className="text-xs text-zinc-500 hover:text-zinc-300">
          今天记一笔 →
        </a>
      </div>
    </div>
  );
}
