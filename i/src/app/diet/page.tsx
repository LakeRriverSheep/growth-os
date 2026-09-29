import Link from "next/link";
import { dbGet, type Row } from "@/lib/db";
import { buildDietPlan, type DietPlan, type DietMacros } from "@/lib/diet";
import PageHeader from "@/app/_components/PageHeader";
import DietView from "./_components/DietView";

export const metadata = { title: "饮食 · I" };
export const dynamic = "force-dynamic";

// 服务端直接读库算好，首屏就是内容（不再等客户端请求）
export default async function DietPage() {
  let macros: DietMacros | null = null;
  let dietPlan: DietPlan | null = null;

  try {
    const row = await dbGet<Row>("SELECT plan FROM plans WHERE goal_id = ?", "fitness");
    const plan = row ? (JSON.parse((row.plan as string) || "[]") as Record<string, unknown>) : null;
    if (plan && !Array.isArray(plan) && plan.macros) {
      const m = plan.macros as DietMacros;
      macros = { ...m, carbRest: m.carbRest ?? Math.round(m.carb * 0.75) };
      dietPlan = (plan.diet as DietPlan) ?? buildDietPlan(macros);
    }
  } catch {
    // 读不到就交给客户端兜底
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100">
      <PageHeader
        title="饮食"
        sub="全天搭配与食材库"
        right={
          <Link
            href="/goal/fitness"
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            去健身计划调整 →
          </Link>
        }
      />
      <DietView initial={{ macros, dietPlan }} />
    </div>
  );
}
