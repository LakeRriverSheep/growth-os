import Link from "next/link";
import { identity } from "@/lib/identity";

export const metadata = { title: "我 · I" };

function BackLink() {
  return (
    <Link
      href="/"
      className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
    >
      ← 返回
    </Link>
  );
}

export default function MePage() {
  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between px-6 pt-6">
        <BackLink />
        <p className="text-xs text-zinc-600">最后更新 {identity.updatedAt}</p>
      </header>

      <main className="mx-auto w-full max-w-xl px-5 pb-16 pt-4">
        <h1 className="text-2xl font-bold tracking-tight">我</h1>
        <p className="mt-1 text-xs text-zinc-500">
          月级更新的身份层。改这里的人是月级的你，不是日级的情绪。
        </p>

        {/* ① 我想成为什么样的人 */}
        <section id="become" className="mt-8 scroll-mt-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            ① 我想成为什么样的人
          </h2>
          <div className="mt-3 space-y-4">
            {identity.profile.map((p) => (
              <div key={p.group}>
                <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                  {p.group}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ② 我为什么要成为这样的人 */}
        <section className="mt-8 border-t border-zinc-900 pt-6">
          <h2 className="text-sm font-semibold text-zinc-200">
            ② 我为什么要成为这样的人
          </h2>
          <ul className="mt-3 space-y-2">
            {identity.motives.map((m) => (
              <li key={m} className="flex gap-2 text-[13px] leading-6 text-zinc-400">
                <span className="mt-0 text-zinc-600">·</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ③ 我应该做什么 */}
        <section id="do" className="mt-8 scroll-mt-4 border-t border-zinc-900 pt-6">
          <h2 className="text-sm font-semibold text-zinc-200">③ 我应该做什么</h2>
          <div className="mt-3 space-y-2.5">
            {identity.actions.map((a) => (
              <div
                key={a.goal}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <p className="text-sm font-medium text-zinc-200">{a.goal}</p>
                <p className="mt-1 text-[13px] leading-6 text-zinc-400">{a.action}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ④ 我不应该做什么 */}
        <section id="not" className="mt-8 scroll-mt-4 border-t border-zinc-900 pt-6">
          <h2 className="text-sm font-semibold text-zinc-200">④ 我不应该做什么</h2>
          <ul className="mt-3 space-y-2.5">
            {identity.bans.map((b) => (
              <li
                key={b}
                className="flex items-start gap-3 rounded-2xl border border-dashed border-zinc-800 p-4 text-[13px] leading-6 text-zinc-400"
              >
                <span className="mt-1 block h-3 w-3 shrink-0 bg-zinc-600" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 每日四问 */}
        <section className="mt-8 border-t border-zinc-900 pt-6">
          <h2 className="text-sm font-semibold text-zinc-200">每日四问</h2>
          <ol className="mt-3 space-y-1.5 text-[13px] leading-6 text-zinc-500">
            {identity.dailyQuestions.map((q, i) => (
              <li key={q}>
                <span className="text-zinc-600">{i + 1}. </span>
                {q}
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
