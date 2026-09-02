// 健身引擎单元测试
// 运行：node --experimental-strip-types --test tests/fitness.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateFitnessPlan, type FitnessInput } from "../src/lib/fitness.ts";

// 以江洋真实数据为基准的输入
function baseInput(overrides: Partial<FitnessInput> = {}): FitnessInput {
  return {
    targets: ["增肌"],
    parts: ["胸", "背", "腿"],
    places: ["健身房", "家里"],
    gymPoints: [
      { point: "家", distance: "1-3km" },
      { point: "学校", distance: "很近（1km内）" },
    ],
    weekdays: ["周一", "周三", "周六"],
    daySlots: { 周一: "傍晚", 周三: "傍晚", 周六: "暂定" },
    equipment: ["哑铃", "单双杠", "徒手", "杠铃", "坐姿器械"],
    profile: {
      gender: "男",
      age: "23",
      height: "172",
      weight: "60",
      bodyFat: "19.7",
      goalWeight: "68",
      exp: "新手（<6个月）",
    },
    ...overrides,
  };
}

test("周排期：7 天完整，训练日 = 用户选的天，其余休息", () => {
  const p = generateFitnessPlan(baseInput());
  assert.equal(p.schedule.length, 7);
  const training = p.schedule.filter((d) => d.exercises.length > 0);
  assert.deepEqual(training.map((d) => d.day), ["周一", "周三", "周六"]);
  const rest = p.schedule.filter((d) => d.exercises.length === 0);
  assert.equal(rest.length, 4);
  rest.forEach((d) => assert.equal(d.type, "休息"));
});

test("部位顺序：用户点击顺序 = 每周训练顺序", () => {
  const p = generateFitnessPlan(baseInput());
  assert.equal(p.schedule[0].type, "胸日"); // 周一
  assert.equal(p.schedule[2].type, "背日"); // 周三
  assert.equal(p.schedule[5].type, "腿日"); // 周六
  assert.equal(p.overview.splitName, "自选部位分化");
});

test("混合场地：大肌群日去健身房，小肌群日在家", () => {
  const p = generateFitnessPlan(baseInput());
  assert.equal(p.schedule[0].place, "健身房"); // 胸日 推3 → 健身房
  assert.equal(p.schedule[2].place, "家里"); // 背日 拉3 → 家里
  assert.equal(p.schedule[5].place, "健身房"); // 腿日 蹲2髋2 → 健身房
  assert.equal(p.overview.gymDays, 2);
  assert.equal(p.overview.homeDays, 1);
});

test("只选健身房 → 全部训练日在健身房", () => {
  const p = generateFitnessPlan(baseInput({ places: ["健身房"] }));
  p.schedule
    .filter((d) => d.exercises.length > 0)
    .forEach((d) => assert.equal(d.place, "健身房"));
});

test("时段透传：选了就用，没选/暂定就显示暂定", () => {
  const p = generateFitnessPlan(baseInput());
  assert.equal(p.schedule[0].slot, "傍晚");
  assert.equal(p.schedule[5].slot, "暂定");
  const noSlots = generateFitnessPlan(baseInput({ daySlots: {} }));
  assert.equal(noSlots.schedule[0].slot, "暂定");
});

test("每个动作五要素齐全：起始重量 / 组次 / 休息 / 要点 / 肌群", () => {
  const p = generateFitnessPlan(baseInput());
  for (const d of p.schedule) {
    for (const e of d.exercises) {
      assert.ok(e.name, "动作名");
      assert.ok(e.startWeight && e.startWeight !== "NaNkg", `起始重量: ${e.name}`);
      assert.match(e.setsReps, /\d+\s*[×x]/, `组次: ${e.name}`);
      assert.ok(e.rest.includes("秒"), `休息: ${e.name}`);
      assert.ok(e.cue.length >= 6, `动作要点: ${e.name}`);
      assert.ok(e.muscle, `肌群: ${e.name}`);
    }
  }
});

