"use client";
import { useEffect, useState } from "react";

// 顶部待办收集区：随手记下所有要做的事，拖到下方周计划里排进时间
// 数据复用 inbox 表（/api/inbox）
export type InboxItem = { id: number; text: string; checked: boolean };

export default function InboxBar() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/inbox");
      if (r.ok) setItems(await r.json());
    } catch {}
  }

  useEffect(() => {
    let alive = true;
    fetch("/api/inbox")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setItems(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function add() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", text }),
    });
    load();
  }

  async function toggle(it: InboxItem) {
    await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id: it.id, checked: !it.checked }),
    });
    load();
  }

  async function remove(id: number) {
    await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    load();
  }

  const active = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  return (
    <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center gap-2 px-3 py-2 md:px-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
        >
          <span className="text-sm leading-none">☰</span>
          <span>待办</span>
          {active.length > 0 && (
            <span className="rounded-full bg-emerald-500/15 px-1.5 text-[10px] font-semibold tabular-nums text-emerald-400">
              {active.length}
            </span>
          )}
        </button>

        {/* 未完成待办横向滚动条（拖拽源） */}
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            {active.length === 0 && !open && (
              <span className="text-[11px] text-zinc-600">把要做的事丢进来，再拖进下面的日程</span>
            )}
            {active.map((it) => (
              <button
                key={it.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", it.text);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => toggle(it)}
                title="点击完成 · 拖到下面排时间"
                className="group flex shrink-0 cursor-grab items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-xs text-zinc-200 transition-colors hover:border-zinc-500 active:cursor-grabbing"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500 group-hover:bg-emerald-400" />
                <span className="max-w-[180px] truncate">{it.text}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={add}
          disabled={!draft.trim()}
          className="shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-950 transition-opacity hover:opacity-90 disabled:opacity-30"
        >
          +
        </button>
      </div>

      {/* 展开：输入框 + 已完成列表 */}
      {open && (
        <div className="border-t border-zinc-800/60 px-3 pb-2 md:px-4">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="记一件事…（回车添加）"
            className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
          />
          {done.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {done.map((it) => (
                <span
                  key={it.id}
                  className="flex items-center gap-1.5 rounded-full border border-zinc-800 px-2.5 py-0.5 text-[11px] text-zinc-500 line-through"
                >
                  {it.text}
                  <button
                    onClick={() => remove(it.id)}
                    className="text-zinc-600 hover:text-zinc-300"
                    aria-label="删除"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
