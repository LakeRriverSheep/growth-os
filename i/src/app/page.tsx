const goals = [
  {
    emoji: "💪",
    title: "健身",
    desc: "练出薄肌（提升骨骼肌，当前 23.9kg）",
    deadline: "长期",
    progress: 0,
  },
  {
    emoji: "🗣️",
    title: "雅思",
    desc: "口语 8.0",
    deadline: "2027",
    progress: 0,
  },
  {
    emoji: "🎹",
    title: "音乐",
    desc: "电子琴入门（后续加吉他）",
    deadline: "长期",
    progress: 0,
  },
  {
    emoji: "⌨️",
    title: "软件",
    desc: "精通软件工程，做出这个产品本身",
    deadline: "长期",
    progress: 1,
  },
  {
    emoji: "💰",
    title: "赚钱",
    desc: "独立产品产生第一笔收入",
    deadline: "待定",
    progress: 0,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
      <main className="mx-auto max-w-4xl">
        <header className="mb-10 flex items-baseline gap-4">
          <h1 className="text-6xl font-bold tracking-tight">I</h1>
          <p className="text-zinc-400">电子版的自己 · 2026.09.01 启动</p>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {goals.map((g) => (
            <button
              key={g.title}
              className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left transition-colors hover:border-zinc-500"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{g.emoji}</span>
                <span className="text-xs text-zinc-500">{g.deadline}</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold">{g.title}</h2>
              <p className="mt-1 text-sm text-zinc-400">{g.desc}</p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${g.progress}%` }}
                />
              </div>
              <p className="mt-1.5 text-right text-xs text-zinc-500">
                {g.progress}%
              </p>
            </button>
          ))}
        </section>

        <footer className="mt-10 text-center text-xs text-zinc-600">
          点击卡片进入 → AI 问答生成行动计划（下一功能）
        </footer>
      </main>
    </div>
  );
}
