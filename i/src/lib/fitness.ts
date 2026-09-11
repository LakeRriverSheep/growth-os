// 健身计划生成引擎 v4
// 结构参考 Strong / JeFit / 健身助手：部位日 × 起始重量 × 用户自选动作 × 练前练后餐

// 带 .ts 后缀：Node 原生跑单测（node --experimental-strip-types tests/*.test.ts）时才能解析
import { buildDietPlan, type DietPlan } from "./diet.ts";

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
  // 新增：用户自选动作，部位 + 动作名数组，按勾选顺序即训练顺序
  userPicks?: Record<string, string[]>;
};

export type Exercise = {
  name: string;
  muscle: string;
  startWeight: string;
  setsReps: string;
  rest: string;
  cue: string;
};
export type DayPlan = {
  day: string;
  type: string;
  place: string;
  slot: string;
  minutes: number;
  exercises: Exercise[];
  warmup: string[]; // 该日热身文案（周一胸日专属与其他日不同）
};
export type MealPlan = {
  preWorkout: { when: string; items: string[] };
  postWorkout: { when: string; items: string[] };
  meals: { name: string; items: string[] }[];
  shopping: { item: string; amount: string; note: string }[];
  channels: { name: string; why: string }[];
  gear: { item: string; price: string; why: string }[];
  stairClimber: {
    durationMin: number;
    level: string;
    hrZone: string;
    cues: string[];
    slot: string; // 推荐时段
  };
};
export type FitnessPlan = {
  overview: {
    splitName: string;
    daysPerWeek: number;
    gymDays: number;
    homeDays: number;
    timeline: string;
    customPicks: boolean;
  };
  macros: {
    bmr: number;
    tdee: number;
    targetKcal: number;
    targetLabel: string;
    protein: number;
    carb: number;
    /** 休息日碳水参考值（训练日吃 carb） */
    carbRest: number;
    fat: number;
    note: string;
  };
  /** 三餐食材搭配（早/中/晚 按宏量营养素拆开的选项 + 推荐组合） */
  diet: DietPlan;
  meals: MealPlan;
  warmup: string[];
  schedule: DayPlan[];
  progression: { week: string; focus: string; how: string }[];
  notes: string[];
};

// ---------- 动作库 v4 ----------
// popularity: 1-10，10 = 业内最热门高效（Strong/Hevy/健身助手 Top 必选）
// difficulty: 初级 / 中级 / 高级
// pattern: 蹲 / 推 / 拉 / 髋 / 核心
export type Move = {
  name: string;
  pattern: "蹲" | "推" | "拉" | "髋" | "核心";
  muscle: string;
  compound: boolean;
  cue: string;
  popularity: number;
  difficulty: "初级" | "中级" | "高级";
};

