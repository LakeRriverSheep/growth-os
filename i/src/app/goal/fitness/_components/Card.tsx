"use client";
import type { Opt } from "../_constants";

// 通用卡片按钮：emoji + 文字 + 可选图片。badge 用于显示勾选顺序
export default function Card({
  opt,
  selected,
  onClick,
  cols = 3,
  badge,
}: {
  opt: Opt;
  selected: boolean;
  onClick: () => void;
  cols?: number;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border p-3.5 text-center transition-all active:scale-95 ${
        selected
          ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
          : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600"
      } ${cols >= 4 ? "min-h-[76px]" : "min-h-[96px]"}`}
    >
      <span className={cols >= 4 ? "text-lg" : "text-xl"}>{opt.emoji}</span>
      <span className="mt-1 text-sm font-medium">{opt.label}</span>
      {opt.sub && (
        <span className={`mt-0.5 text-[10px] ${selected ? "text-emerald-500/80" : "text-zinc-500"}`}>
          {opt.sub}
        </span>
      )}
      {selected && (
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-zinc-950">
          {badge ?? "✓"}
        </span>
      )}
    </button>
  );
}
