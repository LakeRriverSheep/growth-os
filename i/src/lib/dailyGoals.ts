// 每日目标：量化目标 + 厉害的人的具体行为 + 认知/见识/能力清单
// 量化目标的 value 存 daily_goals（按天），行为与清单勾选存 check_items（item 前缀 me:）

export type Quota = {
  key: string;
  label: string;
  unit: string; // 小时 / 节
  daily: number; // 每日目标量
  week: number; // 每周至少达成次数，0 = 不限
  how: string;
};

// ① 每日量化目标（当天完成量 ≥ daily 记一次达成）
export const QUOTAS: Quota[] = [
  {
    key: "ielts",
    label: "雅思",
    unit: "小时",
    daily: 3,
    week: 5,
    how: "分板块练：听力精听 / 阅读精读 / 口语录音 / 写作仿写，每天 3 小时以上",
  },
  {
    key: "fitness",
    label: "健身",
    unit: "小时",
    daily: 1.5,
    week: 3,
    how: "力量训练日优先，有氧日补足；每次至少 1.5 小时",
  },
  {
    key: "study",
    label: "专业课",
    unit: "节",
    daily: 1,
    week: 0,
    how: "软件工程网课每天至少认真听完 1 节，不快进、不二倍速糊弄",
  },
];

// ② 厉害的人每天会做的具体行为（不是口号，是可勾选的动作）
export const BEHAVIORS: { key: string; label: string; desc: string }[] = [
  {
    key: "top3",
    label: "起床先定 3 件必做",
    desc: "起床第一件事写下今天必须完成的 3 件事，写完才碰别的",
  },
  {
    key: "deep",
    label: "一段 90 分钟深度工作",
    desc: "手机放另一个房间，中途不切换窗口；做不完就换任务，不内疚",
  },
  {
    key: "input",
    label: "输入 30 分钟并留痕",
    desc: "书 / 长视频 / 播客，必须写一句总结或笔记，否则不算",
  },
  {
    key: "output",
    label: "输出一次",
    desc: "写 300 字或录 1 分钟口播，把输入变成自己的表达",
  },
  {
    key: "body",
    label: "身体动起来",
    desc: "训练或快走 30 分钟以上；久坐每小时起来活动 2 分钟",
  },
  {
    key: "review",
    label: "睡前复盘 5 分钟",
    desc: "今天做成了什么、为什么、明天改哪一件事——写具体行为，不写情绪",
  },
  {
    key: "brave",
    label: "做一件以前会拖的事",
    desc: "发那条消息、开口提那个要求、把东西交出去",
  },
  {
    key: "alien",
    label: "接触一个陌生领域",
    desc: "艺术 / 科学 / 历史 / 商业，随便挑一个今天看 10 分钟",
  },
  {
    key: "money",
    label: "记一笔账",
    desc: "当天花了多少记下来，月末只看「钱去哪了」不看余额",
  },
  {
    key: "people",
    label: "和一个人真实说话",
    desc: "面对面或通话，说真话；不靠网络点赞代替真实关系",
  },
];

// ③ 认知 · 见识 · 能力清单：长期建档，达成即勾（不是每天刷，是一年建起来的资产）
export const COMPETENCE: { group: string; items: { key: string; label: string; desc: string }[] }[] =
  [
    {
      group: "认知 · 怎么想",
      items: [
        { key: "c1", label: "第一性原理", desc: "把问题拆到不能再拆，再往上重建结论" },
        { key: "c2", label: "复利与时间观", desc: "理解为什么每天 3 小时比周末 26 小时有用" },
        { key: "c3", label: "沉没成本与止损", desc: "投入过不等于要继续，及时砍掉沉没项目" },
        { key: "c4", label: "边际收益与优先级", desc: "先做影响面最大的那件事" },
        { key: "c5", label: "二阶思维", desc: "想后果的后果，别只看眼前得失" },
        { key: "c6", label: "概率与期望", desc: "用概率思考，别赌单一结果" },
        { key: "c7", label: "情绪与注意力管理", desc: "能识别自己在被什么驱动，也能切断它" },
        { key: "c8", label: "复盘归因", desc: "对事不对人，归因到可改的下一步" },
      ],
    },
    {
      group: "见识 · 见得多",
      items: [
        { key: "k1", label: "不同生活样本", desc: "不同国家、阶层的人怎么活，怎么看待钱和工作" },
        { key: "k2", label: "经济与金融常识", desc: "看懂钱怎么运转，不做金融小白" },
        { key: "k3", label: "历史与地理", desc: "世界怎么走到今天，避免把现在当永恒" },
        { key: "k4", label: "哲学与思想史", desc: "有一套判断事情的底层价值观" },
        { key: "k5", label: "艺术与审美", desc: "音乐、电影、绘画、摄影——审美是可以练的" },
        { key: "k6", label: "身体科学", desc: "营养、睡眠、运动生理，别用偏方对付身体" },
        { key: "k7", label: "科技与 AI 边界", desc: "知道 AI 能做什么、不能做什么" },
        { key: "k8", label: "人和社会", desc: "阶层、规则、博弈，看懂自己所处的环境" },
      ],
    },
    {
      group: "能力 · 做得到",
      items: [
        { key: "a1", label: "结构化表达", desc: "写作和口播都能讲清一件事的结构" },
        { key: "a2", label: "一对一沟通与谈判", desc: "能谈条件、能拒绝、也能争取" },
        { key: "a3", label: "项目拆解与管理", desc: "大目标拆到今天能动手的一步" },
        { key: "a4", label: "快速学新领域的方法", desc: "有自己的一套学习路径，不靠课程堆" },
        { key: "a5", label: "解决问题的框架", desc: "定义问题 → 拆解 → 假设 → 验证" },
        { key: "a6", label: "审美与设计判断", desc: "能分辨好与坏，并说出为什么" },
        { key: "a7", label: "动手做东西", desc: "代码、作品、内容，能从想法到成品" },
        { key: "a8", label: "讲故事与销售自己", desc: "让陌生人愿意听你讲完" },
        { key: "a9", label: "辨别信息真假", desc: "查来源、看数据、不被情绪带走" },
        { key: "a10", label: "协作与带队", desc: "能让别人一起把事做成" },
      ],
    },
    {
      group: "杠杆 · 放大器",
      items: [
        { key: "l1", label: "AI 当放大器", desc: "把 AI 用成执行加速器，而不是替代思考" },
        { key: "l2", label: "数据与自动化", desc: "能记录、能统计、能自动提醒自己" },
        { key: "l3", label: "公开输出", desc: "持续对外发布，积累属于自己的资产" },
      ],
    },
  ];
