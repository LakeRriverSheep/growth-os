// 健身计划生成引擎 v3
// 结构参考 Strong / JeFit 类训练 App：部位日排序 × 起始重量 × 练前练后餐 × 采购清单

export type FitnessInput = {
  targets: string[];
  parts: string[]; // 想练的部位，按点击顺序 = 每周训练顺序（空 = 自动分化）
  places: string[];
  gymPoints: { point: string; distance: string }[]; // 出发点（可多选）+ 各点距离
  weekdays: string[];
  daySlots: Record<string, string>; // 周几 → 清晨/午间/傍晚/夜间/暂定
  equipment: string[]; // 细化器械
  profile: {
    gender: string;
    age: string;
    height: string;
    weight: string;
    bodyFat: string;
    goalWeight?: string;
    exp: string;
  };
};

export type Exercise = {
  name: string;
  muscle: string;
  startWeight: string; // 起始重量参考
  setsReps: string;
  rest: string;
  cue: string; // 动作要点
};
export type DayPlan = {
  day: string;
  type: string;
  place: string;
  slot: string;
  minutes: number;
  exercises: Exercise[];
};
export type MealPlan = {
  preWorkout: { when: string; items: string[] };
  postWorkout: { when: string; items: string[] };
  meals: { name: string; items: string[] }[];
  shopping: { item: string; amount: string; note: string }[];
  channels: { name: string; why: string }[];
  gear: { item: string; price: string; why: string }[];
};
export type FitnessPlan = {
  overview: {
    splitName: string;
    daysPerWeek: number;
    gymDays: number;
    homeDays: number;
    timeline: string;
  };
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
  meals: MealPlan;
  warmup: string[];
  schedule: DayPlan[];
  progression: { week: string; focus: string; how: string }[];
  notes: string[];
};

// ---------- 细化运动库 ----------
type Move = {
  name: string;
  pattern: "蹲" | "推" | "拉" | "髋" | "核心";
  muscle: string;
  compound: boolean;
  cue: string;
};

