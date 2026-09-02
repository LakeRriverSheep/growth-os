"use client";
import Link from "next/link";

const categories = [
  {
    id: "fitness",
    emoji: "💪",
    title: "健身",
    desc: "减脂 · 增肌 · 塑形，按你的身体数据定制吃练计划",
    ready: true,
  },
  {
    id: "english",
    emoji: "🗣️",
    title: "英语考试",
    desc: "四六级 · 雅思 · 考研 · 小学到高中，覆盖一辈子",
    ready: true,
  },
  {
    id: "more",
    emoji: "✨",
    title: "更多目标",
    desc: "音乐 · 理财 · 学业 · 事业……",
    ready: false,
  },
];

export default function Home() {
  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* 顶部标识 */}
      <header className="flex items-baseline gap-3 px-6 pt-8">
        <h1 className="text-4xl font-bold tracking-tight">I</h1>
        <p className="text-xs text-zinc-500">上下滑动，选你最想实现的第一个目标</p>
      </header>

      {/* 上下滑动选择区（手机）；桌面端改为紧凑网格 */}
      <main className="flex-1 snap-y snap-mandatory overflow-y-scroll px-6 pb-4 md:snap-none md:overflow-visible md:mx-auto md:grid md:w-full md:max-w-5xl md:grid-cols-3 md:content-center md:gap-5">
        {categories.map((c) => (
          <div key={c.id} className="flex h-[68vh] snap-center items-center py-3 md:h-auto md:snap-align-none md:py-0">
            {c.ready ? (
              <Link
                href={`/goal/${c.id}`}
                className="flex h-full w-full flex-col justify-between rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 transition-colors hover:border-emerald-600 md:h-72 md:p-6"
              >
                <div>
                  <span className="text-6xl md:text-4xl">{c.emoji}</span>
                  <h2 className="mt-6 text-4xl font-bold md:mt-3 md:text-2xl">{c.title}</h2>
                  <p className="mt-3 text-base leading-7 text-zinc-400 md:text-sm md:leading-6">{c.desc}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-500">点我开始 →</span>
                  <span className="text-xs text-zinc-600">已上线</span>
                </div>
              </Link>
            ) : (
              <div className="flex h-full w-full flex-col justify-between rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 p-8 opacity-50 md:h-72 md:p-6">
                <div>
                  <span className="text-6xl md:text-4xl">{c.emoji}</span>
                  <h2 className="mt-6 text-4xl font-bold md:mt-3 md:text-2xl">{c.title}</h2>
                  <p className="mt-3 text-base leading-7 text-zinc-400 md:text-sm md:leading-6">{c.desc}</p>
                </div>
                <p className="text-xs text-zinc-600">即将上线</p>
              </div>
            )}
          </div>
        ))}
      </main>

      {/* 底部导航 */}
      <footer className="flex justify-center gap-8 border-t border-zinc-900 px-6 py-4 text-xs">
        <Link href="/records" className="text-zinc-500 transition-colors hover:text-zinc-300">
          📝 每日记录
        </Link>
      </footer>
    </div>
  );
}
