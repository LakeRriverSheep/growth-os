// 周记录的数据模型 + 分类配色（纯函数，供前端与 API 共用）

export type JournalKind = "meal" | "train" | "study" | "music" | "life";

export const JOURNAL_KIND_LIST: JournalKind[] = ["meal", "train", "study", "music", "life"];

export const JOURNAL_KIND_META: Record<
  JournalKind,
  { label: string; emoji: string; dot: string; chip: string }
> = {
  meal: { label: "饮食", emoji: "🍚", dot: "bg-orange-400", chip: "border-orange-400/40 bg-orange-500/15 text-orange-300" },
  train: { label: "健身", emoji: "💪", dot: "bg-emerald-400", chip: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" },
  study: { label: "学习", emoji: "📖", dot: "bg-sky-400", chip: "border-sky-400/40 bg-sky-500/15 text-sky-300" },
  music: { label: "钢琴", emoji: "🎹", dot: "bg-violet-400", chip: "border-violet-400/40 bg-violet-500/15 text-violet-300" },
  life: { label: "生活", emoji: "✨", dot: "bg-amber-400", chip: "border-amber-400/40 bg-amber-500/15 text-amber-300" },
};

export function isJournalKind(v: unknown): v is JournalKind {
  return typeof v === "string" && (JOURNAL_KIND_LIST as string[]).includes(v);
}

/** 一条图文记录 */
export type JournalEntry = {
  id: number;
  date: string; // YYYY-MM-DD
  kind: JournalKind;
  title: string;
  body: string;
  images: string[]; // 图片 URL 列表
  updated_at: string;
};