const LIB: Record<string, Move[]> = {
  杠铃: [
    { name: "杠铃深蹲", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "下蹲到髋低于膝盖，起身先顶髋" },
    { name: "杠铃卧推", pattern: "推", muscle: "胸 · 前束", compound: true, cue: "肩胛后缩下沉，杆落在胸骨中下段" },
    { name: "杠铃罗马尼亚硬拉", pattern: "髋", muscle: "腘绳 · 臀 · 下背", compound: true, cue: "杆贴小腿滑，感受大腿后侧拉伸" },
    { name: "杠铃划船", pattern: "拉", muscle: "背 · 二头", compound: true, cue: "躯干前倾 45°，肘贴身体向后拉" },
    { name: "杠铃站姿肩推", pattern: "推", muscle: "肩 · 三头", compound: true, cue: "收紧核心不后仰，杆过头顶" },
  ],
  哑铃: [
    { name: "哑铃卧推", pattern: "推", muscle: "胸 · 前束", compound: true, cue: "下放到大臂与地面平行，顶峰挤压胸" },
    { name: "哑铃划船", pattern: "拉", muscle: "背 · 二头", compound: true, cue: "单膝跪凳，肘向上向后，不转体" },
    { name: "哑铃站姿肩推", pattern: "推", muscle: "肩 · 三头", compound: true, cue: "哑铃举到耳朵两侧，推起不锁死肘" },
    { name: "保加利亚分腿蹲", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "后腿搭凳，前腿发力，躯干微前倾" },
    { name: "哑铃弯举", pattern: "拉", muscle: "二头", compound: false, cue: "上臂固定不动，慢下放 2 秒" },
    { name: "哑铃臂屈伸", pattern: "推", muscle: "三头", compound: false, cue: "肘指向天花板，只动小臂" },
  ],
  龙门架: [
    { name: "绳索夹胸", pattern: "推", muscle: "胸", compound: false, cue: "手肘微屈定角，想象环抱大树" },
    { name: "绳索下压", pattern: "推", muscle: "三头", compound: false, cue: "大臂夹紧身体，只伸小臂" },
    { name: "绳索划船", pattern: "拉", muscle: "背 · 后束", compound: true, cue: "拉到腹部，肩胛先收再屈肘" },
    { name: "绳索面拉", pattern: "拉", muscle: "后束 · 上背", compound: false, cue: "拉向额头，外旋肩膀护肩" },
    { name: "绳索弯举", pattern: "拉", muscle: "二头", compound: false, cue: "恒定张力，顶端停留 1 秒" },
  ],
  史密斯机: [
    { name: "史密斯深蹲", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "脚略向前站，靠背稳杆" },
    { name: "史密斯卧推", pattern: "推", muscle: "胸 · 前束", compound: true, cue: "轨迹固定，专注胸部发力" },
    { name: "史密斯划船", pattern: "拉", muscle: "背 · 二头", compound: true, cue: "俯身稳定，拉向下腹部" },
  ],
  坐姿器械: [
    { name: "坐姿推胸", pattern: "推", muscle: "胸 · 前束", compound: true, cue: "靠背贴紧，推出时呼气" },
    { name: "高位下拉", pattern: "拉", muscle: "背 · 二头", compound: true, cue: "拉到锁骨，回放控制 2 秒" },
    { name: "坐姿划船", pattern: "拉", muscle: "背 · 后束", compound: true, cue: "挺胸不弓腰，拉到小腹" },
    { name: "腿举", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "膝盖不锁死，脚放平台中高位" },
    { name: "腿屈伸", pattern: "蹲", muscle: "股四头", compound: false, cue: "顶峰收缩 1 秒，慢放" },
    { name: "腿弯举", pattern: "髋", muscle: "腘绳", compound: false, cue: "髋贴紧凳面，感受大腿后侧" },
  ],
  弹力带: [
    { name: "弹力带深蹲", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "带踩脚下过肩，下蹲对抗阻力" },
    { name: "弹力带推胸", pattern: "推", muscle: "胸 · 三头", compound: true, cue: "带绕背后，向前推出挤压胸" },
    { name: "弹力带划船", pattern: "拉", muscle: "背 · 二头", compound: true, cue: "带踩脚下或绕固定物，向后拉" },
    { name: "弹力带肩推", pattern: "推", muscle: "肩 · 三头", compound: true, cue: "带踩脚下，向上推起" },
    { name: "弹力带硬拉", pattern: "髋", muscle: "腘绳 · 臀", compound: true, cue: "带踩脚下，髋部折叠起身夹臀" },
  ],
  单双杠: [
    { name: "引体向上（可弹力带辅助）", pattern: "拉", muscle: "背 · 二头", compound: true, cue: "全程不用惯性，下巴过杠" },
    { name: "双杠臂屈伸", pattern: "推", muscle: "胸 · 三头", compound: true, cue: "身体前倾练胸，直立练三头" },
    { name: "悬垂举腿", pattern: "核心", muscle: "核心", compound: false, cue: "不摆动，骨盆后倾卷腿" },
  ],
  徒手: [
    { name: "俯卧撑（或跪姿）", pattern: "推", muscle: "胸 · 三头", compound: true, cue: "身体一条线，胸贴近地面" },
    { name: "徒手深蹲", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "臀部后坐，膝盖对脚尖" },
    { name: "弓步蹲", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "前腿发力，后腿膝盖不落地" },
    { name: "臀桥", pattern: "髋", muscle: "臀 · 腘绳", compound: true, cue: "顶峰夹臀 2 秒，不顶腰" },
    { name: "反向划船（桌下）", pattern: "拉", muscle: "背 · 二头", compound: true, cue: "身体斜挂桌下，胸拉向桌沿" },
    { name: "平板支撑", pattern: "核心", muscle: "核心", compound: false, cue: "收紧腰腹不塌腰，臀不翘" },
  ],
};

