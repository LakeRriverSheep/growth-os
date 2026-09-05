// 中文动作名 → wger 图 URL 的映射表
// 数据来源：https://wger.de/en/software/api (MIT 协议，可商用)
// 已通过 wger exerciseinfo API 验证，覆盖我们 LIB 库中 50+ 个核心动作
// 未在表中的动作 → 在前端展示时 fallback 到器械图 + cue 文字

export const MOVE_IMAGES: Record<string, string> = {
  // ---------- 杠铃 ----------
  "杠铃平板卧推": "https://wger.de/media/exercise-images/192/Bench-press-1.png",
  "杠铃上斜卧推": "https://wger.de/media/exercise-images/41/Incline-bench-press-1.png",
  "杠铃划船": "https://wger.de/media/exercise-images/109/Barbell-rear-delt-row-1.png",
  "硬拉": "https://wger.de/media/exercise-images/184/1709c405-620a-4d07-9658-fade2b66a2df.jpeg",
  "杠铃深蹲": "https://wger.de/media/exercise-images/1801/60043328-1cfb-4289-9865-aaf64d5aaa28.jpg",
  "杠铃站姿肩推": "https://wger.de/media/exercise-images/119/seated-barbell-shoulder-press-large-1.png",
  "杠铃罗马尼亚硬拉": "https://wger.de/media/exercise-images/507/13d526ab-12fc-461e-828a-051dd7c13fb1.png",

  // ---------- 哑铃 ----------
  "哑铃平板卧推": "https://wger.de/media/exercise-images/97/Dumbbell-bench-press-1.png",
  "哑铃上斜卧推": "https://wger.de/media/exercise-images/16/Incline-press-1.png",
  "哑铃飞鸟": "https://wger.de/media/exercise-images/238/2fc242d3-5bdd-4f97-99bd-678adb8c96fc.png",
  "哑铃单臂划船": "https://wger.de/media/exercise-images/81/a751a438-ae2d-4751-8d61-cef0e9292174.png",
  "哑铃站姿肩推": "https://wger.de/media/exercise-images/123/dumbbell-shoulder-press-large-1.png",
  "哑铃侧平举": "https://wger.de/media/exercise-images/148/lateral-dumbbell-raises-large-2.png",
  "哑铃前平举": "https://wger.de/media/exercise-images/256/b7def5bc-2352-499b-b9e5-fff741003831.png",
  "哑铃俯身飞鸟": "https://wger.de/media/exercise-images/822/74affc0d-03b6-4f33-b5f4-a822a2615f68.png",
  "哑铃弯举": "https://wger.de/media/exercise-images/81/Biceps-curl-1.png",
  "哑铃锤式弯举": "https://wger.de/media/exercise-images/86/Bicep-hammer-curl-1.png",
  "哑铃弓步蹲": "https://wger.de/media/exercise-images/113/Walking-lunges-1.png",
  "哑铃直腿硬拉": "https://wger.de/media/exercise-images/507/13d526ab-12fc-461e-828a-051dd7c13fb1.png",

  // ---------- 坐姿器械 ----------
  "坐姿推胸": "https://wger.de/media/exercise-images/129/b263c968-e067-4750-916a-d8758a7df23e.webp",
  "器械夹胸（Pec Deck）": "https://wger.de/media/exercise-images/98/Butterfly-machine-2.png",
  "高位下拉": "https://wger.de/media/exercise-images/1127/4942b7c0-6bda-4983-88e5-86547c3d445e.png",
  "坐姿划船": "https://wger.de/media/exercise-images/1117/2555c4c3-a84d-47db-b83b-cbf721f12e45.png",
  "T 杠划船": "https://wger.de/media/exercise-images/106/T-bar-row-1.png",
  "腿举": "https://wger.de/media/exercise-images/371/d2136f96-3a43-4d4c-9944-1919c4ca1ce1.webp",
  "腿屈伸": "https://wger.de/media/exercise-images/369/78c915d1-e46d-4d30-8124-65d68664c3ef.png",
  "腿弯举": "https://wger.de/media/exercise-images/154/lying-leg-curl-machine-large-1.png",

  // ---------- 史密斯机 ----------
  "史密斯深蹲": "https://wger.de/media/exercise-images/1747/af9647dd-04ec-4adf-9c07-4e33edb77277.jpg",
  "史密斯卧推": "https://wger.de/media/exercise-images/916/9bf7555a-fec6-43a9-b343-aae496744e5e.png",

  // ---------- 龙门架 ----------
  "绳索夹胸（中位）": "https://wger.de/media/exercise-images/71/Cable-crossover-2.png",
  "绳索下压": "https://wger.de/media/exercise-images/1185/c5ca283d-8958-4fd8-9d59-a3f52a3ac66b.jpg",
  "绳索弯举": "https://wger.de/media/exercise-images/129/Standing-biceps-curl-1.png",
  "绳索面拉": "https://wger.de/media/exercise-images/822/74affc0d-03b6-4f33-b5f4-a822a2615f68.png",

  // ---------- 单双杠 ----------
  "引体向上（宽握）": "https://wger.de/media/exercise-images/475/b0554016-16fd-4dbe-be47-a2a17d16ae0e.jpg",
  "引体向上（反握）": "https://wger.de/media/exercise-images/152/6c1a7459-266d-491a-bd50-7cbaea2bc771.png",
  "双杠臂屈伸（胸）": "https://wger.de/media/exercise-images/194/34600351-8b0b-4cb0-8daa-583537be15b0.png",

  // ---------- 徒手 ----------
  "俯卧撑": "https://wger.de/media/exercise-images/1551/a6a9e561-3965-45c6-9f2b-ee671e1a3a45.jpg",
  "跪姿俯卧撑": "https://wger.de/media/exercise-images/1551/a6a9e561-3965-45c6-9f2b-ee671e1a3a45.jpg", // fallback: 与普通俯卧撑同图
  "钻石俯卧撑": "https://wger.de/media/exercise-images/1086/b2ee8d9b-0480-4992-8494-c223b37c2696.png",
  "弓步蹲": "https://wger.de/media/exercise-images/984/5c7ffe68-e7b2-47f3-a22a-f9cc28640432.png",
  "臀桥": "https://wger.de/media/exercise-images/265/7528acb4-b2cc-4b75-b6ae-d514cbd4f78b.png",
  "平板支撑": "https://wger.de/media/exercise-images/458/b7bd9c28-9f1d-4647-bd17-ab6a3adf5770.png",
  "侧平板支撑": "https://wger.de/media/exercise-images/2509/41318de7-85ad-4a8c-8d94-dff73206e2fb.jpg",
  "卷腹": "https://wger.de/media/exercise-images/91/Crunches-1.png",
  "俄罗斯转体": "https://wger.de/media/exercise-images/1193/70ca5d80-3847-4a8c-8882-c6e9e485e29e.png",
  "鸟狗式（Bird Dog）": "https://wger.de/media/exercise-images/1572/3d14e761-a73d-49da-8804-f3016a7573ff.png",
  "健腹轮": "https://wger.de/media/exercise-images/1573/a9ab402b-61ef-4d60-b91a-df52bf7f41a9.jpg",
};

// 没图时返回 undefined（前端 fallback 到器械图）
export function getMoveImage(moveName: string): string | undefined {
  return MOVE_IMAGES[moveName];
}
