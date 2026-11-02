import WeekView from "./_components/WeekView";
import { dbAll, dbGet } from "@/lib/db";
import { aiStatus } from "@/lib/ai";
import { isDateStr } from "@/lib/http";
import { rowToItem, weekStartOf, type WeekReport } from "@/lib/week";

// 周复盘：一周只回看一次，所以这里不做每日打卡，只做「这周发生过什么」。
export const dynamic = "force-dynamic";

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const sp = await searchParams;
  const weekStart = weekStartOf(isDateStr(sp.week) ? sp.week : new Date());

  const rows = await dbAll<Record<string, unknown>>(
    "SELECT * FROM week_items WHERE week_start = ? ORDER BY created_at DESC",
    weekStart,
  );
  const items = rows.map(rowToItem);

  const saved = await dbGet<{ summary: string }>(
    "SELECT summary FROM week_reports WHERE week_start = ?",
    weekStart,
  );
  let report: WeekReport | null = null;
  if (saved) {
    try {
      report = JSON.parse(saved.summary) as WeekReport;
    } catch {
      report = null;
    }
  }

  return (
    <WeekView
      weekStart={weekStart}
      initialItems={items}
      initialReport={report}
      ai={aiStatus()}
    />
  );
}
