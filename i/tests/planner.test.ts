// 周计划：日期 / 课表周次 / 时间轴布局 单元测试
// 运行：node --experimental-strip-types --test tests/planner.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, mondayOf, termWeek, weekdayCn, weekdayIndex } from "../src/lib/date.ts";
import {
  courseOnWeek,
  coursesOnDate,
  parseWeeks,
  CLASS_SCHEDULE,
  PERIOD_TIME,
} from "../src/lib/schedule.ts";
import {
  axisRange,
  buildDay,
  layoutColumn,
  parityLabel,
  pctHeight,
  pctTop,
  eventsForDate,
  type PlanEvent,
} from "../src/lib/planner.ts";

test("学期周次：9/14（周一）是第 3 周，今天 9/17 也在第 3 周", () => {
  assert.equal(weekdayCn("2026-09-14"), "周一");
  assert.equal(termWeek("2026-09-14"), 3);
  assert.equal(termWeek("2026-09-17"), 3); // 周四，同一周
  assert.equal(termWeek("2026-09-20"), 3); // 周日，同一周
  assert.equal(termWeek("2026-09-21"), 4); // 下周一
  assert.equal(termWeek("2026-08-31"), 1); // 第 1 周周一
});

test("日期工具：周一索引 / 取本周一 / 加减天", () => {
  assert.equal(weekdayIndex("2026-09-14"), 0);
  assert.equal(weekdayIndex("2026-09-20"), 6);
  assert.equal(mondayOf("2026-09-17"), "2026-09-14");
  assert.equal(mondayOf("2026-09-14"), "2026-09-14");
  assert.equal(addDays("2026-09-14", 6), "2026-09-20");
  assert.equal(addDays("2026-09-14", -7), "2026-09-07");
});

test("周次解析：连上 / 单周 / 双周", () => {
  assert.deepEqual(parseWeeks("3-19"), { from: 3, to: 19, parity: 0 });
  assert.deepEqual(parseWeeks("4-18双"), { from: 4, to: 18, parity: 2 });
  assert.deepEqual(parseWeeks("3-9单"), { from: 3, to: 9, parity: 1 });
  assert.deepEqual(parseWeeks("7-8"), { from: 7, to: 8, parity: 0 });
});

test("单双周过滤：范围外的周不上课", () => {
  const algo = CLASS_SCHEDULE.find((c) => c.id === "mon1")!; // 算法设计与分析 4-18双
  assert.equal(courseOnWeek(algo, 3), false); // 第 3 周是单周
  assert.equal(courseOnWeek(algo, 4), true);
  assert.equal(courseOnWeek(algo, 5), false);
  assert.equal(courseOnWeek(algo, 18), true); // 上界内含
  assert.equal(courseOnWeek(algo, 19), false); // 范围外
  assert.equal(courseOnWeek(algo, 2), false); // 范围外

  const java = CLASS_SCHEDULE.find((c) => c.id === "mon4")!; // Java EE 3-19 每周
  assert.equal(courseOnWeek(java, 3), true);
  assert.equal(courseOnWeek(java, 4), true);
  assert.equal(courseOnWeek(java, 2), false);
});

test("按日期取课：第 3 周周一是 3 门、周四是 1 门（单双周生效）", () => {
  // 周一：算法(3-19)、AI 数学基础(3-19)、Java EE(3-19)；算法 mon1 是双周 → 不上
  const mon = coursesOnDate("2026-09-14");
  assert.deepEqual(
    mon.map((c) => c.name),
    ["算法设计与分析", "人工智能数学基础", "Java EE企业级开发"],
  );

  // 周四：就业指导(11-19)不上、近代史(4-18双，第3周单周)不上 → 只剩形势与政策5(3-9单)
  const thu = coursesOnDate("2026-09-17");
  assert.deepEqual(
    thu.map((c) => c.name),
    ["形势与政策5"],
  );

  // 第 4 周周四：近代史是双周 → 上；形势与政策 3-9 单 → 不上
  const thu4 = coursesOnDate("2026-09-24");
  assert.deepEqual(
    thu4.map((c) => c.name),
    ["中国近代史纲要"],
  );

  // 周五没课
  assert.deepEqual(coursesOnDate("2026-09-18"), []);
});

test("时间轴换算：05:00–23:00 映射成 0–100%", () => {
  assert.equal(pctTop(5 * 60), 0);
  assert.equal(pctTop(14 * 60), 50); // 14:00 正好在正中间
  assert.equal(pctTop(23 * 60), 100);
  assert.equal(pctHeight(14 * 60, 15 * 60), 100 / 18);
});