test("每个训练日以平板支撑收尾（核心每天练）", () => {
  const p = generateFitnessPlan(baseInput());
  p.schedule
    .filter((d) => d.exercises.length > 0)
    .forEach((d) =>
      assert.equal(d.exercises[d.exercises.length - 1].name, "平板支撑"),
    );
});

test("起始重量合理：60kg 新手男的哑铃卧推在 5-12.5kg/只 区间", () => {
  const p = generateFitnessPlan(baseInput());
  const bench = p.schedule[0].exercises.find((e) => e.name === "哑铃卧推");
  assert.ok(bench, "胸日应含哑铃卧推");
  const kg = parseFloat(bench.startWeight);
  assert.ok(kg >= 5 && kg <= 12.5, `实际 ${bench.startWeight}`);
  assert.ok(bench.startWeight.includes("/ 只"), "哑铃标注每只重量");
});

test("营养：有体脂率走 Katch-McArdle，增肌 +250", () => {
  const p = generateFitnessPlan(baseInput());
  // BMR = 370 + 21.6 × 60 × (1 - 0.197) ≈ 1411
  assert.ok(Math.abs(p.macros.bmr - 1411) <= 2, `BMR ${p.macros.bmr}`);
  // 3 天/周 → 活动系数 1.375
  assert.equal(p.macros.tdee, Math.round(p.macros.bmr * 1.375));
  assert.equal(p.macros.targetKcal, p.macros.tdee + 250);
  assert.equal(p.macros.protein, 108); // 60 × 1.8
});

test("营养：减脂 -350，无体脂率回退 Mifflin-St Jeor", () => {
  const p = generateFitnessPlan(
    baseInput({ targets: ["减脂"], profile: { ...baseInput().profile, bodyFat: "" } }),
  );
  // Mifflin: 10×60 + 6.25×172 - 5×23 + 5 = 1565
  assert.equal(p.macros.bmr, 1565);
  assert.equal(p.macros.targetKcal, p.macros.tdee - 350);
});

test("健身餐：练前/练后/四餐/采购/渠道/厨具全齐", () => {
  const p = generateFitnessPlan(baseInput());
  assert.ok(p.meals.preWorkout.items.length >= 3);
  assert.ok(p.meals.postWorkout.when.includes("30-60"));
  assert.equal(p.meals.meals.length, 4);
  assert.equal(p.meals.shopping.length, 9);
  assert.equal(p.meals.channels.length, 4);
  assert.equal(p.meals.gear.length, 6);
  // 鸡胸周量与蛋白目标挂钩（108g 蛋白 → 约 1.4kg/周）
  assert.match(p.meals.shopping[0].amount, /1\.\d+kg/);
});

test("目标体重周期：60→68kg 增肌约 32 周", () => {
  const p = generateFitnessPlan(baseInput());
  assert.match(p.overview.timeline, /60kg → 68kg/);
  assert.match(p.overview.timeline, /3[0-9] 周/);
});

test("notes 情境触发：学校出发点 + 体脂率建议", () => {
  const p = generateFitnessPlan(baseInput());
  assert.ok(p.notes.some((n) => n.includes("学校")));
  assert.ok(p.notes.some((n) => n.includes("19.7%")));
});

test("不选部位 → 自动分化（3 天 = 全身 A/B/C）", () => {
  const p = generateFitnessPlan(baseInput({ parts: [] }));
  assert.equal(p.overview.splitName, "全身三分化（A/B/C）");
  const types = p.schedule.filter((d) => d.exercises.length > 0).map((d) => d.type);
  assert.ok(types[0].includes("全身"));
});

test("预估时长合理：训练日 40-90 分钟", () => {
  const p = generateFitnessPlan(baseInput());
  p.schedule
    .filter((d) => d.exercises.length > 0)
    .forEach((d) => {
      assert.ok(d.minutes >= 40 && d.minutes <= 90, `${d.day} ${d.minutes}min`);
    });
});
