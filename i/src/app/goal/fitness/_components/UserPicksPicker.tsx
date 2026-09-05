"use client";
import { useMemo } from "react";
import { movesByEquipment } from "@/lib/fitness";
import type { FitnessInput } from "@/lib/fitness";

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
          return (
            <button
              key={m.name}
              onClick={() => onToggle(m.name)}
              className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-left transition-all active:scale-95 ${
                isPicked
                  ? "border-emerald-500 bg-emerald-950/40 text-emerald-200"
                  : "border-zinc-800 bg-zinc-950/40 text-zinc-400"
              }`}
            >
              <span className="flex-1 text-xs leading-tight">{m.name}</span>
              <span className="ml-2 flex shrink-0 items-center gap-1 text-[9px]">
                <HotBadge popularity={m.popularity} />
                {isPicked && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-zinc-950">
                    {idx + 1}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
