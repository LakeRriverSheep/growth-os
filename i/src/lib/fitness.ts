// 健身计划生成引擎：运动库 + 分化逻辑 + 营养计算

export type FitnessInput = {
  targets: string[];
  places: string[];
  gymDistance: string;
  weekdays: string[];
  slots: string[];
  equipment: string[];
  profile: {
    gender: string;
    age: string;
    height: string;
    weight: string;
    bodyFat: string;
    exp: string;
  };
};

export type Exercise = { name: string; sets: string; reps: string; rest: string };
export type DayPlan = {
  day: string;
  type: string;
  slot: string;
  exercises: Exercise[];
};
export type FitnessPlan = {
  overview: { splitName: string; daysPerWeek: number; slot: string };
  macros: {
    bmr: number;
    tdee: number;
    targetKcal: number;
    targetLabel: string;
    protein: number;
    carb: number;
    fat: number;
    note: string;
  };
  schedule: DayPlan[];
  notes: string[];
};

// ---------- 运动库（按器械×动作模式） ----------
type Move = { name: string; pattern: "蹲" | "推" | "拉" | "髋" | "核心"; compound: boolean };

const LIB: Record<string, Move[]> = {
  "杠铃哑铃": [
    { name: "杠铃深蹲", pattern: "蹲", compound: true },
    { name: "哑铃卧推", pattern: "推", compound: true },
    { name: "杠铃罗马尼亚硬拉", pattern: "髋", compound: true },
    { name: "哑铃划船", pattern: "拉", compound: true },
    { name: "哑铃站姿肩推", pattern: "推", compound: true },
    { name: "保加利亚分腿蹲", pattern: "蹲", compound: true },
    { name: "哑铃弯举", pattern: "拉", compound: false },
    { name: "哑铃臂屈伸", pattern: "推", compound: false },
  ],
  固定器械: [
    { name: "腿举", pattern: "蹲", compound: true },
    { name: "坐姿推胸", pattern: "推", compound: true },
    { name: "高位下拉", pattern: "拉", compound: true },
    { name: "坐姿划船", pattern: "拉", compound: true },
    { name: "腿屈伸", pattern: "蹲", compound: false },
    { name: "腿弯举", pattern: "髋", compound: false },
  ],
  弹力带: [
    { name: "弹力带深蹲", pattern: "蹲", compound: true },
    { name: "弹力带推胸", pattern: "推", compound: true },
    { name: "弹力带划船", pattern: "拉", compound: true },
    { name: "弹力带肩推", pattern: "推", compound: true },
    { name: "弹力带硬拉", pattern: "髋", compound: true },
  ],
  徒手: [
    { name: "俯卧撑（或跪姿）", pattern: "推", compound: true },
    { name: "徒手深蹲", pattern: "蹲", compound: true },
    { name: "臀桥", pattern: "髋", compound: true },
    { name: "反向划船（桌下）", pattern: "拉", compound: true },
    { name: "弓步蹲", pattern: "蹲", compound: true },
    { name: "平板支撑", pattern: "核心", compound: false },
  ],
};

const ALL_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function pool(equipment: string[]): Move[] {
  const out: Move[] = [];
  for (const e of equipment) out.push(...(LIB[e] ?? []));
  return out;
}

function pick(poolMoves: Move[], pattern: Move["pattern"], n: number): Move[] {
  const c = poolMoves.filter((m) => m.pattern === pattern);
  const out: Move[] = [];
  for (let i = 0; i < n && c.length > 0; i++) {
    out.push(c.splice((i * 2) % c.length, 1)[0]);
  }
  return out;
}

function toEx(moves: Move[], exp: string): Exercise[] {
  const beginner = exp.startsWith("新手");
  return moves.map((m, i) => ({
    name: m.name,
    sets: m.compound ? "4 组" : "3 组",
    reps: m.compound
      ? beginner ? "8-10 次（轻重量学动作）" : "8-12 次"
      : i === moves.length - 1
        ? "力竭"
        : "12-15 次",
    rest: m.compound ? "90-120 秒" : "60 秒",
  }));
}

