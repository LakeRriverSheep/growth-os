// 健身表单的所有静态选项
// 卡片选项的通用形状
export type Opt = {
  value: string;
  label: string;
  sub?: string;
  emoji: string;
  image?: string; // 器械照片路径（可选）
};

export const TARGETS: Opt[] = [
  { value: "减脂", label: "减脂", sub: "降体脂 · 见腹肌", emoji: "🔥" },
  { value: "增肌", label: "增肌", sub: "涨维度 · 涨力量", emoji: "💪" },
  { value: "塑形", label: "塑形", sub: "练出薄肌线条", emoji: "✨" },
];

export const PARTS: Opt[] = [
  { value: "胸", label: "胸", emoji: "🫁" },
  { value: "背", label: "背", emoji: "🦾" },
  { value: "肩", label: "肩", emoji: "🏔️" },
  { value: "腿", label: "腿", emoji: "🦵" },
  { value: "手臂", label: "手臂", emoji: "💪" },
  { value: "臀", label: "臀", emoji: "🍑" },
  { value: "核心", label: "核心", emoji: "🎯" },
];

export const PLACES: Opt[] = [
  { value: "健身房", label: "健身房", sub: "器械全 · 氛围强", emoji: "🏟️" },
  { value: "家里", label: "家里", sub: "省通勤 · 随时开练", emoji: "🏠" },
  { value: "户外", label: "户外", sub: "跑跳 · 单双杠", emoji: "🌳" },
];

export const GYM_POINTS: Opt[] = [
  { value: "家", label: "家", emoji: "🏠" },
  { value: "学校", label: "学校", emoji: "🏫" },
  { value: "公司", label: "公司", emoji: "🏢" },
  { value: "其他", label: "其他", emoji: "📍" },
];

export const DISTANCES: Opt[] = [
  { value: "步行可达（≤1km）", label: "≤1km", sub: "步行可达", emoji: "🚶" },
  { value: "近（1-3km）", label: "1-3km", sub: "骑车 10 分钟", emoji: "🚴" },
  { value: "中等（3-5km）", label: "3-5km", sub: "通勤约 15 分钟", emoji: "🛵" },
  { value: "很远（>5km）", label: ">5km", sub: "通勤成本高", emoji: "🚌" },
];

export const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;
export const SLOT_NAMES = ["清晨", "午间", "傍晚", "夜间", "暂定"] as const;
export const SLOT_SUB: Record<string, string> = {
  清晨: "6-9点",
  午间: "12-14点",
  傍晚: "17-20点",
  夜间: "20-23点",
  暂定: "还没定",
};

// 器械选项 + 实拍图（路径相对 public/）
export const EQUIPMENT: Opt[] = [
  { value: "杠铃", label: "杠铃", sub: "深蹲架 · 卧推架", emoji: "🏋️", image: "/equipment/barbell.jpg" },
  { value: "哑铃", label: "哑铃", sub: "家里也能用", emoji: "🥇", image: "/equipment/dumbbell.jpg" },
  { value: "龙门架", label: "龙门架", sub: "绳索 · 夹胸下压", emoji: "🔗", image: "/equipment/cable.jpg" },
  { value: "史密斯机", label: "史密斯机", sub: "固定轨迹", emoji: "⚙️", image: "/equipment/smith.webp" },
  { value: "坐姿器械", label: "坐姿器械", sub: "推胸下拉腿举", emoji: "🔧", image: "/equipment/machine.jpg" },
  { value: "弹力带", label: "弹力带", sub: "在家神器", emoji: "🎗️", image: "/equipment/band.jpg" },
  { value: "单双杠", label: "单双杠", sub: "引体 · 臂屈伸", emoji: "🤸", image: "/equipment/pullup.jpg" },
  { value: "徒手", label: "徒手", sub: "零器械", emoji: "🧍", image: "/equipment/bodyweight.jpg" },
];

export const EXP_OPTIONS = ["新手（<半年）", "有些基础（半年-2年）", "老手（2年+）"] as const;
