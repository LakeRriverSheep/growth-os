"use client";
import { useMemo, useState } from "react";
import { movesByEquipment } from "@/lib/fitness";
import type { FitnessInput } from "@/lib/fitness";
import { getMoveImage } from "./moveImages";

// 部位 → 该动作是否归属此部位（与引擎 PART_MUSCLES + 测试规则对齐）
function muscleMatchesPart(muscle: string, part: string): boolean {
  const map: Record<string, RegExp[]> = {
    胸: [/胸/, /前锯/],
    背: [/背/, /斜方/, /竖脊/, /后束/],
    腿: [/股四头/, /腘绳/, /臀/],
    肩: [/束/, /肩/, /斜方/],
    手臂: [/二头/, /三头/, /前臂/],
    臀: [/臀/, /腘绳/],
    核心: [/核心/, /腹直肌/, /下腹/],
  };
  const pats = map[part];
  if (!pats) return false;
  return pats.some((p) => p.test(muscle));
}

// 已选部位 → 这些部位涵盖的动作（按器械分组，按热度排序）
function usePicksByPart(form: FitnessInput) {
  return useMemo(() => {
    const lib = movesByEquipment();
    const result: Record<string, Record<string, { name: string; popularity: number; difficulty: string }[]>> = {};
    for (const part of form.parts) {
      result[part] = {};
      for (const eq of form.equipment) {
        const moves = (lib[eq] ?? []).filter((m) => muscleMatchesPart(m.muscle, part));
        if (moves.length === 0) continue;
        result[part][eq] = moves
          .map((m) => ({ name: m.name, popularity: m.popularity, difficulty: m.difficulty }))
          .sort((a, b) => b.popularity - a.popularity);
      }
    }
    return result;
  }, [form.parts, form.equipment]);
}

// 动作热度图标
function HotBadge({ popularity }: { popularity: number }) {
  if (popularity >= 9) return <span className="text-orange-400">🔥</span>;
  if (popularity >= 7) return <span className="text-zinc-500">★</span>;
  return null;
}

// 自选动作三级选择：部位 → 器械 → 动作
export default function UserPicksPicker({
  form,
  togglePick,
}: {
  form: FitnessInput;
  togglePick: (part: string, name: string) => void;
}) {
  const data = usePicksByPart(form);
  const totalPicked = Object.values(form.userPicks ?? {}).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-xl bg-zinc-900/60 px-4 py-2.5 text-xs text-zinc-400">
        <span>已选部位 · {form.parts.length} 个</span>
        <span className={totalPicked > 0 ? "text-emerald-400" : ""}>
          已勾动作 · {totalPicked} 个
          {totalPicked > 0 && " · 按你勾选顺序训练"}
        </span>
      </div>
      {form.parts.map((part) => (
        <PartGroup
          key={part}
          part={part}
          eqMap={data[part] ?? {}}
          picked={form.userPicks?.[part] ?? []}
          onToggle={(name) => togglePick(part, name)}
        />
      ))}
      <p className="text-center text-[10px] text-zinc-600">
        提示：🔥 = 热门首选 · ★ = 主流高效 · 数字 = 你的勾选顺序
      </p>
    </div>
  );
}

// 单个部位区块
function PartGroup({
  part,
  eqMap,
  picked,
  onToggle,
}: {
  part: string;
  eqMap: Record<string, { name: string; popularity: number; difficulty: string }[]>;
  picked: string[];
  onToggle: (name: string) => void;
}) {
  const eqs = Object.keys(eqMap);
  if (eqs.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-xs text-zinc-500">
        「{part}」在当前器械下没有可用动作。勾上对应的器械后再来挑。
      </div>
    );
  }
  return (
    <details open className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-zinc-200">
        <span>
          🫁 {part} <span className="text-xs text-zinc-500">· {eqs.length} 种器械</span>
        </span>
        <span className="text-xs text-zinc-500">{picked.length} 已选</span>
      </summary>
      <div className="space-y-4 px-4 pb-4">
        {eqs.map((eq) => (
          <EquipmentGroup key={eq} eq={eq} moves={eqMap[eq]} picked={picked} onToggle={onToggle} />
        ))}
      </div>
    </details>
  );
}

// 单个器械下的动作列表
function EquipmentGroup({
  eq,
  moves,
  picked,
  onToggle,
}: {
  eq: string;
  moves: { name: string; popularity: number; difficulty: string }[];
  picked: string[];
  onToggle: (name: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-300">{eq}</p>
        <p className="text-[10px] text-zinc-600">按热度排序 🔥</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {moves.map((m) => {
          const isPicked = picked.includes(m.name);
          const idx = picked.indexOf(m.name);
          const img = getMoveImage(m.name);
          return (
            <div
              key={m.name}
              className={`group relative flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-all ${
                isPicked
                  ? "border-emerald-500 bg-emerald-950/40 text-emerald-200"
                  : "border-zinc-800 bg-zinc-950/40 text-zinc-400"
              }`}
            >
              {/* 缩略图（点击展开大图） */}
              {img ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreview(preview === m.name ? null : m.name);
                  }}
                  className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-zinc-800 transition-transform hover:scale-110"
                  title="点击查看大图"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={m.name} className="h-full w-full object-cover" loading="lazy" />
                </button>
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-800/60 text-[10px] text-zinc-600">
                  {eq.slice(0, 2)}
                </span>
              )}

              {/* 动作名 + 勾选 */}
              <button
                type="button"
                onClick={() => onToggle(m.name)}
                className="flex min-w-0 flex-1 items-center justify-between gap-1 text-left active:scale-95"
              >
                <span className="flex-1 truncate text-xs leading-tight">{m.name}</span>
                <span className="flex shrink-0 items-center gap-1 text-[9px]">
                  <HotBadge popularity={m.popularity} />
                  {isPicked && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-zinc-950">
                      {idx + 1}
                    </span>
                  )}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* 大图预览浮层 */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-6"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getMoveImage(preview)}
              alt={preview}
              className="w-full rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="mt-3 text-center text-sm font-medium text-zinc-200">{preview}</p>
            <p className="mt-1 text-center text-xs text-zinc-500">点击任意处关闭 · 图源 wger.de</p>
          </div>
        </div>
      )}
    </div>
  );
}