const LIB: Record<string, Move[]> = {
  "杠铃": [
    // 胸
    { name: "杠铃平板卧推", pattern: "推", muscle: "胸 · 前束", compound: true, cue: "肩胛后缩下沉，杆落在胸骨中下段", popularity: 10, difficulty: "中级" },
    { name: "杠铃上斜卧推", pattern: "推", muscle: "上胸 · 前束", compound: true, cue: "凳角 15-30°，杆落锁骨下沿，角度再高变练肩", popularity: 9, difficulty: "中级" },
    { name: "杠铃下斜卧推", pattern: "推", muscle: "下胸 · 三头", compound: true, cue: "头低脚高 15°，杆落剑突", popularity: 7, difficulty: "中级" },
    { name: "杠铃窄距卧推", pattern: "推", muscle: "胸内侧 · 三头", compound: true, cue: "握距比肩略窄，肘贴身体两侧", popularity: 6, difficulty: "中级" },
    // 背
    { name: "杠铃划船", pattern: "拉", muscle: "背 · 二头", compound: true, cue: "躯干前倾 45°，肘贴身体向后拉", popularity: 9, difficulty: "中级" },
    { name: "杠铃罗马尼亚硬拉", pattern: "髋", muscle: "腘绳 · 臀 · 下背", compound: true, cue: "杆贴小腿滑，感受大腿后侧拉伸", popularity: 9, difficulty: "中级" },
    { name: "硬拉", pattern: "髋", muscle: "后链整体", compound: true, cue: "髋铰链发力，全程腰背挺直", popularity: 10, difficulty: "高级" },
    // 腿
    { name: "杠铃深蹲", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "下蹲到髋低于膝盖，起身先顶髋", popularity: 10, difficulty: "高级" },
    { name: "杠铃前蹲", pattern: "蹲", muscle: "股四头 · 核心", compound: true, cue: "肘抬高，杆贴锁骨前侧", popularity: 6, difficulty: "高级" },
    // 肩
    { name: "杠铃站姿肩推", pattern: "推", muscle: "肩 · 三头", compound: true, cue: "收紧核心不后仰，杆过头顶", popularity: 8, difficulty: "中级" },
    { name: "杠铃耸肩", pattern: "拉", muscle: "斜方", compound: false, cue: "直上直下，不绕圈", popularity: 4, difficulty: "初级" },
  ],
  "哑铃": [
    // 胸
    { name: "哑铃平板卧推", pattern: "推", muscle: "胸 · 前束", compound: true, cue: "下放到大臂与地面平行，顶峰挤压胸", popularity: 10, difficulty: "初级" },
    { name: "哑铃上斜卧推", pattern: "推", muscle: "上胸 · 前束", compound: true, cue: "凳角 30-45°，顶端刻意挤压上胸", popularity: 9, difficulty: "初级" },
    { name: "哑铃飞鸟", pattern: "推", muscle: "胸", compound: false, cue: "肘微屈成\"抱树\"姿势，下放到大臂与地面平行", popularity: 8, difficulty: "初级" },
    { name: "上斜哑铃飞鸟", pattern: "推", muscle: "上胸", compound: false, cue: "凳角 30°，重点拉伸上胸", popularity: 7, difficulty: "初级" },
    { name: "哑铃仰卧屈臂上拉", pattern: "推", muscle: "胸 · 前锯", compound: false, cue: "哑铃从胸上方慢慢放至头后，再拉回胸上方", popularity: 5, difficulty: "中级" },
    { name: "哑铃挤压推举", pattern: "推", muscle: "胸内侧", compound: true, cue: "双手夹一片哑铃做卧推，持续挤压", popularity: 5, difficulty: "初级" },
    // 背
    { name: "哑铃单臂划船", pattern: "拉", muscle: "背 · 二头", compound: true, cue: "单膝跪凳，肘向上向后，不转体", popularity: 9, difficulty: "初级" },
    { name: "哑铃俯身划船", pattern: "拉", muscle: "背 · 后束", compound: true, cue: "双腿分开俯身，双手自然下垂，拉向髋部", popularity: 7, difficulty: "中级" },
    // 肩
    { name: "哑铃站姿肩推", pattern: "推", muscle: "肩 · 三头", compound: true, cue: "哑铃举到耳朵两侧，推起不锁死肘", popularity: 8, difficulty: "初级" },
    { name: "哑铃侧平举", pattern: "推", muscle: "中束", compound: false, cue: "肘微屈，抬到与肩平，不耸肩", popularity: 8, difficulty: "初级" },
    { name: "哑铃前平举", pattern: "推", muscle: "前束", compound: false, cue: "抬到与肩平，控制下放", popularity: 5, difficulty: "初级" },
    { name: "哑铃俯身飞鸟", pattern: "拉", muscle: "后束", compound: false, cue: "俯身 45°，肘微屈，向两侧张开", popularity: 7, difficulty: "初级" },
    // 手臂
    { name: "哑铃弯举", pattern: "拉", muscle: "二头", compound: false, cue: "上臂固定不动，慢下放 2 秒", popularity: 7, difficulty: "初级" },
    { name: "哑铃锤式弯举", pattern: "拉", muscle: "二头 · 前臂", compound: false, cue: "中立握（拇指朝前），减少手腕借力", popularity: 5, difficulty: "初级" },
    { name: "哑铃臂屈伸", pattern: "推", muscle: "三头", compound: false, cue: "肘指向天花板，只动小臂", popularity: 6, difficulty: "初级" },
    { name: "哑铃颈后臂屈伸", pattern: "推", muscle: "三头", compound: false, cue: "双手握一只哑铃过头，肘固定，只伸小臂", popularity: 5, difficulty: "中级" },
    // 腿
    { name: "保加利亚分腿蹲", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "后腿搭凳，前腿发力，躯干微前倾", popularity: 8, difficulty: "中级" },
    { name: "哑铃高脚杯深蹲", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "哑铃抱胸前，肘向下，蹲到髋低于膝", popularity: 7, difficulty: "初级" },
    { name: "哑铃弓步蹲", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "前腿发力，后腿膝盖不落地", popularity: 7, difficulty: "初级" },
    { name: "哑铃直腿硬拉", pattern: "髋", muscle: "腘绳 · 臀", compound: true, cue: "膝微屈，髋部折叠，哑铃贴近腿", popularity: 7, difficulty: "中级" },
  ],
  "龙门架": [
    // 胸
    { name: "绳索夹胸（高位）", pattern: "推", muscle: "下胸", compound: false, cue: "滑轮调到高位，双手画弧线抱大腿，手腕内旋，顶峰夹 2 秒", popularity: 7, difficulty: "初级" },
    { name: "绳索夹胸（中位）", pattern: "推", muscle: "中胸", compound: false, cue: "滑轮齐肩高，向内夹紧", popularity: 8, difficulty: "初级" },
    { name: "绳索夹胸（低位）", pattern: "推", muscle: "上胸", compound: false, cue: "滑轮调低，双手向上内收", popularity: 6, difficulty: "初级" },
    // 背
    { name: "绳索划船", pattern: "拉", muscle: "背 · 后束", compound: true, cue: "拉到腹部，肩胛先收再屈肘", popularity: 8, difficulty: "初级" },
    { name: "绳索直臂下压", pattern: "拉", muscle: "背阔下缘", compound: false, cue: "双臂伸直下压至大腿前侧，轻重量多组数", popularity: 8, difficulty: "初级" },
    { name: "绳索面拉", pattern: "拉", muscle: "后束 · 上背", compound: false, cue: "拉向额头，外旋肩膀护肩", popularity: 9, difficulty: "初级" },
    // 肩
    { name: "绳索侧平举", pattern: "推", muscle: "中束", compound: false, cue: "单侧完成，恒定张力", popularity: 6, difficulty: "初级" },
    // 手臂
    { name: "绳索下压", pattern: "推", muscle: "三头", compound: false, cue: "大臂夹紧身体，只伸小臂", popularity: 8, difficulty: "初级" },
    { name: "绳索弯举", pattern: "拉", muscle: "二头", compound: false, cue: "恒定张力，顶端停留 1 秒", popularity: 6, difficulty: "初级" },
    { name: "绳索过头臂屈伸", pattern: "推", muscle: "三头长头", compound: false, cue: "面朝下绳索机，双手过头伸直", popularity: 5, difficulty: "中级" },
  ],
  "史密斯机": [
    { name: "史密斯深蹲", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "脚略向前站，靠背稳杆", popularity: 6, difficulty: "初级" },
    { name: "史密斯卧推", pattern: "推", muscle: "胸 · 前束", compound: true, cue: "轨迹固定，专注胸部发力", popularity: 6, difficulty: "初级" },
    { name: "史密斯上斜卧推", pattern: "推", muscle: "上胸", compound: true, cue: "凳调好角度，重点推上胸", popularity: 5, difficulty: "初级" },
    { name: "史密斯划船", pattern: "拉", muscle: "背 · 二头", compound: true, cue: "俯身稳定，拉向下腹部", popularity: 5, difficulty: "初级" },
    { name: "史密斯耸肩", pattern: "拉", muscle: "斜方", compound: false, cue: "直上直下", popularity: 3, difficulty: "初级" },
  ],
  "坐姿器械": [
    { name: "坐姿推胸", pattern: "推", muscle: "胸 · 前束", compound: true, cue: "靠背贴紧，推出时呼气", popularity: 7, difficulty: "初级" },
    { name: "器械夹胸（Pec Deck）", pattern: "推", muscle: "胸", compound: false, cue: "手柄与肩平，回放时肩胛打开，顶峰挤压 2 秒", popularity: 8, difficulty: "初级" },
    { name: "高位下拉", pattern: "拉", muscle: "背 · 二头", compound: true, cue: "拉到锁骨，回放控制 2 秒", popularity: 9, difficulty: "初级" },
    { name: "高位下拉（窄握 V 把）", pattern: "拉", muscle: "背阔下部", compound: true, cue: "窄握 + V 把，肘贴身体，重点刺激下缘", popularity: 7, difficulty: "初级" },
    { name: "坐姿划船", pattern: "拉", muscle: "背 · 后束", compound: true, cue: "挺胸不弓腰，拉到小腹", popularity: 8, difficulty: "初级" },
    { name: "T 杠划船", pattern: "拉", muscle: "背阔厚度", compound: true, cue: "俯身贴胸口拉，可加重，比杠铃划船更孤立", popularity: 8, difficulty: "中级" },
    { name: "腿举", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "膝盖不锁死，脚放平台中高位", popularity: 7, difficulty: "初级" },
    { name: "腿屈伸", pattern: "蹲", muscle: "股四头", compound: false, cue: "顶峰收缩 1 秒，慢放", popularity: 5, difficulty: "初级" },
    { name: "腿弯举", pattern: "髋", muscle: "腘绳", compound: false, cue: "髋贴紧凳面，感受大腿后侧", popularity: 5, difficulty: "初级" },
    { name: "坐姿腿弯举", pattern: "髋", muscle: "腘绳", compound: false, cue: "调好垫子位置，髋压紧", popularity: 5, difficulty: "初级" },
    { name: "坐姿蹬腿", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "靠紧靠背，脚蹬到底不锁膝", popularity: 6, difficulty: "初级" },
  ],
  "弹力带": [
    { name: "弹力带深蹲", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "带踩脚下过肩，下蹲对抗阻力", popularity: 4, difficulty: "初级" },
    { name: "弹力带推胸", pattern: "推", muscle: "胸 · 三头", compound: true, cue: "带绕背后，向前推出挤压胸", popularity: 4, difficulty: "初级" },
    { name: "弹力带夹胸", pattern: "推", muscle: "胸", compound: false, cue: "带绕背后，向内夹紧", popularity: 4, difficulty: "初级" },
    { name: "弹力带划船", pattern: "拉", muscle: "背 · 二头", compound: true, cue: "带踩脚下或绕固定物，向后拉", popularity: 4, difficulty: "初级" },
    { name: "弹力带高位下拉", pattern: "拉", muscle: "背", compound: true, cue: "带绕高处固定点，下拉至胸", popularity: 4, difficulty: "初级" },
    { name: "弹力带肩推", pattern: "推", muscle: "肩 · 三头", compound: true, cue: "带踩脚下，向上推起", popularity: 3, difficulty: "初级" },
    { name: "弹力带侧平举", pattern: "推", muscle: "中束", compound: false, cue: "带踩脚下，侧向抬臂", popularity: 3, difficulty: "初级" },
    { name: "弹力带硬拉", pattern: "髋", muscle: "腘绳 · 臀", compound: true, cue: "带踩脚下，髋部折叠起身夹臀", popularity: 4, difficulty: "初级" },
  ],
  "单双杠": [
    { name: "引体向上（宽握）", pattern: "拉", muscle: "背 · 二头", compound: true, cue: "全程不用惯性，下巴过杠", popularity: 10, difficulty: "高级" },
    { name: "引体向上（反握）", pattern: "拉", muscle: "背阔下部", compound: true, cue: "反握大幅提升背阔下部参与度", popularity: 7, difficulty: "高级" },
    { name: "引体向上（对握）", pattern: "拉", muscle: "背阔中部", compound: true, cue: "掌心相对握姿，幅度更大", popularity: 6, difficulty: "高级" },
    { name: "引体向上（弹力带辅助）", pattern: "拉", muscle: "背 · 二头", compound: true, cue: "带绕单杠脚踩，新手起步动作", popularity: 8, difficulty: "初级" },
    { name: "双杠臂屈伸（胸）", pattern: "推", muscle: "下胸 · 三头", compound: true, cue: "身体前倾 15-20°，下沉至肘 90°", popularity: 9, difficulty: "中级" },
    { name: "双杠臂屈伸（三头）", pattern: "推", muscle: "三头", compound: true, cue: "躯干直立，重点刺激三头", popularity: 7, difficulty: "中级" },
    { name: "悬垂举腿", pattern: "核心", muscle: "核心", compound: false, cue: "不摆动，骨盆后倾卷腿", popularity: 7, difficulty: "中级" },
    { name: "悬垂卷腹", pattern: "核心", muscle: "核心", compound: false, cue: "屈髋卷腹，不甩腿", popularity: 6, difficulty: "中级" },
  ],
  "徒手": [
    { name: "俯卧撑", pattern: "推", muscle: "胸 · 三头", compound: true, cue: "身体一条线，胸贴近地面", popularity: 8, difficulty: "初级" },
    { name: "跪姿俯卧撑", pattern: "推", muscle: "胸 · 三头", compound: true, cue: "膝盖着地，新手起步", popularity: 6, difficulty: "初级" },
    { name: "上斜俯卧撑", pattern: "推", muscle: "上胸", compound: true, cue: "手撑高处，难度降低", popularity: 5, difficulty: "初级" },
    { name: "下斜俯卧撑", pattern: "推", muscle: "下胸", compound: true, cue: "脚撑高处，难度提高", popularity: 6, difficulty: "中级" },
    { name: "钻石俯卧撑", pattern: "推", muscle: "胸内侧 · 三头", compound: true, cue: "双手并拢，重点刺激内沿", popularity: 5, difficulty: "中级" },
    { name: "徒手深蹲", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "臀部后坐，膝盖对脚尖", popularity: 6, difficulty: "初级" },
    { name: "弓步蹲", pattern: "蹲", muscle: "股四头 · 臀", compound: true, cue: "前腿发力，后腿膝盖不落地", popularity: 6, difficulty: "初级" },
    { name: "臀桥", pattern: "髋", muscle: "臀 · 腘绳", compound: true, cue: "顶峰夹臀 2 秒，不顶腰", popularity: 7, difficulty: "初级" },
    { name: "单腿臀桥", pattern: "髋", muscle: "臀", compound: true, cue: "单腿支撑，进阶动作", popularity: 5, difficulty: "中级" },
    { name: "反向划船（桌下）", pattern: "拉", muscle: "背 · 二头", compound: true, cue: "身体斜挂桌下，胸拉向桌沿", popularity: 5, difficulty: "初级" },
    { name: "平板支撑", pattern: "核心", muscle: "核心", compound: false, cue: "收紧腰腹不塌腰，臀不翘", popularity: 7, difficulty: "初级" },
    { name: "侧平板支撑", pattern: "核心", muscle: "核心侧面", compound: false, cue: "身体一条直线，髋不塌", popularity: 5, difficulty: "初级" },
    { name: "卷腹", pattern: "核心", muscle: "腹直肌", compound: false, cue: "腰椎不离地，卷腹不是抬头", popularity: 6, difficulty: "初级" },
    { name: "反向卷腹", pattern: "核心", muscle: "下腹", compound: false, cue: "骨盆后倾卷腿，下腹主导", popularity: 5, difficulty: "初级" },
    { name: "山羊挺身", pattern: "髋", muscle: "竖脊肌", compound: true, cue: "髋贴靠垫，俯身至与地面平再挺身", popularity: 7, difficulty: "中级" },
    { name: "登山", pattern: "核心", muscle: "核心 · 心肺", compound: true, cue: "髋不翘，速度适中", popularity: 6, difficulty: "初级" },
    { name: "死虫式（Dead Bug）", pattern: "核心", muscle: "核心深层", compound: false, cue: "仰卧，对侧手脚同时伸展，腰不贴地", popularity: 6, difficulty: "初级" },
    { name: "鸟狗式（Bird Dog）", pattern: "核心", muscle: "核心 · 下背", compound: false, cue: "四点跪姿，对侧手脚同时伸直", popularity: 5, difficulty: "初级" },
    { name: "V 字坐姿", pattern: "核心", muscle: "腹直肌 · 下腹", compound: false, cue: "坐姿抬腿抬上身呈 V 字", popularity: 5, difficulty: "中级" },
    { name: "俄罗斯转体", pattern: "核心", muscle: "核心侧面", compound: false, cue: "坐姿屈膝，左右转体触地", popularity: 6, difficulty: "初级" },
    { name: "健腹轮", pattern: "核心", muscle: "核心 · 前锯", compound: true, cue: "膝跪地，前滚至身体接近水平再收回", popularity: 7, difficulty: "高级" },
  ],
};

