// 雅思备考常量：目标、场景、题型、口语骨架
// 目标 7.5 · 截止 2026-12-28 · 12 月初预约考试

export const IELTS_TARGET = 7.5;
export const IELTS_DEADLINE = "2026-12-28"; // 12 月 28 号前
export const IELTS_BOOKING_HINT = "12 月初预约考位 · 交报名费";
export const IELTS_DAILY_HOURS = 3;

/** 距离截止还有几天（按本地日期算） */
export function daysLeft(from = new Date()): number {
  const [y, m, d] = IELTS_DEADLINE.split("-").map(Number);
  const end = new Date(y, m - 1, d);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.max(0, Math.round((end.getTime() - today.getTime()) / 86400000));
}

// ---------- 听力场景 ----------
export const LISTENING_SCENES = [
  "求职",
  "经营管理",
  "地理",
  "旅游",
  "日常生活",
  "建筑环境",
  "健康医疗",
  "住宿",
  "运动",
  "图书馆",
  "保险",
  "新生入学",
  "作业讨论",
  "人文社科",
  "生物",
  "课题研究",
] as const;

// ---------- 阅读场景 ----------
export const READING_SCENES = [
  "历史发展",
  "自然科技",
  "社会人文",
  "生态环保",
  "语言教育",
  "生物研究",
  "财经商业",
  "医疗健康",
] as const;

// ---------- 写作 ----------
export const TASK1_TYPES = [
  "柱状图",
  "表格",
  "曲线图",
  "饼状图",
  "混合图",
  "地图",
  "流程图",
] as const;

export const TASK2_TOPICS = [
  "全部",
  "教育类",
  "科技类",
  "传统与文化类",
  "城市化与全球化",
  "政府类",
  "环境类",
  "媒体类",
  "社会生活类",
  "抽象类",
] as const;

export const TASK2_TYPES = [
  "全部",
  "同意与否题",
  "利弊比较题",
  "双边讨论题",
  "报告类",
] as const;

// ---------- 口语 ----------
export const SPEAKING_PARTS = ["Part 1", "Part 2", "Part 3"] as const;

/** Part 1 · ARE 法：Answer-Reason-Example */
export const PART1_FRAME = [
  { step: "A", name: "回应句", hint: "直接给态度：积极 / 中性 / 否定，脱口而出" },
  { step: "R", name: "展开句", hint: "给一个理由，because / since / the thing is..." },
  { step: "E", name: "举例细节句", hint: "具体一次经历或数字，just the other day..." },
  { step: "S", name: "收束句", hint: "收一下：so yeah, that's basically why..." },
];

/** Part 2 · PPF 法：Past-Present-Future */
export const PART2_FRAME = [
  { step: "开场", name: "开场句", hint: "I'd like to talk about ... which ..." },
  { step: "Past", name: "过去", hint: "背景、怎么开始的、第一次" },
  { step: "Present", name: "现在", hint: "现在的状态、细节、感受" },
  { step: "Future", name: "未来 + 收束", hint: "打算、影响、总结一句" },
];

/** Part 3 · 7 步骨架：同一套框架套不同话题 */
export const PART3_STEPS: {
  n: number;
  template: string;
  func: string;
}[] = [
  {
    n: 1,
    template:
      "That's a thought-provoking question. Well, from my perspective, I'd argue that [观点], primarily because [原因].",
    func: "开场回应 + 核心观点 + 理由",
  },
  {
    n: 2,
    template: "For instance, if we look at [领域/国家/群体], we can see that [具体现象].",
    func: "举例证据",
  },
  {
    n: 3,
    template: "Having said that, I also think it's important to acknowledge that [反面观点].",
    func: "让步：展示批判性思维",
  },
  {
    n: 4,
    template: "When comparing [A] and [B], I think the key difference lies in [核心差异].",
    func: "对比深化分析",
  },
  {
    n: 5,
    template: "And looking ahead, I suppose [未来趋势], though it's hard to say for certain.",
    func: "展望预测",
  },
  {
    n: 6,
    template:
      "So, taking everything into consideration, I believe [总结观点], but there's certainly more than one way to look at it.",
    func: "收束归位",
  },
];

