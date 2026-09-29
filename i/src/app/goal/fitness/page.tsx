import { dbGet, type Row } from "@/lib/db";
import FitnessForm from "./FitnessForm";

export const metadata = { title: "健身 · I" };
export const dynamic = "force-dynamic";

// 服务端预取已保存的计划，首屏直接渲染（不再等客户端请求）
export default async function FitnessPage() {
  let initial: { plan?: unknown; answers?: unknown; source?: string; updatedAt?: string } | null =
    null;

  try {
    const row = await dbGet<Row>("SELECT * FROM plans WHERE goal_id = ?", "fitness");
    if (row) {
      initial = {
        answers: JSON.parse((row.answers as string) || "{}"),
        plan: JSON.parse((row.plan as string) || "[]"),
        source: (row.source as string) || "template",
        updatedAt: (row.updated_at as string) || undefined,
      };
    }
  } catch {
    // 读不到就交给客户端兜底
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100">
      <FitnessForm initial={initial} />
    </div>
  );
}
