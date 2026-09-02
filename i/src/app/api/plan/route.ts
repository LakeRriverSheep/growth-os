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

// 健身专项：按身体数据精确计算（Mifflin-St Jeor 公式），不依赖 AI
function fitnessPlan(f: {
  targets: string[];
  places: string[];
  equipment: string[];
  days: string;
  profile: { gender: string; age: string; height: string; weight: string; exp: string };
}): string[] {
  const { gender, age, height, weight } = f.profile;
  const kg = parseFloat(weight) || 65;
  const cm = parseFloat(height) || 175;
  const yr = parseFloat(age) || 22;

  // 基础代谢 BMR（Mifflin-St Jeor）
  const bmr = Math.round(10 * kg + 6.25 * cm - 5 * yr + (gender === "女" ? -161 : 5));

  // 活动系数按训练频率
  const dayNum = parseInt(f.days) || 4;
  const activity = dayNum >= 6 ? 1.6 : dayNum >= 5 ? 1.55 : dayNum >= 4 ? 1.45 : 1.375;
  const tdee = Math.round(bmr * activity);

  // 目标热量
  const wantCut = f.targets.includes("减脂");
  const wantBulk = f.targets.includes("增肌");
  let targetKcal: number;
  let kcalNote: string;
  if (wantCut && wantBulk) {
    targetKcal = tdee;
    kcalNote = `你同时选了减脂和增肌——新手期可以「身体重组」：热量维持 ${tdee} 大卡，靠高蛋白+训练同时减脂增肌。`;
  } else if (wantCut) {
    targetKcal = tdee - 350;
    kcalNote = `减脂：每日热量缺口 350 大卡（TDEE ${tdee} → 目标 ${targetKcal}），每周约减 0.35kg 纯脂肪，不掉肌肉。`;
  } else {
    targetKcal = tdee + 250;
    kcalNote = `增肌：每日热量盈余 250 大卡（TDEE ${tdee} → 目标 ${targetKcal}），增重速度控制在每月 1kg 左右，多出来的都是脂肪。`;
  }

  // 蛋白质 1.8g/kg
  const protein = Math.round(kg * 1.8);
  const fat = Math.round(kg * 0.8);
  const carb = Math.round((targetKcal - protein * 4 - fat * 9) / 4);

  // 训练分化
  const splits: Record<number, { name: string; detail: string }> = {
    3: { name: "全身三分化", detail: "练一休一：全身A（胸背肩腿）→ 全身B → 全身C，每个部位每周练 1.5 次" },
    4: { name: "上下四分化", detail: "上肢日（胸背肩）↔ 下肢日（腿腹）交替，每次 60 分钟内完成" },
    5: { name: "推拉腿五分化", detail: "推（胸肩三头）→ 拉（背二头）→ 腿 → 休 → 推 → 拉 → 腿，周末休息" },
    6: { name: "推拉腿双循环", detail: "推拉腿 × 2 循环，每天只练 45 分钟控制疲劳" },
  };
  const split = splits[Math.min(dayNum, 6)] ?? splits[4];

  // 器械策略
  const hasBarbell = f.equipment.includes("杠铃哑铃");
  const hasMachine = f.equipment.includes("固定器械");
  const mainLifts = hasBarbell
    ? "杠铃深蹲、卧推、硬拉、划船、推举为动作核心"
    : hasMachine
      ? "以固定器械为主（史密斯深蹲/器械卧推/高位下拉/腿举）"
      : "弹力带+徒手模式：深蹲变式、俯卧撑变式、臀桥、划船变式，靠次数和组数凑容量";

  const expNote =
    f.profile.exp.startsWith("新手")
      ? "新手期：前 2 周用轻重量学动作，录视频对比姿势，别上大重量。"
      : "有基础：直接按 8-12RM 起步，重量以「最后 2 次艰难但姿势不变形」为准。";

  return [
    `【总览】目标：${f.targets.join("+")} · 场地：${f.places.join("/")} · 每周 ${f.days}练 · ${split.name}`,
    kcalNote,
    `【吃多少】每日目标 ${targetKcal} 大卡：蛋白质 ${protein}g（≈${kg}kg 体重 × 1.8g）· 碳水 ${carb}g · 脂肪 ${fat}g。蛋白质分 4 餐吃，练后那餐必须含 30g+。`,
    `【怎么分配】${split.detail}`,
    `【练什么】${mainLifts}。每个动作 4 组 × 8-12 次，组间休息 90 秒-2 分钟。${expNote}`,
    "【渐进超负荷】同样的动作，每周比上周多重 2.5kg 或多做 1-2 次，记进「每日记录」，这就是你进步的唯一证据。",
    "【4 周节奏】第 1-2 周打基础，第 3 周上强度，第 4 周减量 30% 恢复 + 复盘：围度和体重变化，再调整热量。",
    "【执行】训练日饭量不减、休息日碳水降 50g；每天喝够体重×35ml 水，睡够 7.5 小时——这两条不做到，上面全白搭。",
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
  if (!goal && goalId !== "fitness") {
    return NextResponse.json({ error: "goal not found" }, { status: 404 });
  }

  // 健身：精确计算，不走 AI（省钱 + 数值更准）
  if (goalId === "fitness") {
    const f = answers as unknown as {
      targets: string[];
      places: string[];
      equipment: string[];
      days: string;
      profile: { gender: string; age: string; height: string; weight: string; exp: string };
    };
    const plan = fitnessPlan(f);
    savePlan(goalId, answers, plan, "fitness-calc");
    return NextResponse.json({ source: "ai", plan });
  }

  const title = goal?.title ?? "健身";
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    const plan = templatePlan(title, answers);
    savePlan(goalId, answers, plan, "template");
    return NextResponse.json({ source: "template", plan });
  }

  const userPrompt = `我的目标：${title}（${goal?.desc ?? ""}）
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
      const plan = templatePlan(title, answers);
      savePlan(goalId, answers, plan, "template");
      return NextResponse.json({ source: "template", plan });
    }

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const plan = text
      .split("\n")
      .map((line) => line.replace(/^\s*(\d+[.、）)]|[-*•])\s*/, "").trim())
      .filter(Boolean);

    const finalPlan = plan.length > 0 ? plan : templatePlan(title, answers);
    const source = plan.length > 0 ? "ai" : "template";
    savePlan(goalId, answers, finalPlan, source);

    return NextResponse.json({ source, plan: finalPlan });
  } catch {
    const plan = templatePlan(title, answers);
    savePlan(goalId, answers, plan, "template");
    return NextResponse.json({ source: "template", plan });
  }
}