/** Part 3 同骨架的 8 个话题：橙色 = 内容词（要自己填） */
export const PART3_TOPICS: {
  title: string;
  fills: string[];
}[] = [
  {
    title: "远程办公是否会让城市消失",
    fills: [
      "remote work won't make cities obsolete",
      "people still crave face-to-face interaction",
      "coworking hubs in second-tier cities",
      "some jobs simply need physical presence",
      "offices vs. home setups",
      "the rhythm of collaboration",
      "cities will shrink but not vanish",
    ],
  },
  {
    title: "人工智能会不会取代老师",
    fills: [
      "AI won't fully replace teachers",
      "a big part of teaching is emotional support",
      "rural schools with limited staff",
      "not every child learns well from a screen",
      "AI tutors vs. human mentors",
      "who takes responsibility for a child's growth",
      "teachers will shift into coaching roles",
    ],
  },
  {
    title: "年轻人还应该买房吗",
    fills: [
      "buying a flat is no longer the default choice",
      "mobility matters more to young workers",
      "rental markets in first-tier cities",
      "homeownership still means stability for many families",
      "renting vs. owning",
      "security vs. flexibility",
      "more young people will delay buying",
    ],
  },
  {
    title: "社交媒体让人更孤独了吗",
    fills: [
      "social media has deepened loneliness",
      "online contact often replaces real conversation",
      "teenagers who scroll for hours",
      "it also helps people find their community",
      "online interaction vs. face-to-face bonds",
      "the quality of attention",
      "we'll rethink how we use these apps",
    ],
  },
  {
    title: "旅游业对本地文化是保护还是破坏",
    fills: [
      "tourism damages local culture more than it protects it",
      "traditions get repackaged for visitors",
      "old towns turned into photo spots",
      "tourist money does fund restoration",
      "authentic life vs. staged performances",
      "who controls the story",
      "slow travel will grow",
    ],
  },
  {
    title: "大学教育应该更实用吗",
    fills: [
      "universities should be more practical",
      "graduates need job-ready skills",
      "engineering programmes with industry placements",
      "a purely vocational degree ages badly",
      "skills vs. critical thinking",
      "how fast knowledge goes out of date",
      "degrees will blend both",
    ],
  },
  {
    title: "政府该不该限制私家车",
    fills: [
      "governments should limit private cars",
      "congestion is a collective problem",
      "city centres with congestion charging",
      "people in rural areas have no alternative",
      "public transport vs. private convenience",
      "who pays the price",
      "car ownership will slowly decline",
    ],
  },
  {
    title: "广告对儿童的影响要不要管",
    fills: [
      "advertising aimed at children should be regulated",
      "children can't yet judge persuasive intent",
      "snack ads during cartoons",
      "outright bans are hard to enforce",
      "protection vs. parental responsibility",
      "where the line should be drawn",
      "rules will get stricter",
    ],
  },
];

// ---------- 每日固定备考清单（勾选用，落库 check_items） ----------
export const DAILY_ITEMS = [
  { key: "wake", label: "起床流程", desc: "喝水 → 上厕所 → 煮热水 → 麦片+鸡蛋 → 黑咖啡" },
  { key: "listen", label: "听力精听 ≥1 场景", desc: "完整听 → 选答案 → 再听 2-3 遍 → 记生词和句子" },
  { key: "read", label: "阅读场景练习 1 篇", desc: "按场景做 → 记同义替换和句子" },
  { key: "speak", label: "口语录音 + 复习昨日题", desc: "中文想清楚 → 英文说 + 录音 → 昨日题再答一遍" },
  { key: "write", label: "写作一篇", desc: "Task 1 / Task 2 交替，按题型或话题" },
  { key: "hours", label: "今日投入 ≥3 小时", desc: "累计计时，没到就补" },
];
