"use client";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/_components/PageHeader";

// 听力 / 阅读 共用：场景列表 → 点进去记生词和句子
type Note = {
  id: string;
  kind: string;
  scene: string;
  type: string;
  text: string;
  note: string;
  created_at: string;
};

export default function SceneNotes({
  kind,
  scenes,
  backHref,
  title,
  hint,
}: {
  kind: "listening" | "reading";
  scenes: readonly string[];
  backHref: string;
  title: string;
  hint: string;
}) {
  const [scene, setScene] = useState<string>(scenes[0]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<"word" | "sentence">("word");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/ielts/notes?kind=${encodeURIComponent(kind)}&scene=${encodeURIComponent(scene)}`,
      );
      setNotes(await r.json());
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [kind, scene]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    const t = text.trim();
    if (!t) return;
    await fetch("/api/ielts/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        kind,
        scene,
        type,
        text: t,
        note: note.trim(),
      }),
    });
    setText("");
    setNote("");
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/ielts/notes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  }

  const words = notes.filter((n) => n.type === "word");
  const sentences = notes.filter((n) => n.type === "sentence");

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100">
      <PageHeader title={title} sub={hint} backHref={backHref} />

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(220px,280px)_1fr]">
        {/* 场景列表 */}
        <aside>
          <p className="mb-2 text-[11px] uppercase tracking-wider text-zinc-500">场景</p>
          <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1.5">
            {scenes.map((s) => (
              <button
                key={s}
                onClick={() => setScene(s)}
                className={`rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  s === scene
                    ? "bg-zinc-100 text-zinc-900"
                    : "border border-zinc-800 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </aside>

        {/* 记录区 */}
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold">{scene}</h2>
            <span className="text-xs text-zinc-500">
              生词 {words.length} · 句子 {sentences.length}
            </span>
          </div>

          {/* 添加 */}
          <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex gap-2">
              {(["word", "sentence"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-lg px-3 py-1 text-xs ${
                    type === t
                      ? "bg-zinc-100 text-zinc-900"
                      : "border border-zinc-800 text-zinc-400"
                  }`}
                >
                  {t === "word" ? "生词" : "句子"}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder={type === "word" ? "单词 / 词组" : "值得一记的句子"}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="意思 / 同义替换（可留空）"
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              />
              <button
                onClick={add}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500"
              >
                记下
              </button>
            </div>
          </div>

          {/* 列表 */}
          {loading ? (
            <div className="mt-4 h-24 animate-pulse rounded-2xl bg-zinc-900/40" />
          ) : notes.length === 0 ? (
            <p className="mt-4 text-xs leading-5 text-zinc-600">
              这个场景还没有记录。精听/精读时听不出、读不懂的，直接记在这里。
            </p>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-wider text-zinc-500">生词</p>
                <ul className="space-y-1.5">
                  {words.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-200">{n.text}</p>
                        {n.note && <p className="text-[11px] text-zinc-500">{n.note}</p>}
                      </div>
                      <button
                        onClick={() => remove(n.id)}
                        className="text-xs text-zinc-600 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-wider text-zinc-500">句子</p>
                <ul className="space-y-1.5">
                  {sentences.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] leading-6 text-zinc-200">{n.text}</p>
                        {n.note && <p className="text-[11px] text-zinc-500">{n.note}</p>}
                      </div>
                      <button
                        onClick={() => remove(n.id)}
                        className="text-xs text-zinc-600 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