// 起始重量系数（相对体重，男；女 × 0.7；新手 × 0.7；老手 × 1.15）
// 覆盖 LIB 里所有复合动作（孤立动作一般无需此系数）
const START_KG: Record<string, number> = {
  "杠铃平板卧推": 0.35,
  "杠铃上斜卧推": 0.3,
  "杠铃下斜卧推": 0.3,
  "杠铃窄距卧推": 0.3,
  "杠铃划船": 0.35,
  "杠铃罗马尼亚硬拉": 0.6,
  "硬拉": 0.8,
  "杠铃深蹲": 0.5,
  "杠铃前蹲": 0.4,
  "杠铃站姿肩推": 0.25,
  "杠铃耸肩": 0.5,

  "哑铃平板卧推": 0.15,
  "哑铃上斜卧推": 0.13,
  "哑铃挤压推举": 0.13,
  "哑铃单臂划船": 0.2,
  "哑铃俯身划船": 0.18,
  "哑铃站姿肩推": 0.12,
  "哑铃侧平举": 0.05,
  "哑铃前平举": 0.05,
  "哑铃俯身飞鸟": 0.05,
  "哑铃弯举": 0.08,
  "哑铃锤式弯举": 0.08,
  "哑铃臂屈伸": 0.08,
  "哑铃颈后臂屈伸": 0.08,
  "保加利亚分腿蹲": 0.1,
  "哑铃高脚杯深蹲": 0.12,
  "哑铃弓步蹲": 0.1,
  "哑铃直腿硬拉": 0.3,

  "绳索夹胸（高位）": 0.12,
  "绳索夹胸（中位）": 0.12,
  "绳索夹胸（低位）": 0.12,
  "绳索划船": 0.3,
  "绳索直臂下压": 0.2,
  "绳索面拉": 0.1,
  "绳索侧平举": 0.05,
  "绳索下压": 0.12,
  "绳索弯举": 0.08,
  "绳索过头臂屈伸": 0.1,

  "史密斯深蹲": 0.4,
  "史密斯卧推": 0.3,
  "史密斯上斜卧推": 0.28,
  "史密斯划船": 0.3,
  "史密斯耸肩": 0.4,

  "坐姿推胸": 0.4,
  "器械夹胸（Pec Deck）": 0.3,
  "高位下拉": 0.4,
  "高位下拉（窄握 V 把）": 0.35,
  "坐姿划船": 0.35,
  "T 杠划船": 0.4,
  "腿举": 1.0,
  "腿屈伸": 0.25,
  "腿弯举": 0.2,
  "坐姿腿弯举": 0.2,
  "坐姿蹬腿": 0.8,

  "弹力带深蹲": 0,
  "弹力带推胸": 0,
  "弹力带夹胸": 0,
  "弹力带划船": 0,
  "弹力带高位下拉": 0,
  "弹力带肩推": 0,
  "弹力带侧平举": 0,
  "弹力带硬拉": 0,

  "引体向上（宽握）": 0,
  "引体向上（反握）": 0,
  "引体向上（对握）": 0,
  "引体向上（弹力带辅助）": 0,
  "双杠臂屈伸（胸）": 0,
  "双杠臂屈伸（三头）": 0,
};

