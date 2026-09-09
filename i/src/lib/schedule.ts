// 26软件工程（专升本）· 2026-2027学年第1学期课表
// 来源：班级课表（26.9.4）.xlsx → Sheet1 → 行「26软件工程（专升本）」
// 课表按星期几重复，不区分单双周（单双周信息只作为备注显示在卡片上）

export type Course = {
  id: string;
  /** 周一..周日 */
  day: string;
  /** 节次，如 "1-2" */
  period: string;
  /** 上课时间 HH:mm */
  start: string;
  end: string;
  name: string;
  teacher: string;
  place: string;
  /** 上课周次，如 "3-19"、"4-18双" */
  weeks: string;
};

// 节次 → 起止时间。学校作息改了就只改这一处
export const PERIOD_TIME: Record<string, [string, string]> = {
  "1-2": ["08:30", "10:05"],
  "3-4": ["10:20", "11:55"],
  "5-6": ["14:00", "15:35"],
  "7-8": ["15:50", "17:25"],
  "9-10": ["19:00", "20:35"],
};

function mk(id: string, day: string, period: string, name: string, teacher: string, place: string, weeks: string): Course {
  const [start, end] = PERIOD_TIME[period];
  return { id, day, period, start, end, name, teacher, place, weeks };
}

export const CLASS_SCHEDULE: Course[] = [
  // 周一
  mk("mon1", "周一", "1-2", "算法设计与分析", "赵小蕾", "图书馆6楼11机房", "4-18双"),
  mk("mon2", "周一", "3-4", "算法设计与分析", "赵小蕾", "图书馆6楼11机房", "3-19"),
  mk("mon3", "周一", "5-6", "人工智能数学基础", "吴志寒", "图书馆506", "3-19"),
  mk("mon4", "周一", "9-10", "Java EE企业级开发", "黄勇", "图书馆5楼4机房", "3-19"),
  // 周二
  mk("tue1", "周二", "3-4", "人工智能数学基础", "吴志寒", "图书馆506", "3-19"),
  mk("tue2", "周二", "7-8", "国家安全教育", "陈丽颖", "崇德楼205", "7-8"),
  mk("tue3", "周二", "9-10", "Java EE企业级开发", "黄勇", "图书馆5楼4机房", "3-19"),
  // 周三
  mk("wed1", "周三", "1-2", "软件工程", "甘利", "图书馆5楼16机房", "3-19"),
  mk("wed2", "周三", "3-4", "软件工程", "甘利", "图书馆5楼16机房", "3-19"),
  mk("wed3", "周三", "5-6", "中国近代史纲要", "彭语嫣", "明德楼601", "3-18"),
  mk("wed4", "周三", "7-8", "软件体系结构", "钟泽荣", "图书馆6楼9机房", "3-19"),
  mk("wed5", "周三", "9-10", "软件体系结构", "钟泽荣", "图书馆6楼9机房", "3-19单"),
  // 周四
  mk("thu1", "周四", "3-4", "就业指导", "谭剑音", "弘德楼3楼阶梯教室", "11-19"),
  mk("thu2", "周四", "5-6", "中国近代史纲要", "彭语嫣", "明德楼601", "4-18双"),
  mk("thu3", "周四", "9-10", "形势与政策5", "腰蓝", "弘德楼201", "3-9单"),
  // 周五～周日：无课
];

/** 实践/实训课程（整周性质，只作提示，不进时间线） */
export const PRACTICE_NOTE = "实践课程：JAVA 程序开发实训（黄勇，1周 / 03-19周）";

/** 取某一天的课程，按开始时间升序 */
export function coursesOf(day: string): Course[] {
  return CLASS_SCHEDULE.filter((c) => c.day === day).sort((a, b) => a.start.localeCompare(b.start));
}
