// 英语考试引擎单元测试
// 运行：node --experimental-strip-types --test tests/english.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateEnglishPlan, type EnglishInput } from "../src/lib/english.ts";

function dateIn(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

// 以江洋雅思备考为基准的输入
function baseInput(overrides: Partial<EnglishInput> = {}): EnglishInput {
  return {
    exam: "雅思",
    level: "中等",
    target: "7.0",
    examDate: dateIn(60),
    hours: "2",
    weak: ["口语", "听力"],
    ...overrides,
  };
}

test("倒计时：天数/周数/总时长正确", () => {
  const p = generateEnglishPlan(baseInput());
  assert.ok(p.overview.daysLeft >= 59 && p.overview.daysLeft <= 61, `${p.overview.daysLeft}`);
  assert.equal(p.overview.weeks, Math.ceil(p.overview.daysLeft / 7));
  assert.equal(p.overview.dailyHours, 2);
  assert.equal(p.overview.totalHours, Math.round(2 * p.overview.daysLeft));
});

test("倒计时钳制：过去的日期 → 1 天；超远日期 → 730 天上限", () => {
  const past = generateEnglishPlan(baseInput({ examDate: dateIn(-5) }));
  assert.equal(past.overview.daysLeft, 1);
  const far = generateEnglishPlan(baseInput({ examDate: dateIn(999) }));
  assert.equal(far.overview.daysLeft, 730);
});

test("hours 解析：非法输入回退 1.5 小时", () => {
  const p = generateEnglishPlan(baseInput({ hours: "abc" }));
  assert.equal(p.overview.dailyHours, 1.5);
});

test("每日任务：词汇锚点永远第一个", () => {
  const p = generateEnglishPlan(baseInput());
  assert.equal(p.daily[0].name, "核心词速刷");
  // 词汇不薄弱 → 维持量 20 分钟
  assert.equal(p.daily[0].minutes, 20);
});

test("每日任务：词汇薄弱 → 加量（>20 且 ≤45）", () => {
  const p = generateEnglishPlan(baseInput({ weak: ["词汇", "口语"] }));
  assert.ok(p.daily[0].minutes > 20 && p.daily[0].minutes <= 45, `${p.daily[0].minutes}`);
});

test("每日任务：薄弱项出现且单任务 ≤45 分钟", () => {
  const p = generateEnglishPlan(baseInput());
  const names = p.daily.map((t) => t.name);
  assert.ok(names.includes("口语输出"), "口语弱应排口语输出");
  assert.ok(names.includes("精听训练"), "听力弱应排精听训练");
  p.daily.forEach((t) => assert.ok(t.minutes <= 45, `${t.name} ${t.minutes}min`));
});

test("每日任务：总时长接近每天投入（误差 ≤15 分钟）", () => {
  const p = generateEnglishPlan(baseInput());
  const sum = p.daily.reduce((s, t) => s + t.minutes, 0);
  assert.ok(Math.abs(sum - 120) <= 15, `合计 ${sum}min`);
});

test("每日任务：每个任务都有具体练法", () => {
  const p = generateEnglishPlan(baseInput());
  p.daily.forEach((t) => assert.ok(t.how.length >= 10, t.name));
});

test("时间少时不硬塞：每天 0.5 小时任务总量 ≤45 分钟", () => {
  const p = generateEnglishPlan(baseInput({ hours: "0.5" }));
  const sum = p.daily.reduce((s, t) => s + t.minutes, 0);
  assert.ok(sum <= 45, `合计 ${sum}min`);
});

test("里程碑：固定三阶段，周数区间衔接", () => {
  const p = generateEnglishPlan(baseInput());
  assert.equal(p.milestones.length, 3);
  assert.match(p.milestones[0].range, /第 1 - \d+ 周/);
  assert.match(p.milestones[2].range, /最后 \d+ 周/);
});

test("notes：雅思+口语弱 → 骨架框架建议", () => {
  const p = generateEnglishPlan(baseInput());
  assert.ok(p.notes.some((n) => n.includes("骨架框架")));
});

test("notes：≤14 天冲刺警告置顶", () => {
  const p = generateEnglishPlan(baseInput({ examDate: dateIn(10) }));
  assert.ok(p.notes[0].includes("⚠️"), `首条: ${p.notes[0]}`);
  assert.ok(p.notes[0].includes("真题模考"));
});

test("notes：基础薄弱 / 四六级 / 考研各有专项建议", () => {
  const weak = generateEnglishPlan(baseInput({ level: "基础薄弱" }));
  assert.ok(weak.notes.some((n) => n.includes("性价比最高的三项")));
  const cet = generateEnglishPlan(baseInput({ exam: "四级" }));
  assert.ok(cet.notes.some((n) => n.includes("35%")));
  const kaoyan = generateEnglishPlan(baseInput({ exam: "考研英语" }));
  assert.ok(kaoyan.notes.some((n) => n.includes("阅读 40 分")));
});

test("notes：非法薄弱项被过滤不崩", () => {
  const p = generateEnglishPlan(baseInput({ weak: ["量子力学", "口语"] }));
  const names = p.daily.map((t) => t.name);
  assert.ok(names.includes("口语输出"));
  assert.ok(!names.some((n) => n.includes("量子")));
});
