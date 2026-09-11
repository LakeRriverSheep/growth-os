// 三餐食材搭配引擎
// 设计目标：不再维护「每天吃什么」的逐条清单，改成「从自己的食材库里按宏量营养素拼餐」。
// 每一餐 = 蛋白质 1 份 + 碳水 1 份 + 蔬菜管饱 + 脂肪按需。
// 食材全部来自用户真实库存（冰箱采购清单），新买的虾仁 / 彩椒 / 西兰花标 fresh。

export type FoodRole = "蛋白" | "碳水" | "脂肪" | "蔬菜";

export type Food = {
  name: string;
  portion: string;
  p: number; // 蛋白质 g
  c: number; // 碳水 g
  f: number; // 脂肪 g
  kcal: number;
  role: FoodRole;
  /** 最近新买的食材（虾仁 / 彩椒 / 西兰花） */
  fresh?: boolean;
  note?: string;
};

export type MacroTarget = { kcal: number; p: number; c: number; f: number };

export type MealGroup = {
  role: FoodRole;
  label: string;
  /** 这一组吃几份 */
  pick: string;
  options: Food[];
};

export type MealPairing = {
  key: "breakfast" | "lunch" | "dinner";
  title: string;
  emoji: string;
  time: string;
  target: MacroTarget;
  groups: MealGroup[];
  combo: { label: string; foods: Food[]; total: MacroTarget };
  tip: string;
};

export type DietPlan = {
  meals: MealPairing[];
  /** 推荐组合的合计（≈ 全天吃进去的量） */
  comboTotal: MacroTarget;
  /** 计划目标（来自体能/目标计算） */
  target: MacroTarget;
  rules: string[];
  pre: { when: string; items: string[] };
  post: { when: string; items: string[] };
  snack: { title: string; items: string[] };
};

// ---------- 构造助手 ----------
function food(
  role: FoodRole,
  name: string,
  portion: string,
  p: number,
  c: number,
  f: number,
  kcal: number,
  fresh = false,
): Food {
  return { role, name, portion, p, c, f, kcal, fresh };
}

const r = Math.round;

