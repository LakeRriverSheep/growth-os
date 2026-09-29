import Link from "next/link";

// 首页 = I 的入口：大板块导航。日常高频视图在 /planner（周计划）。
const sections = [
  {
    href: "/goal/fitness",
    emoji: "💪",
    title: "健身",
    desc: "吃练计划 · 打卡",
  },
  {
    href: "/goal/english",
    emoji: "📖",
    title: "雅思",
    desc: "备考计划",
  },
  {
    href: "/diet",
    emoji: "🍚",
    title: "饮食",
    desc: "全天搭配 · 食材库",
  },
  {
    href: "/cards.html",
    emoji: "🃏",
    title: "思想卡片",
    desc: "反思 · 浓缩 · 内化",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* 顶部标识 */}
      <header className="flex items-baseline gap-3 px-6 pt-6 pb-1">
        <h1 className="text-3xl font-bold tracking-tight">I</h1>
        <p className="text-xs text-zinc-500">电子版的自己</p>
      </header>

      <main className="flex-1 px-5 pb-10 pt-4">
        {/* 周计划（每日高频入口） */}
        <Link
          href="/planner"
          className="block rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-600"
        >
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">🗓 今日 · 周计划</p>
            <span className="text-xs text-zinc-500">课表 · 日程 →</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            一周全见，点空格排日程。
          </p>
        </Link>

        {/* 大板块网格 */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sections.map((s) => (
            <Link
              key={s.title}
              href={s.href}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-600"
            >
              <span className="text-2xl">{s.emoji}</span>
              <h2 className="mt-2 text-base font-semibold">{s.title}</h2>
              <p className="mt-0.5 text-[11px] leading-5 text-zinc-500">{s.desc}</p>
            </Link>
          ))}

          {/* 我：占满一行，内含三个子入口 */}
          <Link
            href="/me"
            className="col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-600 sm:col-span-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl">🧭</span>
                <h2 className="mt-2 text-base font-semibold">我</h2>
              </div>
              <span className="text-xs text-zinc-500">身份层 →</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["我想成为的人", "我应该做的", "我不应该做的"].map((t) => (
                <span
                  key={t}
                  className="rounded-lg border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400"
                >
                  {t}
                </span>
              ))}
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
