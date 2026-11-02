"use client";

import { useMemo, useRef, useState } from "react";
import PageHeader from "@/app/_components/PageHeader";
import type { RefineGroup, RefineResult } from "@/lib/refine";

// 每类一个颜色：文字色 + 高亮背景 + 色条。深色主题下的柔和色。
const COLORS = [
  { fg: "#c4b5fd", bg: "rgba(139,124,246,0.18)", border: "#7c6fd0" },
  { fg: "#6ee7b7", bg: "rgba(52,211,153,0.16)", border: "#1d9e75" },
  { fg: "#fca5a5", bg: "rgba(248,113,113,0.16)", border: "#d05a5a" },
  { fg: "#fcd34d", bg: "rgba(251,191,36,0.15)", border: "#b88a1d" },
  { fg: "#93c5fd", bg: "rgba(96,165,250,0.16)", border: "#2f6fc0" },
  { fg: "#f9a8d4", bg: "rgba(244,114,182,0.15)", border: "#c04d86" },
];

type Seg = { text: string; gi: number | null };

/** 把原文按 AI 返回的摘录切成「普通 / 高亮」片段，用于原文圈选 */
function buildSegments(text: string, groups: RefineGroup[]): Seg[] {
  type Mark = { start: number; end: number; gi: number };
  const marks: Mark[] = [];

  groups.forEach((g, gi) => {
    g.excerpts.forEach((ex) => {
      const e = (ex || "").trim();
      if (!e) return;
      let idx = text.indexOf(e);
      let len = e.length;
      if (idx < 0) {
        const anchor = e.slice(0, 12);
        idx = text.indexOf(anchor);
        len = anchor.length;
      }
      if (idx >= 0 && len > 0) marks.push({ start: idx, end: idx + len, gi });
    });
  });

  if (marks.length === 0) return [{ text, gi: null }];
  marks.sort((a, b) => a.start - b.start || b.end - a.end);

  // 去重叠：保留先出现、更长的
  const kept: Mark[] = [];
  for (const m of marks) {
    const last = kept[kept.length - 1];
    if (last && m.start < last.end) continue;
    kept.push(m);
  }

  const segs: Seg[] = [];
  let pos = 0;
  for (const m of kept) {
    if (m.start > pos) segs.push({ text: text.slice(pos, m.start), gi: null });
    segs.push({ text: text.slice(m.start, m.end), gi: m.gi });
    pos = m.end;
  }
  if (pos < text.length) segs.push({ text: text.slice(pos), gi: null });
  return segs;
}

export default function Writer() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<RefineResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [mobileView, setMobileView] = useState<"write" | "refine">("write");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const segments = useMemo(
    () => (result ? buildSegments(text, result.groups) : []),
    [text, result],
  );

  async function refine() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/thoughts/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = (await res.json()) as RefineResult & { note?: string };
      setResult(json);
      if (json.note) setNote(json.note);
      setMobileView("refine");
    } catch {
      setNote("精炼失败，稍后再试");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResult(null);
    setNote("");
    setMobileView("write");
  }

  const hasResult = !!result;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <PageHeader
        title="自由写"
        sub={hasResult ? result?.title || "已精炼" : "写下想法，让 AI 帮你归类"}
        backHref="/"
        right={
          hasResult ? (
            <button
              onClick={reset}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500"
            >
              继续编辑
            </button>
          ) : (
            <button
              onClick={() => void refine()}
              disabled={!text.trim() || busy}
              className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              {busy ? "精炼中…" : "AI 精炼"}
            </button>
          )
        }
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-16 pt-4 sm:px-6">
        {/* 手机端 tab（<lg） */}
        <div className="mb-3 flex rounded-lg border border-zinc-800 p-1 lg:hidden">
          <TabBtn active={mobileView === "write"} onClick={() => setMobileView("write")}>
            写
          </TabBtn>
          <TabBtn
            active={mobileView === "refine"}
            onClick={() => setMobileView("refine")}
            disabled={!hasResult}
          >
            精炼{hasResult ? `（${result.groups.length}）` : ""}
          </TabBtn>
        </div>

        {/* 桌面两栏 / 手机单栏 */}
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {/* 原文侧 */}
          <div className={mobileView === "write" ? "block" : "hidden lg:block"}>
            {!hasResult ? (
              <Editor text={text} setText={setText} taRef={taRef} />
            ) : (
              <HighlightedText segments={segments} />
            )}
          </div>

          {/* 精炼侧 */}
          <div className={mobileView === "refine" ? "block" : "hidden lg:block"}>
            <RefinePanel result={result} note={note} busy={busy} onRefine={refine} />
          </div>
        </div>
      </main>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-md px-3 py-1.5 text-xs transition-colors ${
        active ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function Editor({
  text,
  setText,
  taRef,
}: {
  text: string;
  setText: (v: string) => void;
  taRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/20">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <span className="text-[11px] text-zinc-600">原文</span>
        <span className="text-[11px] text-zinc-700">{text.length} 字</span>
      </div>
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"在这里随便写，不用管结构。\n\n想到什么写什么，写长一点也没关系。\n写完了点右上角「AI 精炼」。"}
        className="min-h-[60vh] w-full resize-none bg-transparent px-4 py-4 text-[15px] leading-7 text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
      />
    </div>
  );
}

