// 英语考试计划生成引擎：倒计时 + 每日任务分配 + 阶段里程碑

export type EnglishInput = {
  exam: string; // 四级 | 六级 | 雅思 | 考研英语 | 中考英语 | 高考英语
  level: string; // 基础薄弱 | 中等 | 中上
  target: string;
  examDate: string; // YYYY-MM-DD
  hours: string; // 每天可投入小时数
  weak: string[]; // 词汇/听力/阅读/写作/口语/翻译
};

export type DailyTask = { name: string; minutes: number; how: string };
export type Milestone = { phase: string; range: string; goal: string };

export type EnglishPlan = {
  overview: {
    exam: string;
    target: string;
    daysLeft: number;
    weeks: number;
    dailyHours: number;
    totalHours: number;
  };
  daily: DailyTask[];
  milestones: Milestone[];
  notes: string[];
};

// 各技能的训练任务（name + 怎么练）
const SKILL_TASKS: Record<string, { name: string; how: string }> = {
  词汇: {
    name: "核心词速刷",
    how: "App 按艾宾浩斯曲线过考试高频词，新词+复习混合，碎片时间做",
  },
  听力: {
    name: "精听训练",
    how: "真题 1 段：盲听 1 遍 → 对照原文找没听出的地方 → 跟读模仿，标记连读弱读",
  },
  阅读: {
    name: "真题精读",
    how: "限时做 1 篇 → 逐句精读，摘出影响理解的生词和长难句，错题归因（看不懂 vs 定位错）",
  },
  写作: {
    name: "写作仿写",
    how: "精读 1 篇范文拆结构 → 限时仿写 1 段 → 对照范文批改自己的差距",
  },
  口语: {
    name: "口语输出",
    how: "影子跟读 10 分钟 + 按话题框架自问自答并录音，回听找卡壳和语法错",
  },
  翻译: {
    name: "翻译专项",
    how: "真题 2 句：先自己译 → 对照参考译文 → 积累没译出来的表达",
  },
};

const ALL_SKILLS = ["词汇", "听力", "阅读", "写作", "口语", "翻译"];

function round5(n: number) {
  return Math.max(15, Math.round(n / 5) * 5);
}

// ---------- 每日任务分配 ----------
function dailyTasks(f: EnglishInput, totalMin: number): DailyTask[] {
  const tasks: DailyTask[] = [];
  const weak = f.weak.filter((w) => ALL_SKILLS.includes(w));

  // 词汇是每天的锚点任务：薄弱加量，不薄弱维持
  const vocabMin = weak.includes("词汇") ? Math.min(45, round5(totalMin * 0.25)) : 20;
  tasks.push({ ...SKILL_TASKS["词汇"], minutes: vocabMin });

  let remaining = totalMin - vocabMin;
  const weakSkills = weak.filter((w) => w !== "词汇");
  const maintain = ALL_SKILLS.filter((s) => s !== "词汇" && !weakSkills.includes(s));

  // 薄弱项拿走剩余时间的 75%，均分（雅思口语上限单任务 40 分钟）
  if (weakSkills.length > 0) {
    const per = round5((remaining * 0.75) / weakSkills.length);
    for (const s of weakSkills) {
      tasks.push({ ...SKILL_TASKS[s], minutes: Math.min(45, per) });
    }
    remaining -= Math.min(45, per) * weakSkills.length;
  }

  // 剩余时间给维持项（泛读/泛听浸泡），有就排一条
  if (remaining >= 15 && maintain.length > 0) {
    tasks.push({
      name: "泛读泛听浸泡",
      minutes: round5(remaining),
      how: `不查词不做题，挑 ${f.exam === "雅思" ? "BBC/TED" : "考试同源材料"} 磨语感，通勤吃饭时听`,
    });
  }

  return tasks;
}

// ---------- 阶段里程碑 ----------
function milestones(weeks: number): Milestone[] {
  const w1 = Math.max(1, Math.floor(weeks * 0.4));
  const w2 = Math.max(w1 + 1, Math.floor(weeks * 0.8));
  return [
    {
      phase: "Phase 1 · 打地基",
      range: `第 1 - ${w1} 周`,
      goal: "词汇量 + 听力磨耳朵。这个阶段不碰难题，把输入的地基打牢——单词背了就忘是正常的，靠重复次数堆出来。",
    },
    {
      phase: "Phase 2 · 真题为王",
      range: `第 ${w1 + 1} - ${w2} 周`,
      goal: "按考试节奏限时训练真题，输出项（写作/口语）每天必须碰。错题本只记「为什么错」，不抄题。",
    },
    {
      phase: "Phase 3 · 模考冲刺",
      range: `最后 ${weeks - w2} 周`,
      goal: "每周 2 套全真模考（严格计时 + 涂卡/录音），复盘比做新题重要。把生物钟调到考试时段：几点考就几点练。",
    },
  ];
}

// ---------- 主生成器 ----------
export function generateEnglishPlan(f: EnglishInput): EnglishPlan {
  const today = new Date();
  const exam = new Date(f.examDate);
  const daysLeft = Math.max(
    1,
    Math.min(730, Math.ceil((exam.getTime() - today.getTime()) / 86400000)),
  );
  const weeks = Math.max(1, Math.ceil(daysLeft / 7));
  const dailyHours = parseFloat(f.hours) || 1.5;
  const totalMin = Math.round(dailyHours * 60);
  const totalHours = Math.round(dailyHours * daysLeft);

  const daily = dailyTasks(f, totalMin);
  const ms = milestones(weeks);

  const notes: string[] = [
    `每天 ${dailyHours} 小时 × ${daysLeft} 天 ≈ 总投入 ${Math.round(dailyHours * daysLeft)} 小时。坚持出现在「每日记录」里打卡，断 2 天就缩减任务量保连续，别断 3 天。`,
    "任务做不完时按顺序砍：先砍浸泡项，再砍薄弱项，词汇锚点永远最后动。",
    "每周日晚花 10 分钟复盘：这周正确率/听力得分有没有变化，没变化就换方法，不是加时间。",
  ];

  if (daysLeft <= 14) {
    notes.unshift(
      `⚠️ 距考试只剩 ${daysLeft} 天：停止学新东西，全部时间给真题模考 + 错题复盘，词汇只过已标记的熟词。`,
    );
  }
  if (f.level === "基础薄弱") {
    notes.push(
      "基础薄弱策略：只抓性价比最高的三项（词汇、听力、写作模板），阅读靠词汇量自然涨分，别恋战难题。",
    );
  }
  if (f.exam === "雅思" && f.weak.includes("口语")) {
    notes.push(
      "口语按「骨架框架」练 Part 3：先搭结构（观点→解释→例子→对比→让步→重申），再填内容。口播录音回听一遍，比再练十遍更有效。",
    );
  }
  if (f.exam === "四级" || f.exam === "六级") {
    notes.push("四六级听力占 35%，是性价比之王——精听 1 篇的收益 > 阅读 3 篇。听力别裸奔。");
  }
  if (f.exam === "考研英语") {
    notes.push("考研英语得阅读者得天下：阅读 40 分里每一分都要抠。作文最后 4 周背框架模板即可，别提前烧时间。");
  }

  return {
    overview: {
      exam: f.exam,
      target: f.target,
      daysLeft,
      weeks,
      dailyHours,
      totalHours,
    },
    daily,
    milestones: ms,
    notes,
  };
}
