import PageHeader from "@/app/_components/PageHeader";
import DailyGoals from "./_components/DailyGoals";
import IdentityView from "./_components/IdentityView";

export const metadata = { title: "我 · I" };

export default function MePage() {
  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100">
      <PageHeader title="我" sub="身份层" />

      <main className="w-full px-6 pb-16 pt-6">
        <h1 className="text-2xl font-bold tracking-tight">我</h1>
        <p className="mt-1 text-xs text-zinc-500">
          身份层：想成为的人、为什么、该做什么、不该做什么。点任意一项直接改，改完点底部「保存」。
        </p>

        {/* 身份层（可增删改查） */}
        <IdentityView />

        {/* 每日目标 */}
        <section className="mt-8 border-t border-zinc-900 pt-6">
          <h2 className="text-sm font-semibold text-zinc-200">每日目标</h2>
          <p className="mt-1 text-xs text-zinc-500">
            身份层落到今天：每天要达成的行动、每周要达成的次数，以及厉害的人每天实际会做的行为。
          </p>
          <DailyGoals />
        </section>
      </main>
    </div>
  );
}
