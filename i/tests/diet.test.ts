// 三餐食材搭配引擎单元测试
// 运行：node --experimental-strip-types --test tests/diet.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDietPlan, foodLibrary, sumFoods, type Food } from "../src/lib/diet.ts";

// 江洋本人已定方案：55kg / 蛋白 110 / 训练日碳水 220 / 休息日 165 / 脂肪 45
function mine() {
  return buildDietPlan({ protein: 110, carb: 220, fat: 45, targetKcal: 1944, carbRest: 165 });
}

test("三餐齐全：早 / 中 / 晚，每餐都有目标宏量", () => {
  const d = mine();
  assert.deepEqual(
    d.meals.map((m) => m.key),
    ["breakfast", "lunch", "dinner"],
  );
  for (const m of d.meals) {
    assert.ok(m.target.kcal > 0 && m.target.p > 0 && m.target.c > 0 && m.target.f > 0, `${m.title} 目标缺失`);
    // 目标热量 = 三大宏量折算
    assert.equal(m.target.kcal, m.target.p * 4 + m.target.c * 4 + m.target.f * 9);
  }
});

test("每餐四组齐全：蛋白质 / 碳水 / 脂肪 / 蔬菜，且每组都有可选项", () => {
  const d = mine();
  for (const m of d.meals) {
    for (const role of ["蛋白", "碳水", "脂肪", "蔬菜"]) {
      const g = m.groups.find((x) => x.role === role);
      assert.ok(g, `${m.title} 缺少「${role}」组`);
      assert.ok(g!.options.length >= 2, `${m.title}「${role}」选项太少`);
      for (const o of g!.options) {
        assert.ok(o.name && o.portion, `${m.title}/${role} 选项缺名称或份量`);
        assert.ok(o.kcal > 0, `${m.title}/${role} ${o.name} 热量异常`);
      }
    }
  }
});

test("推荐组合落在本餐目标附近（热量 ±20%，蛋白 ±30%）", () => {
  const d = mine();
  for (const m of d.meals) {
    const t = m.combo.total;
    const kcalGap = Math.abs(t.kcal - m.target.kcal) / m.target.kcal;
    assert.ok(kcalGap <= 0.2, `${m.title} 组合热量偏离 ${(kcalGap * 100).toFixed(0)}%：${t.kcal} vs ${m.target.kcal}`);
    const pGap = Math.abs(t.p - m.target.p) / m.target.p;
    assert.ok(pGap <= 0.3, `${m.title} 组合蛋白偏离 ${(pGap * 100).toFixed(0)}%：${t.p} vs ${m.target.p}`);
  }
});

test("全天合计对齐已定方案：蛋白 ≈110g / 碳水 ≈220g / 脂肪 ≈45g", () => {
  const d = mine();
  assert.ok(Math.abs(d.comboTotal.p - 110) <= 8, `蛋白 ${d.comboTotal.p}`);
  assert.ok(Math.abs(d.comboTotal.c - 220) <= 15, `碳水 ${d.comboTotal.c}`);
  assert.ok(Math.abs(d.comboTotal.f - 45) <= 6, `脂肪 ${d.comboTotal.f}`);
  // 全天组合热量应低于计划目标热量（差额 = 减脂缺口）
  assert.ok(d.comboTotal.kcal < d.target.kcal, `组合 ${d.comboTotal.kcal} 应低于目标 ${d.target.kcal}`);
  // 规则里要出现 蛋白封顶/碳水补足/脂肪保底 三条口径
  const rules = d.rules.join("\n");
  assert.ok(rules.includes("蛋白质目标") && rules.includes("别再自己加粉"));
  assert.ok(rules.includes("碳水补足") && rules.includes("脂肪保底"));
  assert.ok(d.rules.some((x) => x.includes("165"))); // 休息日碳水参考值
});

test("新买的三样（虾仁 / 彩椒 / 西兰花）已入库并标 fresh", () => {
  const d = mine();
  const lib = foodLibrary().flatMap((g) => g.items);
  for (const name of ["虾仁", "彩椒", "西兰花"]) {
    const hit = lib.find((f) => f.name.includes(name));
    assert.ok(hit, `食材库缺少 ${name}`);
    assert.equal(hit!.fresh, true, `${name} 未标记为新买`);
  }
  // 彩椒 / 西兰花要真的能出现在搭配选项里
  const optionNames = d.meals.flatMap((m) => m.groups.flatMap((g) => g.options.map((o) => o.name)));
  assert.ok(optionNames.some((n) => n.includes("彩椒")));
  assert.ok(optionNames.some((n) => n.includes("西兰花")));
  assert.ok(d.meals.some((m) => m.groups.some((g) => g.options.some((o) => o.name.includes("虾仁")))));
});

test("数据自洽：sumFoods 逐项相加，单项宏量不为负", () => {
  const a: Food = { role: "蛋白", name: "x", portion: "1", p: 1.4, c: 2.6, f: 0.4, kcal: 20 };
  const b: Food = { role: "碳水", name: "y", portion: "1", p: 0.4, c: 3.4, f: 0.4, kcal: 20 };
  assert.deepEqual(sumFoods([a, b]), { kcal: 40, p: 2, c: 6, f: 1 });
  for (const g of foodLibrary()) {
    for (const f of g.items) {
      assert.ok(f.p >= 0 && f.c >= 0 && f.f >= 0 && f.kcal > 0, `${f.name} 数值异常`);
    }
  }
});

test("练前 / 练后 / 加餐口径都在", () => {
  const d = mine();
  assert.ok(d.pre.items.length >= 3 && d.pre.when.includes("练前"));
  assert.ok(d.post.items.length >= 3 && d.post.when.includes("30 分钟"));
  assert.ok(d.snack.items.length >= 3);
});
