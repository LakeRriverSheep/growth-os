"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PART1_FRAME, PART2_FRAME, PART3_STEPS, SPEAKING_PARTS } from "@/lib/ielts";

type Question = {
  id: string;
  part: string;
  question: string;
  status: string;
  created_at: string;
  attempts?: number;
  last_at?: string | null;
};

type Attempt = { id: string; qid: string; text: string; seconds: number; created_at: string };

// 浏览器语音识别（Chrome / Edge / Safari 新版本支持，无需 API key）
type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((e: {
        resultIndex: number;
        results: { length: number; [i: number]: { 0: { transcript: string }; isFinal: boolean } };
      }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function SpeakingPage() {
  const [items, setItems] = useState<Question[]>([]);
  const [part, setPart] = useState<string>("Part 1");
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState<Question | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [cn, setCn] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [srError, setSrError] = useState("");
  const srRef = useRef<SR | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/ielts/speaking");
    setItems(await r.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadAttempts = useCallback(async (qid: string) => {
    const r = await fetch(`/api/ielts/attempts?qid=${encodeURIComponent(qid)}`);
    setAttempts(await r.json());
  }, []);

  function openQuestion(q: Question) {
    setOpen(q);
    setTranscript("");
    setSrError("");
    setCn(localStorage.getItem(`ielts-cn:${q.id}`) ?? "");
    loadAttempts(q.id);
  }

  async function addQuestion() {
    const q = draft.trim();
    if (!q) return;
    const id = newId();
    await fetch("/api/ielts/speaking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, part, question: q, status: "new" }),
    });
    setDraft("");
    load();
  }

  async function setStatus(q: Question, status: string) {
    await fetch("/api/ielts/speaking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: q.id, part: q.part, question: q.question, status }),
    });
    setOpen({ ...q, status });
    load();
  }

  async function removeQuestion(q: Question) {
    await fetch(`/api/ielts/speaking?id=${encodeURIComponent(q.id)}`, { method: "DELETE" });
    setOpen(null);
    load();
  }

  function startRec() {
    setSrError("");
    setTranscript("");
    setSeconds(0);
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;
    if (Ctor) {
      const sr = new Ctor();
      sr.lang = "en-GB";
      sr.continuous = true;
      sr.interimResults = true;
      sr.onresult = (e) => {
        let final = "";
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
        }
        if (final) setTranscript((t) => (t ? `${t} ${final}` : final));
      };
      sr.onerror = (e) => setSrError(`识别不可用（${e.error}），可直接手写文字`);
      sr.onend = () => {};
      srRef.current = sr;
      try {
        sr.start();
      } catch {
        setSrError("识别启动失败，可直接手写文字");
      }
    } else {
      setSrError("当前浏览器不支持语音识别，可直接手写文字");
    }
    setRecording(true);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stopRec() {
    if (srRef.current) {
      try {
        srRef.current.stop();
      } catch {}
      srRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }

  async function saveAttempt() {
    if (!open) return;
    const text = transcript.trim();
    if (!text) return;
    await fetch("/api/ielts/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: newId(), qid: open.id, text, seconds }),
    });
    setTranscript("");
    setSeconds(0);
    loadAttempts(open.id);
    load();
  }

  async function removeAttempt(id: string) {
    await fetch(`/api/ielts/attempts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (open) loadAttempts(open.id);
  }

  const review = items.filter((i) => i.status !== "fluent");

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100">
      <header className="flex items-center gap-4 border-b border-zinc-900 px-6 py-4">
        <a href="/goal/english" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← 返回
        </a>
        <h1 className="text-lg font-semibold">口语</h1>
        <a
          href="/goal/english/speaking/skeleton"
          className="ml-auto text-xs text-zinc-500 hover:text-zinc-300"
        >
          Part 3 骨架练习 →
        </a>
      </header>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(300px,420px)_1fr]">
        {/* 题目列表 */}
        <aside>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex gap-2">
              {SPEAKING_PARTS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPart(p)}
                  className={`rounded-lg px-3 py-1 text-xs ${
                    part === p ? "bg-zinc-100 text-zinc-900" : "border border-zinc-800 text-zinc-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addQuestion()}
                placeholder="输入当季口语题"
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              />
              <button
                onClick={addQuestion}
                className="rounded-xl border border-zinc-700 px-4 text-sm hover:border-zinc-500"
              >
                记下
              </button>
            </div>
          </div>

          <p className="mb-2 mt-5 text-[11px] uppercase tracking-wider text-zinc-500">
            题目 {items.length}
          </p>
          <ul className="space-y-1.5">
            {items.map((q) => (
              <li key={q.id}>
                <button
                  onClick={() => openQuestion(q)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    open?.id === q.id
                      ? "border-zinc-600 bg-zinc-900"
                      : "border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] leading-6 text-zinc-200">{q.question}</span>
                    <span className="mt-0.5 block text-[11px] text-zinc-500">
                      {q.part} · 作答 {q.attempts ?? 0} 次
                      {q.status === "fluent" ? " · 已流利" : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {review.length > 0 && (
            <>
              <p className="mb-2 mt-5 text-[11px] uppercase tracking-wider text-amber-500/80">
                待复习 {review.length}
              </p>
              <ul className="space-y-1.5">
                {review.slice(0, 8).map((q) => (
                  <li key={`r-${q.id}`}>
                    <button
                      onClick={() => openQuestion(q)}
                      className="w-full rounded-xl border border-dashed border-zinc-800 px-3 py-2 text-left text-[13px] leading-6 text-zinc-400 hover:border-zinc-600"
                    >
                      {q.question}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>

        {/* 题目详情 */}
        <section>
          {!open ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
              左边选一道题，或先记下一道新题。
              <br />
              流程：中文想清楚 → 英文说 + 录音 → 看转写改 → 第二天再答一遍，直到一次说顺。
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <p className="text-[11px] text-zinc-500">{open.part}</p>
                <h2 className="mt-1 text-base font-semibold leading-7">{open.question}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["new", "practicing", "fluent"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(open, s)}
                      className={`rounded-lg px-3 py-1 text-xs ${
                        open.status === s
                          ? "bg-zinc-100 text-zinc-900"
                          : "border border-zinc-800 text-zinc-400"
                      }`}
                    >
                      {s === "new" ? "新题" : s === "practicing" ? "练习中" : "已流利"}
                    </button>
                  ))}
                  <button
                    onClick={() => removeQuestion(open)}
                    className="ml-auto rounded-lg px-3 py-1 text-xs text-zinc-600 hover:text-red-400"
                  >
                    删除题目
                  </button>
                </div>
              </div>

              {/* 套路模板 */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <p className="text-sm font-semibold">
                  {open.part === "Part 1"
                    ? "ARE 法：回应 → 理由 → 例子 → 收束"
                    : open.part === "Part 2"
                      ? "PPF 法：开场 → 过去 → 现在 → 未来+收束"
                      : "7 步骨架：观点 → 举例 → 让步 → 对比 → 展望 → 收束"}
                </p>
                <ol className="mt-3 space-y-1.5">
                  {(open.part === "Part 1"
                    ? PART1_FRAME.map((f) => `${f.step} · ${f.name}：${f.hint}`)
                    : open.part === "Part 2"
                      ? PART2_FRAME.map((f) => `${f.step}：${f.hint}`)
                      : PART3_STEPS.map((s) => `${s.n}. ${s.template}（${s.func}）`)
                  ).map((line, i) => (
                    <li key={i} className="text-[13px] leading-6 text-zinc-400">
                      {line}
                    </li>
                  ))}
                </ol>
              </div>

              {/* 中文思路 */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <p className="text-sm font-semibold">中文：我真正想表达什么</p>
                <textarea
                  value={cn}
                  onChange={(e) => {
                    setCn(e.target.value);
                    localStorage.setItem(`ielts-cn:${open.id}`, e.target.value);
                  }}
                  rows={3}
                  placeholder="先把想说的用中文写清楚，再翻成英文说"
                  className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                />
              </div>

              {/* 录音 */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold">录音作答</p>
                  <span className="text-xs tabular-nums text-zinc-500">
                    {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                    {String(seconds % 60).padStart(2, "0")}
                  </span>
                  {!recording ? (
                    <button
                      onClick={startRec}
                      className="rounded-xl border border-zinc-700 px-4 py-1.5 text-sm hover:border-zinc-500"
                    >
                      ● 开始
                    </button>
                  ) : (
                    <button
                      onClick={stopRec}
                      className="rounded-xl border border-red-800 px-4 py-1.5 text-sm text-red-400"
                    >
                      ■ 停止
                    </button>
                  )}
                  <button
                    onClick={saveAttempt}
                    disabled={!transcript.trim()}
                    className="ml-auto rounded-xl border border-zinc-700 px-4 py-1.5 text-sm disabled:opacity-40"
                  >
                    保存这次作答
                  </button>
                </div>
                {srError && <p className="mt-2 text-[11px] text-amber-400">{srError}</p>}
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={4}
                  placeholder="录音识别出的英文（可直接手改）"
                  className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                />
              </div>

              {/* 历史作答 */}
              <div>
                <p className="mb-2 text-sm font-semibold">历史作答 {attempts.length}</p>
                {attempts.length === 0 ? (
                  <p className="text-xs text-zinc-600">还没录过。第一次先说顺，第二天再来一遍。</p>
                ) : (
                  <ul className="space-y-2">
                    {attempts.map((a, idx) => (
                      <li
                        key={a.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">
                            第 {attempts.length - idx} 次 · {a.created_at} · {a.seconds}s
                          </span>
                          <button
                            onClick={() => removeAttempt(a.id)}
                            className="text-xs text-zinc-600 hover:text-red-400"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-6 text-zinc-300">
                          {a.text}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
