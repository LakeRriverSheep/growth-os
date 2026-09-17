// 纯日期工具：全部按「本地日历」计算，不用 toISOString（避免时区把日期挪一天）
// 约定：日期字符串一律 YYYY-MM-DD；星期索引一律 0=周一 … 6=周日

/** 学期第 1 周的周一。
 *  依据：班级课表（26.9.4）.xlsx 载明「课程自第 3 周开始」，校历载明「9/14（周一）开课 = 第 3 周」
 *  → 第 3 周周一 = 2026-09-14 → 第 1 周周一 = 2026-08-31。 */
export const TERM_FIRST_MONDAY = "2026-08-31";

export const WEEKDAY_CN = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;

export function isYmd(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(s: string, n: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/** 0=周一 … 6=周日 */
export function weekdayIndex(s: string): number {
  return (parseYmd(s).getDay() + 6) % 7;
}

export function weekdayCn(s: string): string {
  return WEEKDAY_CN[weekdayIndex(s)];
}

export function isWeekend(s: string): boolean {
  return weekdayIndex(s) >= 5;
}

/** 该日期所在周的周一 */
export function mondayOf(s: string): string {
  return addDays(s, -weekdayIndex(s));
}

/** 学期第几周（1 起）；早于第 1 周返回 ≤0，跨学期也只是线性外推 */
export function termWeek(s: string): number {
  const days = Math.round(
    (parseYmd(mondayOf(s)).getTime() - parseYmd(TERM_FIRST_MONDAY).getTime()) / 86400000,
  );
  return Math.round(days / 7) + 1;
}

/** 周一 → 周日 的 7 个日期 */
export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function monthDayCn(s: string): string {
  const d = parseYmd(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function fullDateCn(s: string): string {
  const d = parseYmd(s);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdayCn(s)}`;
}

/** 分钟数 → HH:mm */
export function fromMin(min: number): string {
  const m = Math.max(0, Math.min(24 * 60, Math.round(min)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** HH:mm → 分钟数；非法返回 NaN */
export function toMin(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 当前本地时间 "HH:mm" */
export function nowHm(d: Date = new Date()): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function todayYmd(d: Date = new Date()): string {
  return ymd(d);
}