function HighlightedText({ segments }: { segments: Seg[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <span className="text-[11px] text-zinc-600">原文（同色 = 同一类）</span>
        <span className="text-[11px] text-zinc-700">你的原文没动，只做了标记</span>
      </div>
      <div className="whitespace-pre-wrap px-4 py-4 text-[15px] leading-7 text-zinc-200">
        {segments.map((s, i) =>
          s.gi === null ? (
            <span key={i}>{s.text}</span>
          ) : (
            <mark
              key={i}
              style={{
                background: COLORS[s.gi % COLORS.length].bg,
                color: COLORS[s.gi % COLORS.length].fg,
                borderRadius: 3,
                padding: "1px 1px",
              }}
            >
              {s.text}
            </mark>
          ),
        )}
      </div>
    </div>
  );
}

function RefinePanel({
  result,
  note,
  busy,
  onRefine,
}: {
  result: RefineResult | null;
  note: string;
  busy: boolean;
  onRefine: () => void;
}) {
  if (!result) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10 p-8 text-center">
        <p className="text-sm text-zinc-400">精炼结果会出现在这里</p>
        <p className="mt-2 max-w-xs text-[11px] leading-5 text-zinc-600">
          左边写完后点「AI 精炼」，会把你的内容圈起来分类，每类总结到这边——原文不动，两边对照着看。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <span className="text-[11px] text-zinc-600">精炼 · {result.groups.length} 类</span>
        <button
          onClick={onRefine}
          disabled={busy}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 disabled:opacity-40"
        >
          {busy ? "精炼中…" : "重新精炼"}
        </button>
      </div>

      {result.title && (
        <p className="px-4 pt-4 text-base font-semibold leading-6 text-zinc-100">
          {result.title}
        </p>
      )}

      <div className="space-y-3 p-4">
        {result.groups.map((g, gi) => {
          const c = COLORS[gi % COLORS.length];
          return (
            <div
              key={gi}
              className="animate-[fadein_.4s_ease_both] rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
              style={{
                animationDelay: `${gi * 70}ms`,
                borderLeft: `3px solid ${c.border}`,
              }}
            >
              <p className="text-[11px] font-medium" style={{ color: c.fg }}>
                {g.category}
              </p>
              <p className="mt-1 text-xs leading-6 text-zinc-200">{g.summary}</p>
              {g.excerpts.length > 0 && (
                <div className="mt-2 space-y-1">
                  {g.excerpts.map((ex, i) => (
                    <p
                      key={i}
                      className="rounded-md px-2 py-1 text-[11px] leading-5 text-zinc-400"
                      style={{ background: c.bg }}
                    >
                      「{ex}」
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {note && (
        <p className="border-t border-zinc-800 px-4 py-2 text-[11px] text-amber-400/70">
          {note}
        </p>
      )}
    </div>
  );
}