const ALL_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

// 部位 → 肌群关键词（用于 userPicks 模式下从动作名匹配归属部位）
const PART_MUSCLES: Record<string, string[]> = {
  胸: ["胸", "前锯"],
  背: ["背", "斜方", "竖脊"],
  腿: ["股四头", "腘绳", "臀"],
  肩: ["束", "肩", "斜方"],
  "手臂": ["二头", "三头", "前臂"],
  臀: ["臀", "腘绳"],
  "核心": ["核心", "腹直肌", "下腹"],
};

function findMove(name: string): Move | undefined {
  for (const list of Object.values(LIB)) {
    const found = list.find((m) => m.name === name);
    if (found) return found;
  }
  return undefined;
}

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
  // 自重类（含弹力带）起步——"平板卧推"不能被 "平板" 误命中，"上斜俯卧撑"是俯卧撑
  const isPushup = /俯卧撑/.test(name) && !/卧推|推举/.test(name);
  if (name.includes("引体") || isPushup || name.includes("悬垂") ||
      /深蹲$/.test(name) || /弓步蹲$/.test(name) || name.includes("臀桥") ||
      /划船$/.test(name) || name.includes("卷腹") ||
      name.includes("登山") || name.includes("挺身") || name.includes("跪姿") ||
      name.includes("弹力带") || name.includes("臂屈伸") || name.includes("健腹轮")) {
    if (name.includes("引体")) return "弹力带辅助起步";
    if (name.includes("弹力带")) return "弹力带阻力（按颜色定强度）";
    if (name.includes("臂屈伸")) return "自重（必要时挂杠铃片加重）";
    return "自重";
  }
  const coef = START_KG[name];
  if (!coef) return "按 RPE 8 估";
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

