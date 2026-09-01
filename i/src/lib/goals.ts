export type Question = {
  key: string;
  question: string;
  options: string[];
};

export type Goal = {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  deadline: string;
  progress: number;
  questions: Question[];
};

export const goals: Goal[] = [
  {
    id: "fitness",
    emoji: "💪",
    title: "健身",
    desc: "练出薄肌（提升骨骼肌，当前 23.9kg）",
    deadline: "长期",
    progress: 0,
    questions: [
      {
        key: "frequency",
        question: "每周能练几天？",
        options: ["3 天", "4 天", "5 天及以上"],
      },
      {
        key: "venue",
        question: "在哪里练？",
        options: ["健身房", "家里（无器械为主）", "家里（有哑铃/弹力带）"],
      },
      {
        key: "focus",
        question: "这一阶段最想要什么？",
        options: ["增肌（骨骼肌 23.9kg → 提升）", "减脂（体脂 19.7% → 更低）", "都要，慢慢来"],
      },
    ],
  },
  {
    id: "ielts",
    emoji: "🗣️",
    title: "雅思",
    desc: "口语 8.0（27 年考试）",
    deadline: "2027",
    progress: 0,
    questions: [
      {
        key: "when",
        question: "打算什么时候考？",
        options: ["2027 上半年", "2027 下半年", "还没定"],
      },
      {
        key: "time",
        question: "每天能投入多少时间练口语？",
        options: ["30 分钟", "1 小时", "2 小时以上"],
      },
      {
        key: "weak",
        question: "最弱的是哪块？",
        options: ["Part 3 深度讨论", "流利度（说不顺）", "词汇/地道表达"],
      },
    ],
  },
  {
    id: "music",
    emoji: "🎹",
    title: "音乐",
    desc: "电子琴入门（后续加吉他）",
    deadline: "长期",
    progress: 0,
    questions: [
      {
        key: "instrument",
        question: "先练哪个？",
        options: ["电子琴", "吉他"],
      },
      {
        key: "time",
        question: "每天练多久？",
        options: ["15 分钟", "30 分钟", "1 小时"],
      },
      {
        key: "target",
        question: "第一阶段的验收标准？",
        options: ["弹熟 1 首完整曲子", "左右手独立配合", "能即兴配和弦"],
      },
    ],
  },
  {
    id: "software",
    emoji: "⌨️",
    title: "软件",
    desc: "精通软件工程，做出这个产品本身",
    deadline: "长期",
    progress: 1,
    questions: [
      {
        key: "pace",
        question: "每周投入开发的时间？",
        options: ["5 小时以内", "5-15 小时", "15 小时以上"],
      },
      {
        key: "focus",
        question: "当前最想先打通哪块？",
        options: ["前端页面开发", "后端接口 + 数据库", "AI 接入"],
      },
    ],
  },
  {
    id: "money",
    emoji: "💰",
    title: "赚钱",
    desc: "独立产品产生第一笔收入",
    deadline: "待定",
    progress: 0,
    questions: [
      {
        key: "path",
        question: "第一笔收入打算从哪来？",
        options: ["自媒体流量变现", "产品付费功能", "接单/兼职"],
      },
      {
        key: "milestone",
        question: "第一笔收入的目标金额？",
        options: ["1 元（先跑通）", "100 元", "1000 元"],
      },
    ],
  },
];

export function getGoal(id: string): Goal | undefined {
  return goals.find((g) => g.id === id);
}
