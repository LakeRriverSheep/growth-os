"use client";
import { useState } from "react";
import { PART3_STEPS, PART3_TOPICS } from "@/lib/ielts";

// Part 3 同骨架多话题练习：7 步骨架不变，换 8 个话题往里填
// 三种模式：完整显示 / 隐藏模板词（自测框架）/ 隐藏内容词（练习填空）
type Mode = "full" | "hideTemplate" | "hideContent";

const MODES: { key: Mode; label: string; hint: string }[] = [
  { key: "full", label: "完整显示", hint: "朗读 3 遍，感受骨架怎么带着思路走" },
  { key: "hideTemplate", label: "隐藏模板词", hint: "只看话题内容，把蓝色框架补回来" },
  { key: "hideContent", label: "隐藏内容词", hint: "只看框架，自己往里填这个话题的内容" },
];

/** 把第 n 步模板里的 [占位] 按话题 fills 逐个替换，返回分段 */
function segments(template: string, fill: string | undefined) {
  const parts = template.split(/(\[[^\]]+\])/g).filter(Boolean);
  return parts.map((p) =>
    p.startsWith("[") && p.endsWith("]")
      ? { type: "fill" as const, text: fill ?? p }
      : { type: "frame" as const, text: p },
  );
}

export default function SkeletonPage() {
  const [mode, setMode] = useState<Mode>("full");
  const [topicIdx, setTopicIdx] = useState(0);
  const topic = PART3_TOPICS[topicIdx];

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100">
      <header className="flex items-center gap-4 border-b border-zinc-900 px-6 py-4">
        <a href="/goal/english/speaking" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← 返回口语
        </a>
        <h1 className="text-lg font-semibold">Part 3 · 同骨架套话题</h1>
        <span className="text-xs text-zinc-500">7 步框架不变，换话题往里填</span>
      </header>

      <main className="px-6 py-6">
        {/* 模式切换 */}
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`rounded-xl px-3 py-1.5 text-xs ${
                mode === m.key ? "bg-zinc-100 text-zinc-900" : "border border-zinc-800 text-zinc-400"
              }`}
            >
              {m.label}
            </button>
          ))}
          <span className="ml-2 self-center text-[11px] text-zinc-500">
            {MODES.find((m) => m.key === mode)?.hint}
          </span>
        </div>

        <p className="mt-3 text-[11px] text-zinc-500">
          <span className="text-sky-400">蓝色</span> = 模板框架词（永远不变）·
          <span className="ml-1 text-amber-400">橙色</span> = 话题内容词（你来填）
        </p>

        {/* 话题切换 */}
        <div className="mt-5 flex flex-wrap gap-2">
          {PART3_TOPICS.map((t, i) => (
            <button
              key={t.title}
              onClick={() => setTopicIdx(i)}
              className={`rounded-xl px-3 py-1.5 text-xs ${
                i === topicIdx
                  ? "bg-zinc-100 text-zinc-900"
                  : "border border-zinc-800 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              {i + 1}. {t.title}
            </button>
          ))}
        </div>

        {/* 7 步 */}
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {PART3_STEPS.map((s) => {
            const segs = segments(s.template, topic.fills[s.n - 1]);
            return (
              <div key={s.n} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-baseline gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs">
                    {s.n}
                  </span>
                  <span className="text-[11px] text-zinc-500">{s.func}</span>
                </div>
                <p className="mt-2 text-[13px] leading-7">
                  {segs.map((sg, i) =>
                    sg.type === "frame" ? (
                      <span
                        key={i}
                        className={
                          mode === "hideTemplate"
                            ? "rounded bg-zinc-800 text-zinc-800"
                            : "text-sky-300"
                        }
                      >
                        {sg.text}
                      </span>
                    ) : (
                      <span
                        key={i}
                        className={
                          mode === "hideContent"
                            ? "rounded bg-zinc-800 text-zinc-800"
                            : "text-amber-300"
                        }
                      >
                        {sg.text}
                      </span>
                    ),
                  )}
                </p>
              </div>
            );
          })}
        </div>

        {/* 练法 */}
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-sm font-semibold">练法</p>
          <ol className="mt-2 space-y-1.5 text-[13px] leading-6 text-zinc-400">
            <li>1. 完整显示朗读 3 遍，体会骨架如何引导思路</li>
            <li>2. 隐藏模板词，只看橙色内容，把蓝色框架补回来</li>
            <li>3. 隐藏内容词，只看蓝色框架，自己填这个话题的内容</li>
            <li>4. 不看提示，换新话题，90 秒内用全 7 步说完并录音回听</li>
          </ol>
          <p className="mt-3 text-xs text-zinc-500">
            通关标准：连续 5 个不同话题，90 秒内 7 步全用上，不卡顿。
          </p>
        </div>
      </main>
    </div>
  );
}