// 标记哪些动作属于「核心训练」——按 pattern 判定最稳
function isCoreMove(name: string): boolean {
  const m = findMove(name);
  return m?.pattern === "核心";
}

function setCount(ex: Exercise): number {
  // setsReps 形如 "4 × 8-12" / "2 × 力竭激活 + 4 × 12-16"，累加所有 × 前的组数
  let total = 0;
  for (const m of ex.setsReps.matchAll(/(\d+)\s*[×x]/g)) total += parseInt(m[1], 10);
  return total || 3;
}

// ---------- 部位日模板（兜底推荐用） ----------
type DayType = { name: string; mix: { 蹲: number; 推: number; 拉: number; 髋: number } };

// 个人专属日模板：某周几 + 部位命中时，完全用这套内容（健身房动作）
type PersonalDayTpl = {
  warmup: string[];
  exercises: Pick<Exercise, "name" | "muscle" | "cue" | "setsReps">[];
};

// 周一·胸日·专属流程（用户原话整理：热身+激活 → 正式组从上到下）
// 保留你原话的全部动作细节，未删减
const MONDAY_CHEST: PersonalDayTpl = {
  warmup: [
    "泡沫轴热身·①：胸部正上方一点，用力压住，吸气维持，扩张胸部，激活胸廓感受，放松胸肌颈膜，减少肩膀压力",
    "泡沫轴热身·②：手抵住泡沫轴，菱形肌拉伸的感觉，前锯肌也会发力",
    "激活组原则：激活不需要大重量，而是感受最强的重量，做到力竭，做到酸痛感，锁骨下面的上胸肌纤维发力的感觉，2 组",
  ],
  exercises: [
    {
      name: "上斜固定夹胸器 / 仰卧龙门架夹胸（上胸激活）",
      muscle: "上胸",
      setsReps: "2 × 力竭激活 + 4 × 12-16",
      cue:
        "手要握的偏上一点，肋骨贴紧凳子，要很精准的找到它，就是上面，4 组正式组 × 12-16（先用激活组找到锁骨下上胸肌纤维发力的感觉）",
    },
    {
      name: "上斜哑铃卧推",
      muscle: "上胸 · 前束",
      setsReps: "4 × 12-16",
      cue:
        "肋骨紧紧贴住凳子，收住肋骨，腰紧紧地贴住凳子，不要吸太多气，上去的时候手腕往里扣，不用推到中间，反正会松，往下放的多，大概快直了就结束，全握，引导胸大肌上束发力，要把力收到胸肌上，向下的时候不要单纯的向下，反正力会到肩部，向外一点，向远端延长，胸肌拉伸感，不要抬头，4 组正式组 × 12-16",
    },
    {
      name: "下斜双杠臂屈伸（下胸）",
      muscle: "下胸 · 三头",
      setsReps: "4 × 12-16",
      cue:
        "自重、辅助都行，首先撑住，把身体含起来，然后下去，不是放腿下去，而是开肘，要感觉到下胸收的很紧，不要弯腰，而是肩胛骨，中缝没有肉，因为收缩不够，募集更多的肌纤维，可以用手扣一扣中缝，4 组 × 12-16（先轻重量，感受发力，再加重量）",
    },
    {
      name: "平夹（Pec Deck / 龙门架中位夹胸）",
      muscle: "中胸（中缝）",
      setsReps: "4 × 12-16",
      cue:
        "练整体，深吸一口气，不要顶肋，平角度，往后放，不要开肋顶腰，向内收要收紧，肘伸直，中缝发力更好，可以单手去做，感受到挤压的感觉",
    },
  ],
};

// 周二·背日·专属流程（用户原话整理：肩胛热身 → 下拉/划船/直臂下压）
const TUESDAY_BACK: PersonalDayTpl = {
  warmup: [
    "跪姿肘屈伸：手心相对，重心向后，这时候背部已经在发力了；吸气，肩胛骨撑高，前锯肌激活，维持住，再去做肘屈、伸肘，要保证背部持续张力——前锯肌、内肩肌、背部都在发力，主体是肩胛骨（2-3 组）",
    "凳子肘屈肘伸：手放在凳子上，往后下再起来，跪姿也可以（2-3 组）",
    "（这个动作本身练三头，能改善肩胛骨、肱骨前移、肩膀弹响疼痛）脚部可以勾住前面一个东西，微微向后仰，大臂往里收，手不用完全起来，注意力放在肩胛骨的位置，弱化三头发力、增强肩胛骨发力（2-3 组）",
  ],
  exercises: [
    {
      name: "反手高位下拉",
      muscle: "背阔 · 二头",
      setsReps: "5-6 组",
      cue:
        "反手、握距与肩同宽、半握，靠尺侧发力。深吸一口气，背预先发力，上肢微微前倾，肘往里收，不要耸肩，否则背就松掉了；向上放的时候收紧腹肌，不要后仰，否则下背部练不到；下拉的时候挺胸收腹。",
    },
    {
      name: "坐姿绳索划船（对握窄握）",
      muscle: "背阔下缘 · 中背",
      setsReps: "4-5 组 · 可递减",
      cue:
        "对握窄握。脚用力去蹬，让大腿后侧保持发力，维持骨盆和腰椎的稳定，下面不能松，否则腰会发力；背阔肌预先发力，拉过来一部分，再深吸一口气，维持住这口气，下背就发力了；往腹部拉、微微前倾，不要过度向后拉（防止背阔肌松掉），不要后仰和向上提，头要低下巴，也不要放太多。这个动作超级重要，好好打磨这个重量，可以做递减，防止动作变形。",
    },
    {
      name: "中距离对握高位下拉",
      muscle: "背阔 · 大圆肌",
      setsReps: "4 组",
      cue:
        "中距离对握。找肩胛骨上回旋的拉伸感，一定要找到大圆肌的拉伸感；握住往下一点，深吸一口气，重心微微前倾，腹肌绷紧，拉到嘴的位置，不要后仰，要收腹，一定找到肩胛骨上回旋的拉伸感。",
    },
    {
      name: "中距离对握开肘坐姿划船",
      muscle: "中背 · 上背",
      setsReps: "4 组",
      cue:
        "练中背部和上背部，以肩胛后缩为主。重心维持在中立位，向两侧做肩胛后缩；放的时候不要放到底、不要伸直手臂；先收紧核心，固定住头和腰的位置，挺胸，肩胛后缩到位，不要后仰。",
    },
    {
      name: "直臂下压",
      muscle: "背阔下缘 · 三头长头",
      setsReps: "4 组",
      cue:
        "上下背部同时都能练到。俯身、屈髋伸髋，直杆弯杆都行，长的杆握在最远端、半握、手腕扣起来；做这个动作之前，背部需要预先发力，防止肩酸；先做好姿势，深吸一口气，维持住这口气，不要含胸，保证中立位；下压，收紧腹肌，不要抬臀，背部收紧，收到最紧。",
    },
  ],
};