export function sumFoods(foods: Food[]): MacroTarget {
  const t = foods.reduce(
    (a, x) => ({ kcal: a.kcal + x.kcal, p: a.p + x.p, c: a.c + x.c, f: a.f + x.f }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
  return { kcal: r(t.kcal), p: r(t.p), c: r(t.c), f: r(t.f) };
}

// ---------- 食材库（＝ 推荐组合里可选项，按份量给好数字） ----------
// 换算基准：全蛋 72kcal/个·P6.3·F5；生鸡胸 118kcal/100g·P23；瘦牛肉 P21/100g；
// 鱼虾 P18-20/100g；熟米饭 26g 碳水+116kcal/100g；红薯 20g 碳水+86kcal/100g；
// 燕麦干 66g 碳水+389kcal/100g；ON 乳清 1 勺 120kcal·P24。

// 早餐推荐组合用的一份（2 全蛋 + 半勺粉：蛋白够、脂肪比 3 全蛋少 4g）
const EGG2 = food("蛋白", "全蛋 + 蛋白粉", "2 个 + 半勺", 24.6, 2.3, 10.8, 204);

const PROTEIN_OPTIONS: Food[] = [
  food("蛋白", "全蛋", "3 个", 18.9, 1.2, 15.0, 216),
  EGG2,
  food("蛋白", "全蛋 + 全脂牛奶", "2 个 + 250ml", 20.6, 12.8, 18.0, 300),
  food("蛋白", "无糖希腊酸奶 + 蛋白粉", "150g + 半勺", 27.0, 7.5, 5.3, 188),
  food("蛋白", "ON 乳清蛋白粉 + 全脂牛奶", "1 勺 + 250ml", 32.0, 15.0, 9.5, 275),
  food("蛋白", "即食鸡胸（应急兜底）", "1 袋", 22.0, 2.0, 2.0, 115),
];

const CARB_OPTIONS: Food[] = [
  food("碳水", "燕麦（干重）", "50g", 6.5, 33.0, 4.0, 188),
  food("碳水", "全麦面包", "2 片 96g", 8.0, 48.0, 3.0, 250),
  food("碳水", "红薯", "200g", 3.5, 40.0, 0.4, 172),
  food("碳水", "香蕉", "1 根", 1.3, 23.0, 0.3, 90),
  food("碳水", "蓝莓 / 混合莓（冷冻）", "50g", 0.4, 7.0, 0.2, 28),
];

const FAT_OPTIONS: Food[] = [
  food("脂肪", "坚果（每日坚果）", "10g 小半包", 2.0, 2.0, 5.5, 65),
  food("脂肪", "牛油果", "半个 70g", 1.0, 6.0, 10.0, 120),
  food("脂肪", "炒菜油", "5g 一茶匙", 0, 0, 5.0, 45),
  food("脂肪", "炒菜油", "15g 三茶匙", 0, 0, 15.0, 135),
];

const VEG_OPTIONS: Food[] = [
  food("蔬菜", "彩椒", "100g", 1.0, 6.0, 0.3, 30, true),
  food("蔬菜", "西兰花", "150g", 4.0, 7.0, 0.6, 50, true),
  food("蔬菜", "混合蔬菜（冷冻）", "150g", 3.0, 9.0, 0.3, 50),
  food("蔬菜", "菠菜 / 生菜 / 黄瓜 / 番茄", "200g 管饱", 2.0, 5.0, 0.4, 35),
];

// 中餐 / 晚餐用的主食与蛋白（份量更大）
const LUNCH_PROTEIN: Food[] = [
  food("蛋白", "鸡胸肉（生）", "150g", 34.5, 0, 3.8, 177),
  food("蛋白", "虾仁", "150g", 30.0, 1.5, 1.5, 135, true),
  food("蛋白", "瘦牛肉（牛腱 / 里脊）", "150g", 31.5, 0, 6.0, 180),
  food("蛋白", "龙利鱼 / 巴沙鱼", "180g", 32.4, 0, 3.6, 162),
  food("蛋白", "北豆腐 + 鸡蛋白", "200g + 2 个", 31.2, 6.4, 12.2, 254),
];

const LUNCH_CARB: Food[] = [
  food("碳水", "熟米饭", "300g", 7.8, 78.0, 1.0, 348),
  food("碳水", "红薯", "300g", 5.2, 60.0, 0.6, 258),
  food("碳水", "糙米饭（熟）", "250g", 7.5, 75.0, 2.5, 350),
  food("碳水", "全麦贝果 + 香蕉", "1 个 + 1 根", 11.3, 73.0, 2.3, 350),
];

const DINNER_PROTEIN: Food[] = [
  food("蛋白", "虾仁", "120g", 24.0, 1.2, 1.2, 108, true),
  food("蛋白", "龙利鱼 / 巴沙鱼", "180g", 32.4, 0, 3.6, 162),
  food("蛋白", "鸡胸肉（生）", "120g", 27.6, 0, 3.0, 142),
  food("蛋白", "北豆腐 + 鸡蛋白", "200g + 2 个", 31.2, 6.4, 12.2, 254),
  food("蛋白", "瘦牛肉（牛腱 / 里脊）", "120g", 25.2, 0, 4.8, 144),
];

const DINNER_CARB: Food[] = [
  food("碳水", "红薯", "300g", 5.2, 60.0, 0.6, 258),
  food("碳水", "熟米饭", "200g", 5.2, 52.0, 0.6, 232),
  food("碳水", "糙米饭（熟）", "200g", 6.0, 60.0, 2.0, 280),
  food("碳水", "全麦面包 + 香蕉", "1 片 + 1 根", 5.3, 47.0, 1.8, 215),
];

// 晚餐脂肪档（含 5g 炒菜油的小份）
const DINNER_FAT: Food[] = [
  food("脂肪", "坚果 + 炒菜油", "10g + 5g", 2.0, 2.0, 10.5, 110),
  food("脂肪", "炒菜油", "10g 两茶匙", 0, 0, 10.0, 90),
  food("脂肪", "牛油果", "半个 70g", 1.0, 6.0, 10.0, 120),
];

// 推荐组合里直接引用的单品（避免上面选项改份量时组合跟着错）
const COMBO: Record<string, Food> = {
  egg2whey: EGG2,
  oat50: CARB_OPTIONS[0],
  blueberry50: CARB_OPTIONS[4],
  pepper100: VEG_OPTIONS[0],
  broccoli150: VEG_OPTIONS[1],
  nuts10: FAT_OPTIONS[0],
  oil5: FAT_OPTIONS[2],
  chicken150: LUNCH_PROTEIN[0],
  rice300: LUNCH_CARB[0],
  oil15: FAT_OPTIONS[3],
  shrimp120: DINNER_PROTEIN[0],
  sweetPotato300: DINNER_CARB[0],
};

// ---------- 三餐配比 ----------
// 蛋白：早 30% / 中 40% / 晚 30%（每餐 30-40g 吸收效率最高）
// 碳水：早 25% / 中 42% / 晚 33%（中餐是训练供能主力）
// 脂肪：早 30% / 中 40% / 晚 30%
const RATIO = {
  breakfast: { p: 0.3, c: 0.25, f: 0.3 },
  lunch: { p: 0.4, c: 0.42, f: 0.4 },
  dinner: { p: 0.3, c: 0.33, f: 0.3 },
} as const;

function mealTarget(key: keyof typeof RATIO, p: number, c: number, f: number): MacroTarget {
  const rt = RATIO[key];
  const mp = r(p * rt.p);
  const mc = r(c * rt.c);
  const mf = r(f * rt.f);
  return { p: mp, c: mc, f: mf, kcal: mp * 4 + mc * 4 + mf * 9 };
}

function combo(label: string, foods: Food[]) {
  return { label, foods, total: sumFoods(foods) };
}

// ---------- 主生成器 ----------
export type DietMacros = {
  protein: number;
  carb: number;
  fat: number;
  targetKcal: number;
  carbRest?: number;
};

export function buildDietPlan(m: DietMacros): DietPlan {
  const { protein: P, carb: C, fat: F } = m;
  const carbRest = m.carbRest ?? r(C * 0.75);

  const breakfast: MealPairing = {
    key: "breakfast",
    title: "早餐",
    emoji: "🍳",
    time: "07:00",
    target: mealTarget("breakfast", P, C, F),
    groups: [
      { role: "蛋白", label: "蛋白质（选 1 份）", pick: "1 份", options: PROTEIN_OPTIONS },
      { role: "碳水", label: "碳水（选 1-2 份）", pick: "1-2 份", options: CARB_OPTIONS },
      { role: "脂肪", label: "脂肪（不够才加）", pick: "按需", options: FAT_OPTIONS },
      { role: "蔬菜", label: "蔬菜（管饱）", pick: "不限", options: VEG_OPTIONS.slice(0, 2) },
    ],
    combo: combo("全蛋 2 个 + 蛋白粉半勺 + 燕麦 50g + 蓝莓 50g + 彩椒 100g", [
      COMBO.egg2whey,
      COMBO.oat50,
      COMBO.blueberry50,
      COMBO.pepper100,
    ]),
    tip: "早餐不要吃满 3 个全蛋：2 个全蛋 + 半勺蛋白粉，蛋白一样够、脂肪少 4g（每个蛋黄 5g 脂肪）。",
  };

  const lunch: MealPairing = {
    key: "lunch",
    title: "中餐",
    emoji: "🍚",
    time: "12:00",
    target: mealTarget("lunch", P, C, F),
    groups: [
      { role: "蛋白", label: "蛋白质（选 1 份）", pick: "1 份", options: LUNCH_PROTEIN },
      { role: "碳水", label: "碳水（选 1 份）", pick: "1 份", options: LUNCH_CARB },
      { role: "脂肪", label: "脂肪（炒菜油算在内）", pick: "1 份", options: DINNER_FAT },
      { role: "蔬菜", label: "蔬菜（管饱）", pick: "不限", options: [VEG_OPTIONS[1], VEG_OPTIONS[0], VEG_OPTIONS[2]] },
    ],
    combo: combo("鸡胸肉 150g + 熟米饭 300g + 西兰花 150g + 彩椒 100g + 炒菜油 15g", [
      COMBO.chicken150,
      COMBO.rice300,
      COMBO.broccoli150,
      COMBO.pepper100,
      COMBO.oil15,
    ]),
    tip: "全天最大的一餐，主食给足——碳水不够下午必崩，别在这餐省米饭。",
  };

  const dinner: MealPairing = {
    key: "dinner",
    title: "晚餐",
    emoji: "🥗",
    time: "17:30",
    target: mealTarget("dinner", P, C, F),
    groups: [
      { role: "蛋白", label: "蛋白质（选 1 份）", pick: "1 份", options: DINNER_PROTEIN },
      { role: "碳水", label: "碳水（选 1 份）", pick: "1 份", options: DINNER_CARB },
      { role: "脂肪", label: "脂肪（选 1 份）", pick: "1 份", options: DINNER_FAT },
      { role: "蔬菜", label: "蔬菜（管饱）", pick: "不限", options: [VEG_OPTIONS[1], VEG_OPTIONS[0], VEG_OPTIONS[3]] },
    ],
    combo: combo("虾仁 120g + 红薯 300g + 西兰花 150g + 彩椒 100g + 坚果 10g + 炒菜油 5g", [
      COMBO.shrimp120,
      COMBO.sweetPotato300,
      COMBO.broccoli150,
      COMBO.pepper100,
      COMBO.nuts10,
      COMBO.oil5,
    ]),
    tip: "晚餐蛋白不用堆太多（30g 左右足够），把额度留给主食和蔬菜；睡前 2 小时吃完。",
  };

  const meals = [breakfast, lunch, dinner];
  const comboTotal: MacroTarget = meals.reduce(
    (a, x) => ({
      kcal: a.kcal + x.combo.total.kcal,
      p: a.p + x.combo.total.p,
      c: a.c + x.combo.total.c,
      f: a.f + x.combo.total.f,
    }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );

  const gap = m.targetKcal - comboTotal.kcal;
  const rules = [
    `蛋白质目标 ${P}g（区间 ${Math.round(P * 0.9)}-${Math.round(P * 1.1)}g）：超出需求的蛋白不会变成肌肉，只会被氧化掉——别再自己加粉、加即食鸡胸往上堆。`,
    `碳水补足：训练日 ≈${C}g，休息日降到 ≈${carbRest}g。主食（米饭 / 燕麦 / 红薯）是练得动的燃料，砍碳水比砍蛋白伤得多。`,
    `脂肪保底 ≥${F}g：脂溶性维生素（你在补 D3）+ 必需脂肪酸要靠它。全蛋 / 牛奶 / 坚果 / 炒菜油天然就能凑够，不用额外吃油。`,
    "每餐按「蛋白 1 份 + 碳水 1 份 + 蔬菜管饱 + 脂肪按需」拼，不要一餐只堆蛋白。",
    `全天按搭配吃下来 ≈${comboTotal.kcal}kcal（蛋白 ${comboTotal.p}g / 碳水 ${comboTotal.c}g / 脂肪 ${comboTotal.f}g）${
      gap > 0 ? `，比目标 ${m.targetKcal}kcal 少 ${gap}kcal，这部分就是减脂的温和缺口` : ""
    }。`,
  ];

  return {
    meals,
    comboTotal,
    target: { kcal: m.targetKcal, p: P, c: C, f: F },
    rules,
    pre: {
      when: "练前 60 分钟",
      items: [
        "碳水 40-50g：香蕉 1 根 + 燕麦 30g（或全麦面包 1 片）",
        "蛋白少量：鸡蛋白 2 个 或 蛋白粉半勺，别吃撑",
        "七成饱就够，练时胃不能胀",
      ],
    },
    post: {
      when: "练后 30 分钟内（最重要的一餐）",
      items: [
        "蛋白粉 1 勺（30.4g，24g 蛋白）随水或牛奶喝掉",
        "快碳 40-50g：香蕉 1 根 或 熟米饭 150g 或 燕麦 40g",
        "别拖到回家再做正餐，30 分钟内先补上；这餐吃不好，今天训练效果打 6 折",
      ],
    },
    snack: {
      title: "下午加餐（可选）",
      items: [
        "只在正餐没吃够时补，按缺什么补什么：缺蛋白 → 希腊酸奶 150g / 蛋白粉半勺",
        "缺碳水 → 香蕉 1 根 / 苹果 1 个 / 燕麦 30g",
        "别把加餐变成第四顿大餐（坚果一小把 10g 就到顶）",
      ],
    },
  };
}

// ---------- 食材库总表（底部「我的食材库」用，按 100g / 单份给基准值） ----------
export function foodLibrary(): { role: FoodRole; label: string; items: Food[] }[] {
  return [
    {
      role: "蛋白",
      label: "蛋白质来源",
      items: [
        food("蛋白", "全蛋", "1 个 50g", 6.3, 0.4, 5.0, 72),
        food("蛋白", "鸡蛋白", "1 个 33g", 3.6, 0.2, 0.1, 17),
        food("蛋白", "鸡胸肉（生）", "100g", 23.0, 0, 2.5, 118),
        food("蛋白", "虾仁", "100g", 20.0, 1.0, 1.0, 90, true),
        food("蛋白", "瘦牛肉（牛腱 / 里脊，生）", "100g", 21.0, 0, 4.0, 120),
        food("蛋白", "龙利鱼 / 巴沙鱼", "100g", 18.0, 0, 2.0, 90),
        food("蛋白", "即食鸡胸（应急兜底）", "100g", 22.0, 2.0, 2.0, 115),
        food("蛋白", "北豆腐", "100g", 12.0, 3.0, 6.0, 110),
        food("蛋白", "全脂牛奶", "250ml", 8.0, 12.0, 8.0, 155),
        food("蛋白", "无糖希腊酸奶", "100g", 10.0, 4.0, 3.0, 85),
        food("蛋白", "ON 乳清蛋白粉", "1 勺 30.4g", 24.0, 3.0, 1.5, 120),
      ],
    },
    {
      role: "碳水",
      label: "碳水来源（优先这几种）",
      items: [
        food("碳水", "燕麦（干重）", "100g", 13.0, 66.0, 8.0, 389),
        food("碳水", "熟米饭", "100g", 2.6, 26.0, 0.3, 116),
        food("碳水", "红薯", "100g", 1.7, 20.0, 0.2, 86),
        food("碳水", "糙米饭（熟）", "100g", 3.0, 30.0, 1.0, 140),
        food("碳水", "全麦面包", "100g", 8.3, 50.0, 3.1, 260),
        food("碳水", "全麦贝果", "1 个 100g", 10.0, 50.0, 2.0, 260),
        food("碳水", "香蕉", "1 根 可食 100g", 1.3, 23.0, 0.3, 90),
        food("碳水", "苹果", "1 个 200g", 0.5, 26.0, 0.4, 108),
        food("碳水", "蓝莓 / 混合莓（冷冻）", "100g", 0.7, 14.0, 0.3, 57),
      ],
    },
    {
      role: "脂肪",
      label: "脂肪来源（够量就停）",
      items: [
        food("脂肪", "蛋黄", "1 个（全蛋自带）", 2.7, 0.3, 5.0, 60),
        food("脂肪", "坚果（每日坚果）", "10g", 2.0, 2.0, 5.5, 65),
        food("脂肪", "炒菜油", "5g 一茶匙", 0, 0, 5.0, 45),
        food("脂肪", "牛油果", "半个 70g", 1.0, 6.0, 10.0, 120),
      ],
    },
    {
      role: "蔬菜",
      label: "蔬菜（管饱，不记账）",
      items: [
        food("蔬菜", "西兰花", "100g", 2.7, 4.7, 0.4, 34, true),
        food("蔬菜", "彩椒", "100g", 1.0, 6.0, 0.3, 30, true),
        food("蔬菜", "混合蔬菜（冷冻）", "100g", 2.0, 6.0, 0.2, 34),
        food("蔬菜", "菠菜 / 生菜 / 黄瓜 / 番茄", "100g", 1.0, 3.0, 0.2, 18),
      ],
    },
  ];
}
