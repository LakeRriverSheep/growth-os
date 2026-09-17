// 周计划：日期 / 课表周次 / 时间轴布局 单元测试
// 运行：node --experimental-strip-types --test tests/planner.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, mondayOf, termWeek, weekdayCn, weekdayIndex } from "../src/lib/date.ts";
import { courseOnWeek, coursesOnDate, parseWeeks, CLASS_SCHEDULE } from "../src/lib/schedule.ts";
import {
  axisRange,
  buildDay,
  layoutColumn,
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
      place: "图书馆5楼16机房",
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