test("时间轴钳制：超出 05:00–23:00 的部分被裁掉，完全在外则不渲染", () => {
  assert.deepEqual(axisRange("08:20", "10:00"), { s: 500, e: 600 });
  assert.deepEqual(axisRange("04:30", "06:00"), { s: 300, e: 360 }); // 起点钳到 5:00
  assert.deepEqual(axisRange("22:00", "23:30"), { s: 1320, e: 1380 }); // 终点钳到 23:00
  assert.equal(axisRange("00:00", "04:00"), null);
  assert.equal(axisRange("23:30", "23:50"), null);
  assert.deepEqual(axisRange("09:00", "09:00"), { s: 540, e: 570 }); // 异常时长兜底 30 分钟
});

test("重叠布局：同时段的日程并排，不重叠的各占满宽", () => {
  const placed = layoutColumn([
    { start: "09:00", end: "10:00" },
    { start: "09:30", end: "10:30" },
    { start: "10:15", end: "11:00" },
  ]);
  assert.deepEqual(
    placed.map((p) => [p.col, p.cols]),
    [
      [0, 2],
      [1, 2],
      [0, 2],
    ],
  );

  const apart = layoutColumn([
    { start: "08:00", end: "09:00" },
    { start: "09:00", end: "10:00" },
  ]);
  assert.deepEqual(
    apart.map((p) => [p.col, p.cols]),
    [
      [0, 1],
      [0, 1],
    ],
  );
});

test("每周重复的日程：按星期几命中，单次日程只命中当天", () => {
  const evs: PlanEvent[] = [
    // 周四创建 → 之后每个周四都出现
    { id: 1, date: "2026-09-17", start: "06:30", end: "08:00", title: "训练", kind: "train", note: "", weekly: true },
    // 单次：只在 9/17
    { id: 2, date: "2026-09-17", start: "21:00", end: "22:00", title: "复盘", kind: "life", note: "", weekly: false },
  ];
  assert.deepEqual(
    eventsForDate("2026-09-17", evs).map((e) => e.id),
    [1, 2], // 当天：两个都在
  );
  assert.deepEqual(
    eventsForDate("2026-09-24", evs).map((e) => e.id),
    [1], // 下个周四：只剩每周重复的那个
  );
  assert.deepEqual(eventsForDate("2026-09-21", evs).map((e) => e.id), []); // 周一：都不命中
});

test("buildDay：课程与自定义日程合并，既带定位也带可编辑原对象", () => {
  const courses = [
    {
      id: "wed1",
      name: "软件工程",
      teacher: "甘利",
      place: "图书馆5楼5机房",
      start: "08:20",
      end: "10:00",
      weeks: "3-19",
    },
  ];
  const events: PlanEvent[] = [
    { id: 9, date: "2026-09-16", start: "10:00", end: "11:00", title: "自习", kind: "study", note: "算法", weekly: false },
  ];

  const blocks = buildDay("2026-09-16", courses, events);
  assert.equal(blocks.length, 2);

  const [cls, own] = blocks;
  assert.equal(cls.title, "软件工程");
  assert.equal(cls.kind, "class");
  assert.equal(cls.event, null); // 课表来的不可编辑
  assert.equal(cls.top, pctTop(500));
  assert.equal(cls.height, pctHeight(500, 600));

  assert.equal(own.title, "自习");
  assert.equal(own.event?.id, 9); // 自己排的带原对象，点击可编辑
  assert.equal(own.sub, "算法");
});

test("作息时间：第 9-10 节是 19:00–20:30（19:30–21:20 是「大一晚修」，专升本不适用）", () => {
  assert.deepEqual(PERIOD_TIME["9-10"], ["19:00", "20:30"]);
  assert.deepEqual(PERIOD_TIME["1-2"], ["08:20", "10:00"]);
  assert.deepEqual(PERIOD_TIME["3-4"], ["10:20", "12:00"]);
  assert.deepEqual(PERIOD_TIME["5-6"], ["14:30", "16:10"]);
  assert.deepEqual(PERIOD_TIME["7-8"], ["16:30", "18:10"]);

  const tue = coursesOnDate("2026-09-15");
  const java = tue.find((c) => c.name.startsWith("Java"))!;
  assert.equal(java.start, "19:00");
  assert.equal(java.end, "20:30");

  const thu = coursesOnDate("2026-09-17");
  assert.equal(thu[0].start, "19:00"); // 形势与政策5 也是 9-10 节
  assert.equal(thu[0].end, "20:30");
});

