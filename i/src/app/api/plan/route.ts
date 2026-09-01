import { NextRequest, NextResponse } from "next/server";
import { getGoal } from "@/lib/goals";

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
    return NextResponse.json({
      source: "template",
      plan: templatePlan(goal.title, answers),
    });
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
      return NextResponse.json({
        source: "template",
        plan: templatePlan(goal.title, answers),
      });
    }

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const plan = text
      .split("\n")
      .map((line) => line.replace(/^\s*(\d+[.、）)]|[-*•])\s*/, "").trim())
      .filter(Boolean);

    return NextResponse.json({
      source: "ai",
      plan: plan.length > 0 ? plan : templatePlan(goal.title, answers),
    });
  } catch {
    return NextResponse.json({
      source: "template",
      plan: templatePlan(goal.title, answers),
    });
  }
}