// 周三·肩日·专属流程（用户原话整理：热身激活 → 压力侧平举/史密斯推肩 → 中后束收尾）
// 保留你原话的全部动作细节，未删减
const WEDNESDAY_SHOULDER: PersonalDayTpl = {
  warmup: [
    "哈基米棘背龙形态：跪姿，手臂用力撑起身体，把肩胛骨顶高",
    "腰和下巴都贴住凳子，拿个哑铃往头顶正上方去推，练外旋",
  ],
  exercises: [
    {
      name: "压力侧平举（正手 + 反手）",
      muscle: "中束 · 前束",
      setsReps: "4 × 12-16",
      cue:
        "练肩之前必须已经让肩感受很强了再去做。反手：外旋位，往外掉，身体重心前倾，收腹，向远处扔；下去的时候不要下到底，否则张力就松了，尽量抬高——反手练三角肌前束，要在预先拉长的状态下再往上去做，这样就是练中前束。正手：内旋位，三角肌前束被预先缩短，中后束的参与更多、被拉长了。眼睛盯着正前方，头不要抬也不要低。练之前也可以先拉一拉肩膀。",
    },
    {
      name: "史密斯推肩",
      muscle: "肩 · 三头",
      setsReps: "4 × 8-12",
      cue:
        "站姿：对核心要求更高，对整体的效率更高，可以提高脊柱和躯干的刚性。坐姿：对肩部要求更高、更稳定，保证凳子是垂直位，肩的效率更高；腰贴不住就脚用力蹬，或者凳子向后仰一点。杠铃贴着鼻翼去做，推起来之后深吸一口气，把腰贴紧，再去推；下的时候到鼻尖就可以了，腰贴紧的情况下推得越高越好。做一组的时候尽量一口气做完，不要松掉了再去做，否则肌肉张力不够强，要保证持续发力做到力竭。",
    },
    {
      name: "侧平举",
      muscle: "中束",
      setsReps: "4 × 12-16",
      cue: "跟第一个（压力侧平举）一样：预先拉长再往上做，下去不要下到底，尽量抬高，保持张力。",
    },
    {
      name: "绳索面拉",
      muscle: "后束 · 上背",
      setsReps: "4 × 12-16",
      cue:
        "向头顶的位置去拉，把外展和外旋做到位；放手不要放到底，不要让肌肉松了，保持肌肉张力——肌肉效率更高，关节压力更小，不容易疼痛。一定要把动作质量做好。",
    },
    {
      name: "杠铃片前平举（哑铃也可以）",
      muscle: "前束",
      setsReps: "4 × 12-16",
      cue:
        "改善三角肌前束的柔韧性；前束最重要的功能就是前屈。可以微微含肩，但胸的锁骨下的肌肉会比较紧张，上胸发展会比较慢。重心微微前倾，保持核心稳定，尽可能抬高，下的时候不要下到底。",
    },
    {
      name: "坐姿反向飞鸟",
      muscle: "后束 · 中背",
      setsReps: "4 × 12-16",
      cue: "也可以放到第一个动作做；一直有做、喜欢的动作。",
    },
  ],
};

// 通用热身（各训练日默认；专属模板日用自己的热身）
const GENERIC_WARMUP: string[] = [
  "5 分钟提升心率：快走 / 划船机 / 开合跳（微喘但不累）",
  "当天要练的关节动态活动：肩绕环、髋绕环、徒手深蹲各 10 次",
  "第一个动作做 2 组递增组：空杆 × 12 → 50% 重量 × 8，然后进正式组",
];

// 命中某天的个人专属模板（周一胸日 / 周二背日 / 周三肩日），未命中返回 null
function specialTemplate(day: string, dayType: string): PersonalDayTpl | null {
  if (day === "周一" && dayType.includes("胸")) return MONDAY_CHEST;
  if (day === "周二" && dayType.includes("背")) return TUESDAY_BACK;
  if (day === "周三" && dayType.includes("肩")) return WEDNESDAY_SHOULDER;
  return null;
}

const PART_TPL: Record<string, DayType> = {
  胸: { name: "胸日", mix: { 蹲: 0, 推: 3, 拉: 1, 髋: 0 } },
  背: { name: "背日", mix: { 蹲: 0, 推: 1, 拉: 3, 髋: 0 } },
  肩: { name: "肩日", mix: { 蹲: 0, 推: 3, 拉: 1, 髋: 0 } },
  腿: { name: "腿日", mix: { 蹲: 2, 推: 0, 拉: 0, 髋: 2 } },
  "手臂": { name: "手臂日", mix: { 蹲: 0, 推: 2, 拉: 2, 髋: 0 } },
  臀: { name: "臀日", mix: { 蹲: 2, 推: 0, 拉: 0, 髋: 2 } },
  "核心": { name: "核心日", mix: { 蹲: 1, 推: 1, 拉: 1, 髋: 1 } },
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
    note = `每天盈余 250 大卡，增重控制在每月 1kg内——多出来的只会是脂肪。体重不涨两周，再加 100 大卡。`;
  }

  // 蛋白 2.0g/kg（增肌减脂期上限档）；脂肪 0.8g/kg 且不低于 45g（激素 + 脂溶性维生素保底）
  const protein = Math.round(kg * 2.0);
  const fat = Math.max(45, Math.round(kg * 0.8));
  // 碳水：按热量余量算，但封顶 4g/kg（训练日档位）——避免「余量全是碳水」把热量吃满、赤字清零
  const carbCap = Math.round(kg * 4.0);
  const carbRest = Math.round(kg * 3.0);
  const residual = Math.round((targetKcal - protein * 4 - fat * 9) / 4);
  const carb = Math.max(100, Math.min(residual, carbCap));

  return { bmr, tdee, targetKcal, targetLabel, protein, carb, carbRest, fat, note };
}