// ── 金标准：把课表逐格钉死 ─────────────────────────────────────
// 对照源：26软件工程（专升本）2026 秋季学期课表（含 9/16 教室调整）
// 第 3 周（9/14-9/18，单周）；周五起无课
const GOLDEN_WEEK3: Record<string, string[]> = {
  "2026-09-14": [
    // 算法设计与分析 1-2 节是「双周 4-18」→ 第 3 周（单周）不排
    "3-4 算法设计与分析 赵小蕾 图书馆6楼11机房 3-19",
    "5-6 人工智能数学基础 吴志寒 图书馆506 3-19",
    "9-10 Java EE企业级开发 黄勇 图书馆5楼4机房 3-19",
  ],
  "2026-09-15": [
    "3-4 人工智能数学基础 吴志寒 图书馆506 3-19",
    // 国家安全教育「仅 7-8 周」→ 第 3 周不排
    "9-10 Java EE企业级开发 黄勇 图书馆5楼4机房 3-19",
  ],
  "2026-09-16": [
    "1-2 软件工程 甘利 图书馆5楼5机房 3-19", // 9/16 起由 16机房 调整为 5机房
    "3-4 软件工程 甘利 图书馆5楼5机房 3-19",
    "5-6 中国近代史纲要 彭语嫣 明德楼601 3-18",
    "7-8 软件体系结构 钟泽荣 图书馆6楼9机房 3-19",
    "9-10 软件体系结构 钟泽荣 图书馆6楼9机房 3-19单",
  ],
  "2026-09-17": [
    // 就业指导 11-19 周才开；中国近代史纲要 4-18双 在第 3 周（单周）不排
    // → 周四第 3 周只剩晚上的形势与政策5
    "9-10 形势与政策5 腰蓝 弘德楼201 3-9单",
  ],
  "2026-09-18": [],
  "2026-09-19": [],
  "2026-09-20": [],
};

test("金标准：第 3 周（9/14-9/18）逐格与课表一致", () => {
  for (const [date, expected] of Object.entries(GOLDEN_WEEK3)) {
    const got = coursesOnDate(date).map(
      (c) => `${c.period} ${c.name} ${c.teacher} ${c.place} ${c.weeks}`,
    );
    assert.deepEqual(got, expected, `${date} ${weekdayCn(date)}`);
  }
});

test("金标准：单双周 + 起始周过滤真的生效", () => {
  // 算法设计与分析：1-2 节是「双周 4-18」，3-4 节是「3-19 每周」
  const algo = (d: string) =>
    coursesOnDate(d).filter((c) => c.name === "算法设计与分析").map((c) => c.period);
  assert.deepEqual(algo("2026-09-14"), ["3-4"]); // 第 3 周（单周）
  assert.deepEqual(algo("2026-09-21"), ["1-2", "3-4"]); // 第 4 周（双周）：两节都上
  assert.deepEqual(algo("2026-09-28"), ["3-4"]); // 第 5 周（单周）

  // 形势与政策5：单周 3-9
  const policy = (d: string) => coursesOnDate(d).some((c) => c.name === "形势与政策5");
  assert.equal(policy("2026-09-17"), true); // 第 3 周
  assert.equal(policy("2026-09-24"), false); // 第 4 周（双周）
  assert.equal(policy("2026-10-01"), true); // 第 5 周
  assert.equal(policy("2026-10-29"), true); // 第 9 周（末周）
  assert.equal(policy("2026-11-05"), false); // 第 10 周：超范围

  // 国家安全教育：仅 7-8 周（周二）
  const nse = (d: string) => coursesOnDate(d).some((c) => c.name === "国家安全教育");
  assert.equal(nse("2026-09-15"), false); // 第 3 周
  assert.equal(nse("2026-10-13"), true); // 第 7 周
  assert.equal(nse("2026-10-20"), true); // 第 8 周
  assert.equal(nse("2026-10-27"), false); // 第 9 周

  // 就业指导：11-19 周（周四）
  const career = (d: string) => coursesOnDate(d).some((c) => c.name === "就业指导");
  assert.equal(career("2026-09-24"), false); // 第 4 周
  assert.equal(career("2026-11-12"), true); // 第 11 周
});

test("课程块第三行带节次与地点，单双周单独做角标", () => {
  assert.equal(parityLabel("3-19"), "");
  assert.equal(parityLabel("4-18双"), "双周");
  assert.equal(parityLabel("3-9单"), "单周");

  const wed = buildDay("2026-09-16", coursesOnDate("2026-09-16"), []);
  const first = wed[0];
  assert.equal(first.title, "软件工程");
  assert.equal(first.sub, "第1-2节 · 图书馆5楼5机房"); // 9/16 调整后的教室
  assert.equal(first.weeks, "");

  // 软件体系结构 9-10 节是单周课 → 角标显示「单周」
  const single = wed.find((b) => b.weeks === "单周")!;
  assert.ok(single);
  assert.equal(single.title, "软件体系结构");
  assert.equal(single.sub, "第9-10节 · 图书馆6楼9机房");
});