// 起始重量系数（相对体重，男；女 × 0.7；新手 × 0.7；老手 × 1.15）
const START_KG: Record<string, number> = {
  杠铃深蹲: 0.5,
  杠铃卧推: 0.35,
  杠铃罗马尼亚硬拉: 0.6,
  杠铃划船: 0.35,
  杠铃站姿肩推: 0.25,
  哑铃卧推: 0.15,
  哑铃划船: 0.2,
  哑铃站姿肩推: 0.12,
  保加利亚分腿蹲: 0.1,
  哑铃弯举: 0.08,
  哑铃臂屈伸: 0.08,
  绳索夹胸: 0.12,
  绳索下压: 0.12,
  绳索划船: 0.3,
  绳索面拉: 0.1,
  绳索弯举: 0.08,
  史密斯深蹲: 0.4,
  史密斯卧推: 0.3,
  史密斯划船: 0.3,
  坐姿推胸: 0.4,
  高位下拉: 0.4,
  坐姿划船: 0.35,
  腿举: 1.0,
  腿屈伸: 0.25,
  腿弯举: 0.2,
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

function startWeight(name: string, kg: number, gender: string, exp: string): string {
  const coef = START_KG[name];
  if (!coef) {
    if (name.includes("引体")) return "弹力带辅助起步";
    return "自重";
  }
  let w = kg * coef;
  if (gender === "女") w *= 0.7;
  if (exp.startsWith("新手")) w *= 0.7;
  if (exp.startsWith("老手")) w *= 1.15;
  const rounded = Math.max(2.5, Math.round(w / 2.5) * 2.5);
  const perHand = name.startsWith("哑铃");
  return `${rounded}kg${perHand ? " / 只" : ""}`;
}

function toEx(moves: Move[], exp: string, kg: number, gender: string): Exercise[] {
  return moves.map((m, i) => ({
    name: m.name,
    muscle: m.muscle,
    startWeight: startWeight(m.name, kg, gender, exp),
    setsReps: m.compound ? "4 × 8-12" : i === moves.length - 1 ? "3 × 力竭" : "3 × 12-15",
    rest: m.compound ? "90-120 秒" : "60 秒",
    cue: m.cue,
  }));
}

function setCount(ex: Exercise): number {
  return parseInt(ex.setsReps) || 3;
}

// ---------- 部位日模板（用户自选顺序） ----------
type DayType = { name: string; mix: { 蹲: number; 推: number; 拉: number; 髋: number } };

const PART_TPL: Record<string, DayType> = {
  胸: { name: "胸日", mix: { 蹲: 0, 推: 3, 拉: 1, 髋: 0 } },
  背: { name: "背日", mix: { 蹲: 0, 推: 1, 拉: 3, 髋: 0 } },
  肩: { name: "肩日", mix: { 蹲: 0, 推: 3, 拉: 1, 髋: 0 } },
  腿: { name: "腿日", mix: { 蹲: 2, 推: 0, 拉: 0, 髋: 2 } },
  手臂: { name: "手臂日", mix: { 蹲: 0, 推: 2, 拉: 2, 髋: 0 } },
  臀: { name: "臀日", mix: { 蹲: 2, 推: 0, 拉: 0, 髋: 2 } },
  核心: { name: "核心日", mix: { 蹲: 1, 推: 1, 拉: 1, 髋: 1 } },
};

function dayTypes(days: number, parts: string[]): { types: DayType[]; custom: boolean } {
  const valid = parts.filter((p) => PART_TPL[p]);
  if (valid.length > 0) {
    const types = Array.from({ length: days }, (_, i) => PART_TPL[valid[i % valid.length]]);
    return { types, custom: true };
  }
  const full = { 蹲: 1, 推: 1, 拉: 1, 髋: 1 };
  switch (days) {
    case 1:
    case 2:
      return { types: Array.from({ length: days }, () => ({ name: "全身训练", mix: full })), custom: false };
    case 3:
      return {
        types: [
          { name: "全身 A（下肢主导）", mix: { 蹲: 2, 推: 1, 拉: 1, 髋: 1 } },
          { name: "全身 B（上肢主导）", mix: { 蹲: 1, 推: 2, 拉: 2, 髋: 0 } },
          { name: "全身 C（均衡）", mix: full },
        ],
        custom: false,
      };
    case 4:
      return {
        types: [
          { name: "上肢日（胸肩三头）", mix: { 蹲: 0, 推: 3, 拉: 2, 髋: 0 } },
          { name: "下肢日（腿臀）", mix: { 蹲: 2, 推: 0, 拉: 0, 髋: 2 } },
          { name: "上肢日（背二头）", mix: { 蹲: 0, 推: 2, 拉: 3, 髋: 0 } },
          { name: "下肢日（腿核心）", mix: { 蹲: 2, 推: 0, 拉: 0, 髋: 1 } },
        ],
        custom: false,
      };
    case 5:
      return {
        types: [
          { name: "推日（胸肩三头）", mix: { 蹲: 0, 推: 3, 拉: 1, 髋: 0 } },
          { name: "拉日（背二头）", mix: { 蹲: 0, 推: 1, 拉: 3, 髋: 0 } },
          { name: "腿日（蹲为主）", mix: { 蹲: 3, 推: 0, 拉: 0, 髋: 1 } },
          { name: "上肢日（均衡）", mix: { 蹲: 0, 推: 2, 拉: 2, 髋: 0 } },
          { name: "腿日（髋为主）", mix: { 蹲: 1, 推: 0, 拉: 0, 髋: 3 } },
        ],
        custom: false,
      };
    default:
      return {
        types: [
          { name: "推日", mix: { 蹲: 0, 推: 3, 拉: 1, 髋: 0 } },
          { name: "拉日", mix: { 蹲: 0, 推: 1, 拉: 3, 髋: 0 } },
          { name: "腿日", mix: { 蹲: 2, 推: 0, 拉: 0, 髋: 2 } },
          { name: "推日", mix: { 蹲: 0, 推: 3, 拉: 1, 髋: 0 } },
          { name: "拉日", mix: { 蹲: 0, 推: 1, 拉: 3, 髋: 0 } },
          { name: "腿日", mix: { 蹲: 2, 推: 0, 拉: 0, 髋: 2 } },
          ...(days === 7 ? [{ name: "全身+核心（轻量）", mix: { 蹲: 1, 推: 1, 拉: 1, 髋: 1 } }] : []),
        ],
        custom: false,
      };
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

// ---------- 健身餐 / 采购 / 厨具 ----------
function mealPlan(f: FitnessInput, macros: ReturnType<typeof nutrition>): MealPlan {
  const P = macros.protein;
  const wantCut = f.targets.includes("减脂") && !f.targets.includes("增肌");

  // 鸡胸承担蛋白目标的 40%（21g蛋白/100g），其余靠蛋奶
  const chickenDaily = Math.round(((P * 0.4) / 21) * 100 / 50) * 50;
  const chickenWeekly = Math.round((chickenDaily * 7) / 100) / 10;
  const lunchG = chickenDaily >= 200 ? 150 : 100;

  return {
    preWorkout: {
      when: "练前 60-90 分钟",
      items: [
        "香蕉 1 根 + 全麦面包 1 片（快碳供能）",
        "或燕麦 40g 冲泡 + 鸡蛋 1 个",
        "别吃撑，七成饱，练时胃不能胀",
      ],
    },
    postWorkout: {
      when: "练后 30-60 分钟内（最重要的一餐）",
      items: [
        `蛋白质 30g+：鸡胸 150g 或 鸡蛋 3 个 + 牛奶 250ml（或蛋白粉 1 勺）`,
        `碳水 40-60g：米饭 1 碗 / 红薯 200g${wantCut ? "（减脂期碳水减半，蛋白不减）" : ""}`,
        "这餐吃不好，今天训练效果打 6 折",
      ],
    },
    meals: [
      { name: "早餐", items: ["鸡蛋 2 个 + 燕麦 50g", "牛奶 250ml", "香蕉或苹果 1 个"] },
      { name: "午餐", items: [`鸡胸/牛肉 ${lunchG}g`, "米饭 1-1.5 碗", "蔬菜不限量（西兰花/菠菜）"] },
      { name: "加餐（下午）", items: ["希腊酸奶 1 杯 或 鸡蛋白 2 个", "坚果一小把（10g，别多抓）"] },
      { name: "晚餐", items: [`鸡胸/鱼虾 ${lunchG}g`, "红薯 150g 或 米饭半碗", "蔬菜不限量"] },
    ],
    shopping: [
      { item: "鸡胸肉（冷冻）", amount: `${chickenWeekly}kg / 周`, note: "山姆/麦德龙囤一个月更划算" },
      { item: "鸡蛋", amount: "14 个 / 周", note: "每天 2 个，最便宜的蛋白来源" },
      { item: "燕麦", amount: "500g / 2 周", note: "无糖即食款，练前餐主力" },
      { item: "红薯", amount: "1kg / 周", note: "电饭煲一锅蒸，练后慢碳" },
      { item: "大米", amount: "常备", note: "按碳水目标增减" },
      { item: "西兰花/菠菜", amount: "2kg / 周", note: "体积占半盘，撑饱不超标" },
      { item: "香蕉", amount: "7 根 / 周", note: "练前 1 根，快碳" },
      { item: "牛奶", amount: "1.5L / 周", note: "全脂，每天 250ml" },
      { item: "希腊酸奶", amount: "4 杯 / 周", note: "无糖高蛋白，下午加餐" },
    ],
    channels: [
      { name: "钱大妈 / 社区菜市场", why: "鸡胸鸡蛋当日买，最便宜，晚上 8 点后打折" },
      { name: "美团买菜 / 朴朴", why: "30 分钟送到楼下，临时缺货救急，适合周中补菜" },
      { name: "山姆 / 麦德龙", why: "冷冻鸡胸、虾仁按箱囤，均价比零售低 30%，一个月去一次" },
      { name: "京东自营", why: "蛋白粉、肌酸、鱼油、维生素D，只买大牌自营，别买杂牌" },
    ],
    gear: [
      { item: "食物秤", price: "¥20-30", why: "必备。不称重的热量计划全是自欺欺人" },
      { item: "不粘平底锅 24cm", price: "¥60-100", why: "少油煎鸡胸煎蛋，一口锅顶半壁江山" },
      { item: "电饭煲（带蒸笼）", price: "¥100-150", why: "下层米饭上层蒸红薯西兰花鸡胸，一锅出全餐" },
      { item: "密封储物盒 ×3", price: "¥30", why: "周末预处理 3 天的量，工作日直接热" },
      { item: "砧板 + 菜刀", price: "¥50", why: "生熟分开买两块" },
      { item: "摇摇杯", price: "¥20", why: "蛋白粉/牛奶随冲随喝" },
    ],
  };
}

// ---------- 目标体重周期 ----------
function timeline(f: FitnessInput): string {
  const kg = parseFloat(f.profile.weight) || 65;
  const goal = parseFloat(f.profile.goalWeight ?? "");
  if (!goal || Math.abs(goal - kg) < 0.5) return "未设目标体重 · 按长期习惯养成为主";
  const delta = goal - kg;
  const cut = f.targets.includes("减脂") && !f.targets.includes("增肌");
  const weeks = Math.max(2, Math.ceil(Math.abs(delta) / (cut ? 0.35 : 0.25)));
  return `${kg}kg → ${goal}kg（约 ${weeks} 周）`;
}

// ---------- 主生成器 ----------
export function generateFitnessPlan(f: FitnessInput): FitnessPlan {
  const kg = parseFloat(f.profile.weight) || 65;
  const gender = f.profile.gender;
  const macros = nutrition(f);
  const exp = f.profile.exp;

  // 场地与器械池：大肌群日用健身房器械，小肌群/在家日用家庭器械
  const useGym = f.places.includes("健身房");
  const useHome = f.places.includes("家里");
  const gymPool = pool(f.equipment.length ? f.equipment : ["杠铃", "哑铃", "坐姿器械"]);
  const homeEq = f.equipment.filter((e) => ["哑铃", "弹力带", "单双杠", "徒手"].includes(e));
  const homePool = pool(homeEq.length ? homeEq : ["徒手", "弹力带"]);

  const { types, custom } = dayTypes(f.weekdays.length, f.parts);

  const schedule: DayPlan[] = ALL_DAYS.map((d) => {
    const idx = f.weekdays.indexOf(d);
    if (idx === -1) {
      return { day: d, type: "休息", place: "—", slot: "—", minutes: 0, exercises: [] };
    }
    const t = types[idx % types.length];
    // 大肌群日（蹲/推/臀腿量大）去健身房，其余可在家里练省通勤
    const big = t.mix["蹲"] >= 2 || t.mix["推"] >= 3 || t.mix["髋"] >= 3;
    let place: string;
    let moves: Move[];
    if (useGym && useHome) {
      place = big ? "健身房" : "家里";
      moves = big ? gymPool : homePool;
    } else if (useGym) {
      place = "健身房";
      moves = gymPool;
    } else if (useHome) {
      place = "家里";
      moves = homePool;
    } else {
      place = "户外";
      moves = gymPool;
    }
    const slot = f.daySlots?.[d] ?? "暂定";

    const ex: Exercise[] = [
      ...toEx(pick(moves, "蹲", t.mix["蹲"]), exp, kg, gender),
      ...toEx(pick(moves, "推", t.mix["推"]), exp, kg, gender),
      ...toEx(pick(moves, "拉", t.mix["拉"]), exp, kg, gender),
      ...toEx(pick(moves, "髋", t.mix["髋"]), exp, kg, gender),
    ];
    // 每次训练收尾核心
    ex.push({
      name: "平板支撑",
      muscle: "核心",
      startWeight: "自重",
      setsReps: "3 × 45-60 秒",
      rest: "45 秒",
      cue: "收紧腰腹不塌腰，撑不住就停",
    });

    // 预计时长：热身 10 分钟 + 每组约 2.5 分钟（含组间休息）
    const minutes = 10 + ex.reduce((s, e) => s + setCount(e), 0) * 2.5;

    return { day: d, type: t.name, place, slot, minutes: Math.round(minutes / 5) * 5, exercises: ex };
  });

  const gymDays = schedule.filter((d) => d.place === "健身房").length;
  const homeDays = schedule.filter((d) => d.place === "家里").length;

  const notes: string[] = [
    "渐进超负荷：同样的动作，每周比上周多重 2.5kg 或多做 1-2 次，记进记录页——这是进步的唯一证据。",
    `蛋白质 ${macros.protein}g 分 4 餐吃（每餐 ≈${Math.round(macros.protein / 4)}g），练后那餐必须含 30g+。`,
    "每天喝水 = 体重(kg) × 35ml，睡够 7.5 小时。这两条做不到，吃练计划全白搭。",
  ];

  const farPoint = f.gymPoints.find((p) => p.distance.includes("很远"));
  if (farPoint) {
    notes.unshift(
      `⚠️ 健身房距「${farPoint.point}」>5km：通勤会消耗训练意志。建议 ① 换近的健身房；② 或把小肌群日改为在家用弹力带完成。`,
    );
  }
  if (useGym && useHome) {
    notes.push(
      `混合场地已排好：${gymDays} 天去健身房（大肌群），${homeDays} 天在家练（小肌群+核心），照着周排期执行，不用自己纠结今天去哪。`,
    );
  }
  if (f.gymPoints.some((p) => p.point === "学校")) {
    notes.push("从学校出发练：书包里备好速干T恤+水杯，下课直接去，练完再回宿舍——中间一回宿舍就会躺平。");
  }
  if (custom) {
    notes.push("你自选了部位顺序：每个训练日主攻一个部位，收尾的平板支撑保证核心每天都在练。");
  }
  const bf = parseFloat(f.profile.bodyFat);
  if (bf > 0) {
    notes.push(
      `你报的体脂率 ${bf}%：${bf > 20 ? "减脂空间充足，前 4 周重点做热量缺口，力量训练保肌肉。" : bf > 14 ? "体脂已健康，重点做增肌塑形，别再往下砍热量。" : "体脂偏低，直接走增肌盈余路线。"}`,
    );
  }

  return {
    overview: {
      splitName: custom
        ? "自选部位分化"
        : f.weekdays.length <= 2
          ? "全身分化"
          : f.weekdays.length === 3
            ? "全身三分化（A/B/C）"
            : f.weekdays.length === 4
              ? "上下四分化"
              : "推拉腿多分化",
      daysPerWeek: f.weekdays.length,
      gymDays,
      homeDays,
      timeline: timeline(f),
    },
    macros,
    meals: mealPlan(f, macros),
    warmup: [
      "5 分钟提升心率：快走 / 划船机 / 开合跳（微喘但不累）",
      "当天要练的关节动态活动：肩绕环、髋绕环、徒手深蹲各 10 次",
      "第一个动作做 2 组递增组：空杆 × 12 → 50% 重量 × 8，然后进正式组",
    ],
    schedule,
    progression: [
      { week: "第 1 周", focus: "建立基线", how: "按表里「起始重量」开练，找到每个动作 8-12 次接近力竭的实际重量并记下来，别瞎冲。" },
      { week: "第 2-3 周", focus: "线性加重", how: "每周比基线 +2.5kg（小肌群 +1-2 次）。加重后做不满 8 次就退回上一档。" },
      { week: "第 4 周", focus: "减量恢复", how: "重量降 30%，让关节和神经恢复。第 5 周带着新基线继续涨。" },
    ],
    notes,
  };
}
