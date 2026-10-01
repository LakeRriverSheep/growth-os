"use client";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/_components/PageHeader";

// 听力 / 阅读 共用：场景列表 → 点进去记生词和句子
// 生词三个独立字段：text(单词/词组) + meaning(中文意思) + syn(同义替换)
// 句子两个字段：text(句子) + note(备注/要点)
type Note = {
  id: string;
  kind: string;
  scene: string;
  type: string;
  text: string;
  meaning: string;
  syn: string;
  note: string;
  created_at: string;
};

const EMPTY = { text: "", meaning: "", syn: "", note: "" };

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
  const [type, setType] = useState<"word" | "sentence">("word");
  const [form, setForm] = useState({ ...EMPTY });
  // 行内编辑：点已记录的条目可补/改任意字段
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ ...EMPTY });

  const setF = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setE = (k: keyof typeof EMPTY, v: string) => setEdit((f) => ({ ...f, [k]: v }));

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
    const t = form.text.trim();
    if (!t) return;
    await fetch("/api/ielts/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        scene,
        type,
        text: t,
        meaning: form.meaning.trim(),
        syn: form.syn.trim(),
        note: form.note.trim(),
      }),
    });
    setForm({ ...EMPTY });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/ielts/notes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (editingId === id) setEditingId(null);
    load();
  }

  function startEdit(n: Note) {
    setEditingId(n.id);
    setEdit({ text: n.text, meaning: n.meaning, syn: n.syn, note: n.note });
  }

  async function saveEdit() {
    const n = notes.find((x) => x.id === editingId);
    const t = edit.text.trim();
    if (!n || !t) return;
    await fetch("/api/ielts/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: n.id,
        kind: n.kind,
        scene: n.scene,
        type: n.type,
        text: t,
        meaning: edit.meaning.trim(),
        syn: edit.syn.trim(),
        note: edit.note.trim(),
      }),
    });
    setEditingId(null);
    load();
  }

  const words = notes.filter((n) => n.type === "word");
  const sentences = notes.filter((n) => n.type === "sentence");

  // 输入行：生词三栏 / 句子两行，add 与 edit 复用
  function inputRows(
    v: typeof EMPTY,
    set: (k: keyof typeof EMPTY, val: string) => void,
    onSubmit: () => void,
  ) {
    const cls =
      "w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600";
    if (type === "word") {
      return (
        <div className="flex flex-col gap-2">
          <input
            value={v.text}
            onChange={(e) => set("text", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            placeholder="单词 / 词组"
            className={cls}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={v.meaning}
              onChange={(e) => set("meaning", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              placeholder="中文意思"
              className={cls}
            />
            <input
              value={v.syn}
              onChange={(e) => set("syn", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              placeholder="同义替换"
              className={cls}
            />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        <input
          value={v.text}
          onChange={(e) => set("text", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="值得一记的句子"
          className={cls}
        />
        <input
          value={v.note}
          onChange={(e) => set("note", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="备注 / 要点（可留空）"
          className={cls}
        />
      </div>
    );
  }

  // 单条记录：查看态（点 ✎ / ＋补充 进入编辑）与编辑态
  // 注意：用普通函数返回 JSX 而不是内部组件，避免每次输入重挂载输入框打断中文输入法
  function renderNoteItem(n: Note, isWord: boolean) {
    if (editingId === n.id) {
      return (
        <li
          key={n.id}
          className="rounded-xl border border-zinc-600 bg-zinc-900/60 px-3 py-2.5"
        >
          <div className="flex flex-col gap-2">
            {inputRows(edit, setE, saveEdit)}
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="rounded-lg bg-zinc-100 px-3 py-1 text-xs text-zinc-900 hover:bg-zinc-300"
              >
                保存
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:border-zinc-500"
              >
                取消
              </button>
            </div>
          </div>
        </li>
      );
    }
    // 兼容旧数据：生词只有 note（旧版混记意思）时按中文意思展示
    const meaning = isWord ? n.meaning || n.note : n.note;
    const empty = isWord ? !meaning && !n.syn : !n.note;
    return (
      <li
        key={n.id}
        className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2"
      >
        {/* 点文字直接进编辑，不需要额外的编辑按钮 */}
        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => startEdit(n)}
          title="点击编辑"
        >
          <p className={isWord ? "text-sm text-zinc-200" : "text-[13px] leading-6 text-zinc-200"}>
            {n.text}
          </p>
          {isWord ? (
            <>
              {meaning && <p className="mt-0.5 text-xs text-zinc-400">{meaning}</p>}
              {n.syn && <p className="mt-0.5 text-[11px] text-zinc-500">≈ {n.syn}</p>}
            </>
          ) : (
            n.note && <p className="mt-0.5 text-[11px] text-zinc-500">{n.note}</p>
          )}
          {empty && (
            <p className="mt-0.5 text-[11px] text-zinc-600">＋ 补充中文意思</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => remove(n.id)}
            className="text-xs text-zinc-600 hover:text-red-400"
          >
            ✕
          </button>
        </div>
      </li>
    );
  }

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

          {/* 添加：先选类型，每个字段在记下之前就有独立填写位 */}
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
            <div className="mt-3">{inputRows(form, setF, add)}</div>
            <button
              onClick={add}
              className="mt-3 w-full rounded-xl border border-zinc-700 py-2 text-sm text-zinc-200 hover:border-zinc-500 sm:w-auto sm:px-6"
            >
              记下
            </button>
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
                  {words.map((n) => renderNoteItem(n, true))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-wider text-zinc-500">句子</p>
                <ul className="space-y-1.5">
                  {sentences.map((n) => renderNoteItem(n, false))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
