import { NextRequest, NextResponse } from "next/server";
import { getGoal } from "@/lib/goals";
import { db } from "@/lib/db";

const SYSTEM_PROMPT = `你是一位个人成长教练，为用户生成具体、可执行、循序渐进的行动计划。
规则：
1. 输出 3-5 条行动计划，每条一行，中文
2. 每条必须具体可执行（有频率、有数字、有验收方式）
3. 周期为 4 周，语气直接不鸡汤
4. 直接输出计划条目，不要开场白和结尾总结`;

// 模板版（无 API key 时的降级方案）
function templatePlan(goalTitle: string, answers: Record<string, string>): string[] {
  const a = Object.values(answers).join(" · ");
  return [
    `基于你的选择：${a}`,
    "本周期为 4 周，每周复盘一次，按完成情况调整强度。",
    "每次执行后在「每日记录」里打卡留痕，连续 2 周没进步就调整方案。",
  ];
}

function savePlan(
  goalId: string,
  answers: Record<string, string>,
  plan: string[],
  source: string,
) {
  db.prepare(
    `INSERT INTO plans (goal_id, answers, plan, source, updated_at)
     VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
     ON CONFLICT(goal_id) DO UPDATE SET
       answers = excluded.answers,
       plan = excluded.plan,
       source = excluded.source,
       updated_at = excluded.updated_at`,
  ).run(goalId, JSON.stringify(answers), JSON.stringify(plan), source);
}

// GET /api/plan?goalId=xx → 读取已保存的计划（重新进入卡片时恢复）
export async function GET(req: NextRequest) {
  const goalId = req.nextUrl.searchParams.get("goalId");
  if (!goalId) {
    return NextResponse.json({ error: "goalId required" }, { status: 400 });
  }

  const row = db
    .prepare("SELECT * FROM plans WHERE goal_id = ?")
    .get(goalId) as Record<string, unknown> | undefined;

  if (!row) return NextResponse.json(null);

  return NextResponse.json({
    answers: JSON.parse((row.answers as string) || "{}"),
    plan: JSON.parse((row.plan as string) || "[]"),
    source: row.source,
    updatedAt: row.updated_at,
  });
}

export async function POST(req: NextRequest) {
  const { goalId, answers } = (await req.json()) as {
    goalId: string;
    answers: Record<string, string>;
  };

  const goal = getGoal(goalId);
  if (!goal) {
    return NextResponse.json({ error: "goal not found" }, { status: 404 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    const plan = templatePlan(goal.title, answers);
    savePlan(goalId, answers, plan, "template");
    return NextResponse.json({ source: "template", plan });
  }

  const userPrompt = `我的目标：${goal.title}（${goal.desc}）
我的情况/选择：
${Object.entries(answers)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}

请生成为期 4 周的行动计划。`;

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const plan = templatePlan(goal.title, answers);
      savePlan(goalId, answers, plan, "template");
      return NextResponse.json({ source: "template", plan });
    }

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const plan = text
      .split("\n")
      .map((line) => line.replace(/^\s*(\d+[.、）)]|[-*•])\s*/, "").trim())
      .filter(Boolean);

    const finalPlan = plan.length > 0 ? plan : templatePlan(goal.title, answers);
    const source = plan.length > 0 ? "ai" : "template";
    savePlan(goalId, answers, finalPlan, source);

    return NextResponse.json({ source, plan: finalPlan });
  } catch {
    const plan = templatePlan(goal.title, answers);
    savePlan(goalId, answers, plan, "template");
    return NextResponse.json({ source: "template", plan });
  }
}