// ---------- 分化逻辑 ----------
function dayTypes(days: number): { name: string; mix: { 蹲: number; 推: number; 拉: number; 髋: number } }[] {
  const full = { 蹲: 1, 推: 1, 拉: 1, 髋: 1 };
  switch (days) {
    case 1:
    case 2:
      return Array.from({ length: days }, () => ({ name: "全身训练", mix: full }));
    case 3:
      return [
        { name: "全身 A（下肢主导）", mix: { 蹲: 2, 推: 1, 拉: 1, 髋: 1 } },
        { name: "全身 B（上肢主导）", mix: { 蹲: 1, 推: 2, 拉: 2, 髋: 0 } },
        { name: "全身 C（均衡）", mix: full },
      ];
    case 4:
      return [
        { name: "上肢日（胸肩三头）", mix: { 蹲: 0, 推: 3, 拉: 2, 髋: 0 } },
        { name: "下肢日（腿臀）", mix: { 蹲: 2, 推: 0, 拉: 0, 髋: 2 } },
        { name: "上肢日（背二头）", mix: { 蹲: 0, 推: 2, 拉: 3, 髋: 0 } },
        { name: "下肢日（腿核心）", mix: { 蹲: 2, 推: 0, 拉: 0, 髋: 1 } },
      ];
    case 5:
      return [
        { name: "推日（胸肩三头）", mix: { 蹲: 0, 推: 3, 拉: 1, 髋: 0 } },
        { name: "拉日（背二头）", mix: { 蹲: 0, 推: 1, 拉: 3, 髋: 0 } },
        { name: "腿日（蹲为主）", mix: { 蹲: 3, 推: 0, 拉: 0, 髋: 1 } },
        { name: "上肢日（均衡）", mix: { 蹲: 0, 推: 2, 拉: 2, 髋: 0 } },
        { name: "腿日（髋为主）", mix: { 蹲: 1, 推: 0, 拉: 0, 髋: 3 } },
      ];
    default:
      // 6-7 天：推拉腿双循环
      return [
        { name: "推日", mix: { 蹲: 0, 推: 3, 拉: 1, 髋: 0 } },
        { name: "拉日", mix: { 蹲: 0, 推: 1, 拉: 3, 髋: 0 } },
        { name: "腿日", mix: { 蹲: 2, 推: 0, 拉: 0, 髋: 2 } },
        { name: "推日", mix: { 蹲: 0, 推: 3, 拉: 1, 髋: 0 } },
        { name: "拉日", mix: { 蹲: 0, 推: 1, 拉: 3, 髋: 0 } },
        { name: "腿日", mix: { 蹲: 2, 推: 0, 拉: 0, 髋: 2 } },
        ...(days === 7 ? [{ name: "全身+核心（轻量）", mix: { 蹲: 1, 推: 1, 拉: 1, 髋: 1 } }] : []),
      ];
  }
}

// ---------- 营养计算 ----------
function nutrition(f: FitnessInput) {
  const kg = parseFloat(f.profile.weight) || 65;
  const cm = parseFloat(f.profile.height) || 175;
  const yr = parseFloat(f.profile.age) || 22;
  const bf = parseFloat(f.profile.bodyFat);

  // 有体脂率用 Katch-McArdle（更准），否则 Mifflin-St Jeor
  const bmr =
    bf > 3 && bf < 60
      ? Math.round(370 + 21.6 * kg * (1 - bf / 100))
      : Math.round(10 * kg + 6.25 * cm - 5 * yr + (f.profile.gender === "女" ? -161 : 5));

  const days = Math.max(1, f.weekdays.length);
  const activity = days >= 6 ? 1.6 : days >= 5 ? 1.55 : days >= 4 ? 1.45 : days >= 3 ? 1.375 : 1.25;
  const tdee = Math.round(bmr * activity);

  const wantCut = f.targets.includes("减脂");
  const wantBulk = f.targets.includes("增肌");
  let targetKcal: number;
  let targetLabel: string;
  let note: string;
  if (wantCut && wantBulk) {
    targetKcal = tdee;
    targetLabel = "身体重组（维持热量）";
    note = `减脂+增肌同时进行：热量维持 ${tdee}，靠高蛋白 + 训练实现「新手期重组红利」。`;
  } else if (wantCut) {
    targetKcal = tdee - 350;
    targetLabel = "减脂（-350/天）";
    note = `每天缺口 350 大卡，约每周减 0.35kg 脂肪。体重每周日早晨空腹称一次，掉太快就加 100 大卡。`;
  } else {
    targetKcal = tdee + 250;
    targetLabel = "增肌（+250/天）";
    note = `每天盈余 250 大卡，增重控制在每月 1kg 内——多出来的只会是脂肪。体重不涨两周，再加 100 大卡。`;
  }

  const protein = Math.round(kg * 1.8);
  const fat = Math.round(kg * 0.8);
  const carb = Math.max(80, Math.round((targetKcal - protein * 4 - fat * 9) / 4));

  return { bmr, tdee, targetKcal, targetLabel, protein, carb, fat, note };
}

