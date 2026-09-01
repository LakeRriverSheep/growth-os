import { notFound } from "next/navigation";
import { getGoal } from "@/lib/goals";
import Wizard from "./Wizard";

export default async function GoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const goal = getGoal(id);
  if (!goal) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
      <main className="mx-auto max-w-2xl">
        <a href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← 返回首页
        </a>
        <header className="mt-4 mb-8 flex items-center gap-3">
          <span className="text-3xl">{goal.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold">{goal.title}</h1>
            <p className="text-sm text-zinc-400">{goal.desc}</p>
          </div>
        </header>
        <Wizard goal={goal} />
      </main>
    </div>
  );
}