// ---------- 健身餐 / 采购 / 厨具 ----------
// 一餐的推荐组合拍平成文本行（兜底展示用；前端展示的是完整的食材搭配卡）
function comboLines(m: DietPlan["meals"][number]): string[] {
  return [
    `推荐组合：${m.combo.label}`,
    `合计：≈${m.combo.total.kcal}kcal · 蛋白 ${m.combo.total.p}g / 碳水 ${m.combo.total.c}g / 脂肪 ${m.combo.total.f}g`,
    `本餐目标：≈${m.target.kcal}kcal · 蛋白 ${m.target.p}g / 碳水 ${m.target.c}g / 脂肪 ${m.target.f}g`,
    `换着吃：${m.groups.find((g) => g.role === "蛋白")?.options.map((o) => `${o.name} ${o.portion}`).join(" / ") ?? ""}`,
  ];
}

function mealPlan(f: FitnessInput, macros: ReturnType<typeof nutrition>, diet: DietPlan): MealPlan {
  const P = macros.protein;

  const chickenDaily = Math.round(((P * 0.4) / 21) * 100 / 50) * 50;
  const chickenWeekly = Math.round((chickenDaily * 7) / 100) / 10;

  return {
    preWorkout: {
      when: diet.pre.when,
      items: diet.pre.items,
    },
    postWorkout: {
      when: diet.post.when,
      items: diet.post.items,
    },
    // 早/中/晚 由「食材搭配」单一口径生成（前端展示的是搭配卡，这几行只作兜底文本）
    meals: [
      { name: "早餐", items: comboLines(diet.meals[0]) },
      { name: "午餐", items: comboLines(diet.meals[1]) },
      { name: "加餐（下午）", items: diet.snack.items },
      { name: "晚餐", items: comboLines(diet.meals[2]) },
    ],
    shopping: [
      { item: "鸡胸肉（冷冻）", amount: `${chickenWeekly}kg / 周`, note: "按 100g 分装压平，解冻快 3 倍；山姆/麦德龙囤一个月更划算" },
      { item: "虾仁（冷冻）", amount: "1kg / 周", note: "蛋白高脂肪低，晚餐主力；已买，两周补一次" },
      { item: "鸡蛋", amount: "21 个 / 周", note: "早餐 3 个全蛋，最便宜的蛋白 + 脂肪来源" },
      { item: "瘦牛肉（牛腱/里脊）+ 龙利鱼", amount: "各 1kg / 周", note: "和鸡胸轮换吃，避免吃腻；分装冷冻" },
      { item: "即食鸡胸", amount: "4 袋 / 周", note: "应急兜底，别当主力（钠高）" },
      { item: "北豆腐 / 豆干", amount: "2 盒 / 周", note: "植物蛋白换口味" },
      { item: "燕麦", amount: "500g / 2 周", note: "无糖即食款，早餐 + 练前主力" },
      { item: "大米 / 熟饭分装", amount: "常备", note: "周日煮一周，150g 一份冷冻" },
      { item: "红薯", amount: "2kg / 周", note: "晚餐 300g 慢碳，电饭煲一锅蒸" },
      { item: "全麦面包 / 贝果", amount: "1 袋 / 周", note: "赶时间时的碳水替换" },
      { item: "西兰花 + 彩椒", amount: "各 1kg / 周", note: "新买的两样，每餐半盘；洗好沥干用厨房纸包" },
      { item: "菠菜 / 生菜 / 黄瓜 / 番茄", amount: "常备", note: "凑蔬菜体积，撑饱不超标" },
      { item: "香蕉 + 苹果", amount: "各 7 个 / 周", note: "香蕉练前 1 根快碳；香蕉不冷藏" },
      { item: "全脂牛奶", amount: "1.75L / 周", note: "每天 250ml，训练日 +8g 蛋白" },
      { item: "无糖希腊酸奶", amount: "4 杯 / 周", note: "下午加餐，缺蛋白时补" },
      { item: "坚果（每日坚果）", amount: "1 盒 / 2 周", note: "一天最多 10g，别整包抓" },
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
    stairClimber: stairClimberPlan(f),
  };
}

function stairClimberPlan(f: FitnessInput) {
  const age = parseFloat(f.profile.age) || 22;
  const hrMax = 220 - age;
  const lo = Math.round(hrMax * 0.6);
  const hi = Math.round(hrMax * 0.7);
  return {
    durationMin: 30,
    level: "5-7",
    hrZone: `${lo}-${hi} bpm`,
    slot: "下午加餐后 / 晚餐前（16:30 左右）",
    cues: [
      "目标心率区间 = (220 − 年龄) × 60-70%，保持鼻呼吸能讲短句的强度",
      "不握扶手：多消耗 ~10% 热量 + 额外练到臀腿核心",
      "阻力等级 5-7（健身房机器一般 1-20 标尺），太高会改用大腿前侧发力",
      "前 5 分钟当热身、最后 5 分钟降速收尾，中间 20 分钟维持强度",
      "只爬不跑：步频稳定，每一步踩实，禁止跳跃借力",
    ],
  };
}

function timeline(f: FitnessInput): string {
  const kg = parseFloat(f.profile.weight) || 65;
  const goal = parseFloat(f.profile.goalWeight ?? "");
  if (!goal || Math.abs(goal - kg) < 0.5) return "未设目标体重 · 按长期习惯养成为主";
  const delta = goal - kg;
  const cut = f.targets.includes("减脂") && !f.targets.includes("增肌");
  const weeks = Math.max(2, Math.ceil(Math.abs(delta) / (cut ? 0.35 : 0.25)));
  return `${kg}kg → ${goal}kg（约 ${weeks} 周）`;
}

// ---------- 工具：判断 userPicks 是否给了某个部位的动作 ----------
function picksFor(picks: Record<string, string[]> | undefined, part: string): Move[] {
  if (!picks) return [];
  const names = picks[part] ?? [];
  const out: Move[] = [];
  for (const n of names) {
    const m = findMove(n);
    if (m) out.push(m);
  }
  return out;
}

// ---------- 主生成器 ----------
export function generateFitnessPlan(f: FitnessInput): FitnessPlan {
  const kg = parseFloat(f.profile.weight) || 65;
  const gender = f.profile.gender;
  const macros = nutrition(f);
  const diet = buildDietPlan(macros);
  const exp = f.profile.exp;

  const useGym = f.places.includes("健身房");
  const useHome = f.places.includes("家里");
  const homeEq = f.equipment.filter((e) => ["哑铃", "弹力带", "单双杠", "徒手"].includes(e));
  const homePool = pool(homeEq.length ? homeEq : ["徒手", "弹力带"]);
  const gymPool = pool(f.equipment.length ? f.equipment : ["杠铃", "哑铃", "坐姿器械"]);

  const { types, custom: autoCustom } = dayTypes(f.weekdays.length, f.parts);
  const customPicks = !!f.userPicks && Object.keys(f.userPicks).some((p) => (f.userPicks?.[p] ?? []).length > 0);

  const schedule: DayPlan[] = ALL_DAYS.map((d) => {
    const idx = f.weekdays.indexOf(d);
    if (idx === -1) {
      return { day: d, type: "休息", place: "—", slot: "—", minutes: 0, exercises: [], warmup: [] };
    }
    const t = types[idx % types.length];
    // 命中个人专属模板日（周一胸日 / 周二背日）
    const tpl = specialTemplate(d, t.name);

    // 决定场地
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
    // 专属模板动作都在健身房完成
    if (tpl) place = "健身房";
    const slot = f.daySlots?.[d] ?? "暂定";

    // 动作选择：优先 userPicks > 个人专属模板（仅当该日命中且没自选）> 自动按 mix 排
    let ex: Exercise[];
    const pickMoves = picksFor(f.userPicks, inferPartFromType(t.name));
    if (pickMoves.length > 0) {
      ex = toEx(pickMoves, exp, kg, gender);
    } else if (tpl) {
      ex = tpl.exercises.map((e) => ({
        name: e.name,
        muscle: e.muscle,
        startWeight: startWeightByName(e.name, kg, gender, exp),
        setsReps: e.setsReps,
        rest: "90 秒",
        cue: e.cue,
      }));
    } else {
      ex = [
        ...toEx(pick(moves, "蹲", t.mix["蹲"]), exp, kg, gender),
        ...toEx(pick(moves, "推", t.mix["推"]), exp, kg, gender),
        ...toEx(pick(moves, "拉", t.mix["拉"]), exp, kg, gender),
        ...toEx(pick(moves, "髋", t.mix["髋"]), exp, kg, gender),
      ];
    }
    // 核心收尾（userPicks 含核心则不追加；专属模板日不追加平板）
    if (!ex.some((e) => isCoreMove(e.name)) && !tpl) {
      ex.push({
        name: "平板支撑",
        muscle: "核心",
        startWeight: "自重",
        setsReps: "3 × 45-60 秒",
        rest: "45 秒",
        cue: "收紧腰腹不塌腰，撑不住就停",
      });
    }

    const minutes = 10 + ex.reduce((s, e) => s + setCount(e), 0) * 2.5;
    const dayWarmup = tpl ? tpl.warmup : GENERIC_WARMUP;

    return {
      day: d,
      type: t.name,
      place,
      slot,
      minutes: Math.round(minutes / 5) * 5,
      exercises: ex,
      warmup: dayWarmup,
    };
  });

  const gymDays = schedule.filter((d) => d.place === "健身房").length;
  const homeDays = schedule.filter((d) => d.place === "家里").length;

  // 通用热身（兜底字段：旧版缓存的无按日 warmup 用；周一胸日专属热身已挂在 schedule 每一天上）
  const warmup: string[] = GENERIC_WARMUP;

  const notes: string[] = [
    "渐进超负荷：同样的动作，每周比上周多重 2.5kg 或多做 1-2 次，记进记录页——这是进步的唯一证据。",
    `吃法：不按「每天固定菜单」，按三餐食材搭配拼——每餐「蛋白 1 份 + 碳水 1 份 + 蔬菜管饱 + 脂肪按需」。蛋白封顶 ${macros.protein}g、碳水训练日 ≈${macros.carb}g / 休息日 ≈${macros.carbRest}g、脂肪 ≥${macros.fat}g。`,
    "每天喝水 = 体重(kg) × 35ml，够 7.5 小时。这两条做不到，吃练计划全白搭。",
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
  if (customPicks) {
    const total = Object.values(f.userPicks!).reduce((s, v) => s + v.length, 0);
    notes.push(`你自选了 ${total} 个动作，按你勾选的顺序编排——这才是适合你的练法。`);
  } else if (autoCustom) {
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
      splitName: customPicks
        ? "用户自定义"
        : autoCustom
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
      customPicks,
    },
    macros,
    diet,
    meals: mealPlan(f, macros, diet),
    warmup,
    schedule,
    progression: [
      { week: "第 1 周", focus: "建立基线", how: "按表里「起始重量」开练，找到每个动作 8-12 次接近力竭的实际重量并记下来，别瞎冲。" },
      { week: "第 2-3 周", focus: "线性加重", how: "每周比基线 +2.5kg（小肌群 +1-2 次）。加重后做不满 8 次就退回上一档。" },
      { week: "第 4 周", focus: "减量恢复", how: "重量降 30%，让关节和神经恢复。第 5 周带着新基线继续涨。" },
    ],
    notes,
  };
}

// 周一胸日专属动作的起重量计算（按动作名查 START_KG，其他按 Move 走不通）
function startWeightByName(name: string, kg: number, gender: string, exp: string): string {
  const coef = START_KG[name];
  if (!coef) {
    // 自重类（双杠臂屈伸、夹胸器坐姿）：按 RPE 给个起点提示
    if (name.includes("双杠")) return "自重（必要时挂杠铃片加重）";
    if (name.includes("夹胸")) return "看 RPE 7~8 起，先找到发力感";
    return "按 RPE 8 估";
  }
  let w = kg * coef;
  if (gender === "女") w *= 0.7;
  if (exp.startsWith("新手")) w *= 0.7;
  if (exp.startsWith("老手")) w *= 1.15;
  const rounded = Math.max(2.5, Math.round(w / 2.5) * 2.5);
  return `${rounded}kg`;
}

// 辅助：从日类型名推断部位关键词
function inferPartFromType(typeName: string): string {
  for (const part of Object.keys(PART_MUSCLES)) {
    if (typeName.includes(part)) return part;
  }
  return "";
}

// ---------- 导出供前端使用的工具 ----------
export function listAllMoves(): Move[] {
  const out: Move[] = [];
  for (const list of Object.values(LIB)) out.push(...list);
  return out.sort((a, b) => b.popularity - a.popularity);
}

export function movesByEquipment(): Record<string, Move[]> {
  return LIB;
}

export const ALL_PARTS = Object.keys(PART_MUSCLES);