// ---------- 主生成器 ----------
export function generateFitnessPlan(f: FitnessInput): FitnessPlan {
  const kg = parseFloat(f.profile.weight) || 65;
  const macros = nutrition(f);
  const moves = pool(f.equipment.length ? f.equipment : ["徒手"]);
  const exp = f.profile.exp;
  const slot = f.slots[0] ?? "傍晚";
  const types = dayTypes(f.weekdays.length);

  // 一周排期：用户选的日子练，其余休息
  const schedule: DayPlan[] = ALL_DAYS.map((d) => {
    const idx = f.weekdays.indexOf(d);
    if (idx === -1) {
      return { day: d, type: "休息", slot: "—", exercises: [] };
    }
    const t = types[idx % types.length];
    const ex: Exercise[] = [
      ...toEx(pick(moves, "蹲", t.mix["蹲"]), exp),
      ...toEx(pick(moves, "推", t.mix["推"]), exp),
      ...toEx(pick(moves, "拉", t.mix["拉"]), exp),
      ...toEx(pick(moves, "髋", t.mix["髋"]), exp),
    ];
    // 每次训练收尾核心
    ex.push({ name: "平板支撑", sets: "3 组", reps: "45-60 秒", rest: "45 秒" });
    return { day: d, type: t.name, slot, exercises: ex };
  });

  const notes: string[] = [
    "渐进超负荷：同样的动作，每周比上周多重 2.5kg 或多做 1-2 次，记进「每日记录」——这是进步的唯一证据。",
    `蛋白质 ${macros.protein}g 分 4 餐吃（每餐 ≈${Math.round(macros.protein / 4)}g），练后那餐必须含 30g+。`,
    "每天喝水 = 体重(kg) × 35ml，睡够 7.5 小时。这两条做不到，吃练计划全白搭。",
    "第 4 周为减量周：重量降 30%，让关节和神经恢复，第 5 周继续涨。",
  ];

  if (f.gymDistance.includes("很远")) {
    notes.unshift("⚠️ 健身房距你 >5km：通勤会消耗训练意志。建议 ① 换离家/公司 1km 内的健身房；② 或把小肌群训练改为在家用弹力带完成。");
  }
  if (f.places.includes("家里") && f.places.includes("健身房")) {
    notes.push("混合场地策略：大肌群日（腿/胸/背）去健身房上杠铃，手臂肩这类小肌群日在家用哑铃弹力带解决，省通勤。");
  }
  const bf = parseFloat(f.profile.bodyFat);
  if (bf > 0) {
    notes.push(
      `你报的体脂率 ${bf}%：${bf > 20 ? "减脂空间充足，前 4 周重点做热量缺口，力量训练保肌肉。" : bf > 14 ? "体脂已健康，重点做增肌塑形，别再往下砍热量。" : "体脂偏低，直接走增肌盈余路线。"}`,
    );
  }

  return {
    overview: {
      splitName:
        f.weekdays.length <= 2
          ? "全身分化"
          : f.weekdays.length === 3
            ? "全身三分化（A/B/C）"
            : f.weekdays.length === 4
              ? "上下四分化"
              : "推拉腿多分化",
      daysPerWeek: f.weekdays.length,
      slot,
    },
    macros,
    schedule,
    notes,
  };
}
