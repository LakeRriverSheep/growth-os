"use client";
import { useCallback, useEffect, useState } from "react";
import { TASK1_TYPES, TASK2_TOPICS, TASK2_TYPES } from "@/lib/ielts";

type Piece = {
  id: string;
  task: string;
  topic: string;
  qtype: string;
  title: string;
  content: string;
  created_at: string;
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function WritingPage() {
  const [task, setTask] = useState<"task1" | "task2">("task1");
  const [qtype, setQtype] = useState<string>(TASK1_TYPES[0]);
  const [topic, setTopic] = useState<string>("教育类");
  const [list, setList] = useState<Piece[]>([]);
  const [open, setOpen] = useState<Piece | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/ielts/writing?task=${task}`);
    setList(await r.json());
  }, [task]);

  useEffect(() => {
    load();
    setOpen(null);
  }, [load, task]);

  function newPiece() {
    setOpen(null);
    setTitle("");
    setContent("");
  }

  async function save() {
    if (!title.trim() && !content.trim()) return;
    setSaving(true);
    const id = open?.id ?? newId();
    const payload = {
      id,
      task,
      topic: task === "task2" ? topic : "",
      qtype,
      title: title.trim(),
      content,
    };
    await fetch("/api/ielts/writing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    load();
    setOpen({ ...payload, created_at: "" });
  }

  async function remove(id: string) {
    await fetch(`/api/ielts/writing?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setOpen(null);
    load();
  }

  const types = task === "task1" ? TASK1_TYPES : TASK2_TYPES;

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100">
      <header className="flex items-center gap-4 border-b border-zinc-900 px-6 py-4">
        <a href="/goal/english" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← 返回
        </a>
        <h1 className="text-lg font-semibold">写作</h1>
        <div className="ml-auto flex gap-2">
          {(["task1", "task2"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTask(t)}
              className={`rounded-lg px-3 py-1 text-xs ${
                task === t ? "bg-zinc-100 text-zinc-900" : "border border-zinc-800 text-zinc-400"
              }`}
            >
              {t === "task1" ? "Task 1" : "Task 2"}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(260px,320px)_1fr]">
        {/* 分类筛选 */}
        <aside>
          <p className="mb-2 text-[11px] uppercase tracking-wider text-zinc-500">
            {task === "task1" ? "题型" : "话题"}
          </p>
          <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1.5">
            {task === "task1"
              ? TASK1_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setQtype(t)}
                    className={`rounded-xl px-3 py-2 text-left text-sm ${
                      qtype === t
                        ? "bg-zinc-100 text-zinc-900"
                        : "border border-zinc-800 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    {t}
                  </button>
                ))
              : TASK2_TOPICS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className={`rounded-xl px-3 py-2 text-left text-sm ${
                      topic === t
                        ? "bg-zinc-100 text-zinc-900"
                        : "border border-zinc-800 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    {t}
                  </button>
                ))}
          </div>

          {task === "task2" && (
            <>
              <p className="mb-2 mt-5 text-[11px] uppercase tracking-wider text-zinc-500">题型</p>
              <div className="flex flex-wrap gap-2">
                {types.map((t) => (
                  <button
                    key={t}
                    onClick={() => setQtype(t)}
                    className={`rounded-xl px-3 py-1.5 text-xs ${
                      qtype === t
                        ? "bg-zinc-100 text-zinc-900"
                        : "border border-zinc-800 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}

          <button
            onClick={newPiece}
            className="mt-5 w-full rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:border-zinc-500"
          >
            + 写一篇
          </button>

          <p className="mb-2 mt-5 text-[11px] uppercase tracking-wider text-zinc-500">
            已练 {list.length}
          </p>
          <ul className="space-y-1.5">
            {list.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    setOpen(p);
                    setTitle(p.title);
                    setContent(p.content);
                    if (p.qtype) setQtype(p.qtype);
                    if (p.topic) setTopic(p.topic);
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                    open?.id === p.id
                      ? "border-zinc-600 bg-zinc-900"
                      : "border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <span className="block truncate text-[13px] text-zinc-200">
                    {p.title || "未命名"}
                  </span>
                  <span className="block text-[11px] text-zinc-500">
                    {p.qtype}
                    {p.topic ? ` · ${p.topic}` : ""} · {p.created_at?.slice(0, 10)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* 编辑器 */}
        <section>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {task === "task1" ? `Task 1 · ${qtype}` : `Task 2 · ${topic} · ${qtype}`}
              </p>
              {saving && <span className="text-xs text-zinc-500">保存中…</span>}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={task === "task1" ? "图表题目 / 数据来源" : "作文题目"}
              className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              placeholder="正文（写完自己数数字数，Task2 ≥250 词）"
              className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm leading-7 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={save}
                className="rounded-xl border border-zinc-700 px-4 py-1.5 text-sm hover:border-zinc-500"
              >
                保存
              </button>
              {open && (
                <button
                  onClick={() => remove(open.id)}
                  className="text-xs text-zinc-600 hover:text-red-400"
                >
                  删除这篇
                </button>
              )}
              <span className="ml-auto text-xs tabular-nums text-zinc-500">
                {content.trim() ? content.trim().split(/\s+/).length : 0} words
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
