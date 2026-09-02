"use client";

import { useEffect, useState } from "react";
import type { FitnessInput, FitnessPlan } from "@/lib/fitness";
import PlanView from "./PlanView";

// ---------- 选项定义 ----------
type Opt = { value: string; label: string; sub?: string; emoji: string };

const TARGETS: Opt[] = [
  { value: "减脂", label: "减脂", sub: "降体脂 · 见腹肌", emoji: "🔥" },
  { value: "增肌", label: "增肌", sub: "涨维度 · 涨力量", emoji: "💪" },
  { value: "塑形", label: "塑形", sub: "练出薄肌线条", emoji: "✨" },
];

const PARTS: Opt[] = [
  { value: "胸", label: "胸", emoji: "🫁" },
  { value: "背", label: "背", emoji: "🦾" },
  { value: "肩", label: "肩", emoji: "🏔️" },
  { value: "腿", label: "腿", emoji: "🦵" },
  { value: "手臂", label: "手臂", emoji: "💪" },
  { value: "臀", label: "臀", emoji: "🍑" },
  { value: "核心", label: "核心", emoji: "🎯" },
];

const PLACES: Opt[] = [
  { value: "健身房", label: "健身房", sub: "器械全 · 氛围强", emoji: "🏟️" },
  { value: "家里", label: "家里", sub: "省通勤 · 随时开练", emoji: "🏠" },
  { value: "户外", label: "户外", sub: "跑跳 · 单双杠", emoji: "🌳" },
];

const GYM_POINTS: Opt[] = [
  { value: "家", label: "家", emoji: "🏠" },
  { value: "学校", label: "学校", emoji: "🏫" },
  { value: "公司", label: "公司", emoji: "🏢" },
  { value: "其他", label: "其他", emoji: "📍" },
];

const DISTANCES: Opt[] = [
  { value: "步行可达（≤1km）", label: "≤1km", sub: "步行可达", emoji: "🚶" },
  { value: "近（1-3km）", label: "1-3km", sub: "骑车 10 分钟", emoji: "🚴" },
  { value: "中等（3-5km）", label: "3-5km", sub: "通勤约 15 分钟", emoji: "🛵" },
  { value: "很远（>5km）", label: ">5km", sub: "通勤成本高", emoji: "🚌" },
];

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const SLOT_NAMES = ["清晨", "午间", "傍晚", "夜间", "暂定"];
const SLOT_SUB: Record<string, string> = {
  清晨: "6-9点",
  午间: "12-14点",
  傍晚: "17-20点",
  夜间: "20-23点",
  暂定: "还没定",
};

const EQUIPMENT: Opt[] = [
  { value: "杠铃", label: "杠铃", sub: "深蹲架 · 卧推架", emoji: "🏋️" },
  { value: "哑铃", label: "哑铃", sub: "家里也能用", emoji: "🥇" },
  { value: "龙门架", label: "龙门架", sub: "绳索 · 夹胸下压", emoji: "🔗" },
  { value: "史密斯机", label: "史密斯机", sub: "固定轨迹", emoji: "⚙️" },
  { value: "坐姿器械", label: "坐姿器械", sub: "推胸下拉腿举", emoji: "🔧" },
  { value: "弹力带", label: "弹力带", sub: "在家神器", emoji: "🎗️" },
  { value: "单双杠", label: "单双杠", sub: "引体 · 臂屈伸", emoji: "🤸" },
  { value: "徒手", label: "徒手", sub: "零器械", emoji: "🧍" },
];

// ---------- 卡片组件 ----------
function Card({
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
  badge?: number; // 点击顺序序号
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center rounded-2xl border p-3.5 text-center transition-all active:scale-95 ${
        selected
          ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
          : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600"
      } ${cols >= 4 ? "min-h-[76px]" : "min-h-[96px]"}`}
    >
      <span className={cols >= 4 ? "text-lg" : "text-xl"}>{opt.emoji}</span>
      <span className="mt-1 text-sm font-medium">{opt.label}</span>
      {opt.sub && (
        <span className={`mt-0.5 text-[10px] ${selected ? "text-emerald-500/80" : "text-zinc-500"}`}>{opt.sub}</span>
      )}
      {selected && (
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-zinc-950">
          {badge ?? "✓"}
        </span>
      )}
    </button>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-6">
      <h2 className="text-xl font-bold">{title}</h2>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// ---------- 主表单（单页长滚动，底部固定提交条） ----------
export default function FitnessForm() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<FitnessPlan | null>(null);
  const [restored, setRestored] = useState(false);

  const [form, setForm] = useState<FitnessInput>({
    targets: [],
    parts: [],
    places: [],
    gymPoints: [],
    weekdays: [],
    daySlots: {},
    equipment: [],
    profile: { gender: "", age: "", height: "", weight: "", bodyFat: "", goalWeight: "", exp: "" },
  });

  // 进入页面时恢复已保存的计划
  useEffect(() => {
    fetch("/api/plan?goalId=fitness")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.source === "fitness-calc" && data.plan && !Array.isArray(data.plan)) {
          setPlan(data.plan as FitnessPlan);
        }
      })
      .catch(() => {})
      .finally(() => setRestored(true));
  }, []);

  function toggleArr(field: "targets" | "places" | "equipment", value: string) {
    const arr = form[field];
    setForm({ ...form, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] });
  }

  // 部位：点击顺序即训练顺序
  function togglePart(p: string) {
    setForm({
      ...form,
      parts: form.parts.includes(p) ? form.parts.filter((v) => v !== p) : [...form.parts, p],
    });
  }

  // 出发点：多选 + 各点距离
  function togglePoint(p: string) {
    const has = form.gymPoints.some((g) => g.point === p);
    setForm({
      ...form,
      gymPoints: has
        ? form.gymPoints.filter((g) => g.point !== p)
        : [...form.gymPoints, { point: p, distance: "" }],
    });
  }

  function setPointDistance(p: string, distance: string) {
    setForm({
      ...form,
      gymPoints: form.gymPoints.map((g) => (g.point === p ? { ...g, distance } : g)),
    });
  }

  function toggleDay(day: string) {
    if (form.weekdays.includes(day)) {
      const rest = { ...form.daySlots };
      delete rest[day];
      setForm({ ...form, weekdays: form.weekdays.filter((d) => d !== day), daySlots: rest });
    } else {
      setForm({
        ...form,
        weekdays: [...form.weekdays, day],
        daySlots: { ...form.daySlots, [day]: "暂定" },
      });
    }
  }

  function setDaySlot(day: string, slot: string) {
    setForm({ ...form, daySlots: { ...form.daySlots, [day]: slot } });
  }

  const numOk = (v: string) => {
    const n = parseFloat(v);
    return !Number.isNaN(n) && n > 0;
  };

  const needGym = form.places.includes("健身房");

  function canSubmit(): boolean {
    if (form.targets.length === 0) return false;
    if (form.places.length === 0) return false;
    if (needGym && form.gymPoints.length === 0) return false;
    if (needGym && form.gymPoints.some((g) => !g.distance)) return false;
    if (form.weekdays.length === 0) return false;
    if (form.equipment.length === 0) return false;
    if (!form.profile.gender || !form.profile.exp) return false;
    if (!numOk(form.profile.age) || !numOk(form.profile.height) || !numOk(form.profile.weight)) return false;
    return true;
  }

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: "fitness", answers: form }),
      });
      const data = await res.json();
      if (data?.plan) {
        setPlan(data.plan as FitnessPlan);
        window.scrollTo({ top: 0 });
      }
    } catch {
      alert("生成失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setPlan(null);
    setForm({
      targets: [],
      parts: [],
      places: [],
      gymPoints: [],
      weekdays: [],
      daySlots: {},
      equipment: [],
      profile: { gender: "", age: "", height: "", weight: "", bodyFat: "", goalWeight: "", exp: "" },
    });
    window.scrollTo({ top: 0 });
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
        <p className="mt-5 text-sm text-zinc-400">正在排你的专属吃练计划…</p>
        <p className="mt-1 text-xs text-zinc-600">本地计算，不花 AI 的钱</p>
      </div>
    );
  }

  if (plan) return <PlanView plan={plan} onRestart={restart} />;
  if (!restored) return null;

  const inputCls =
    "w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-center text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none";

  return (
    <div className="mx-auto max-w-lg px-5 pb-32 pt-5">
      <a href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← 返回
      </a>
      <h1 className="mt-3 text-2xl font-bold">💪 定制你的健身计划</h1>
      <p className="mt-1 text-xs text-zinc-500">从上往下填完，底部一键生成 · 越诚实，计划越能执行</p>

      {/* 1 训练目标 */}
      <Section title="你想达成什么？" hint="可多选 · 减脂+增肌会走「身体重组」路线">
        <div className="grid grid-cols-3 gap-3">
          {TARGETS.map((o) => (
            <Card key={o.value} opt={o} selected={form.targets.includes(o.value)} onClick={() => toggleArr("targets", o.value)} />
          ))}
        </div>
      </Section>

      {/* 2 想练的部位 */}
      <Section title="想练哪些部位？" hint="可多选 · 点选顺序 = 每周训练顺序（不选则自动分化）">
        <div className="grid grid-cols-4 gap-2.5">
          {PARTS.map((o) => (
            <Card
              key={o.value}
              opt={o}
              cols={4}
              selected={form.parts.includes(o.value)}
              badge={form.parts.indexOf(o.value) + 1}
              onClick={() => togglePart(o.value)}
            />
          ))}
        </div>
        {form.parts.length > 0 && (
          <p className="mt-2 text-center text-xs text-zinc-500">训练顺序：{form.parts.join(" → ")}</p>
        )}
      </Section>

      {/* 3 场地 */}
      <Section title="打算在哪里练？" hint="可多选 · 选健身房+家里，我会帮你分配哪天去哪练">
        <div className="grid grid-cols-3 gap-3">
          {PLACES.map((o) => (
            <Card key={o.value} opt={o} selected={form.places.includes(o.value)} onClick={() => toggleArr("places", o.value)} />
          ))}
        </div>
      </Section>

      {/* 4 出发点（多选）+ 各点距离 */}
      <Section title="平时从哪出发去健身房？" hint="可多选 · 每个出发点各选一个距离">
        <div className="grid grid-cols-4 gap-2.5">
          {GYM_POINTS.map((o) => (
            <Card
              key={o.value}
              opt={o}
              cols={4}
              selected={form.gymPoints.some((g) => g.point === o.value)}
              onClick={() => togglePoint(o.value)}
            />
          ))}
        </div>
        {form.gymPoints.map((g) => (
          <div key={g.point} className="mt-3">
            <p className="mb-2 text-xs text-zinc-400">从「{g.point}」到健身房多远？</p>
            <div className="grid grid-cols-4 gap-2">
              {DISTANCES.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setPointDistance(g.point, d.value)}
                  className={`rounded-xl border py-2 text-center transition-all active:scale-95 ${
                    g.distance === d.value
                      ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-300"
                  }`}
                >
                  <span className="block text-xs font-medium">{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </Section>

      {/* 5 每周哪几天 + 每天时段 */}
      <Section title="每周哪几天练？" hint="点选日子后，在下方直接选那天的时段（可以选暂定）">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => {
            const on = form.weekdays.includes(d);
            return (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`flex min-h-[64px] flex-col items-center justify-center rounded-xl border transition-all active:scale-95 ${
                  on ? "border-emerald-500 bg-emerald-950/60 text-emerald-300" : "border-zinc-800 bg-zinc-900/60 text-zinc-400"
                }`}
              >
                <span className="text-xs font-medium">{d.replace("周", "")}</span>
                {on && <span className="mt-0.5 text-[9px] text-emerald-500/80">{form.daySlots[d]}</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-xs text-zinc-500">
          已选 <span className="text-emerald-400">{form.weekdays.length}</span> 天
          {form.weekdays.length >= 6 && " · 高频党，注意安排恢复"}
        </p>
        {form.weekdays.map((d) => (
          <div key={d} className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-zinc-300">{d} 什么时候练？</p>
            <div className="grid grid-cols-5 gap-1.5">
              {SLOT_NAMES.map((s) => {
                const on = form.daySlots[d] === s;
                return (
                  <button
                    key={s}
                    onClick={() => setDaySlot(d, s)}
                    className={`rounded-lg border py-2 text-center transition-all active:scale-95 ${
                      on ? "border-emerald-500 bg-emerald-950/60 text-emerald-300" : "border-zinc-800 bg-zinc-900/60 text-zinc-400"
                    }`}
                  >
                    <span className="block text-[11px] font-medium">{s}</span>
                    <span className={`block text-[9px] ${on ? "text-emerald-500/80" : "text-zinc-600"}`}>{SLOT_SUB[s]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Section>

      {/* 6 器械 */}
      <Section title="能用什么器械？" hint="可多选 · 健身房全选，家里有的也勾上，我会分开排">
        <div className="grid grid-cols-4 gap-2.5">
          {EQUIPMENT.map((o) => (
            <Card
              key={o.value}
              opt={o}
              cols={4}
              selected={form.equipment.includes(o.value)}
              onClick={() => toggleArr("equipment", o.value)}
            />
          ))}
        </div>
      </Section>

      {/* 7 基本信息（无默认值，单位在标签） */}
      <Section title="你的基本信息" hint="全空着，如实填 · 体脂率和目标体重不确定可不填">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">性别</label>
              <div className="grid grid-cols-2 gap-2">
                {(["男", "女"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setForm({ ...form, profile: { ...form.profile, gender: g } })}
                    className={`rounded-xl border py-2.5 text-sm transition-colors ${
                      form.profile.gender === g
                        ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-300"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">年龄（岁）</label>
              <input
                inputMode="numeric"
                placeholder="如 23"
                value={form.profile.age}
                onChange={(e) => setForm({ ...form, profile: { ...form.profile, age: e.target.value } })}
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">身高（cm）</label>
              <input
                inputMode="numeric"
                placeholder="如 175"
                value={form.profile.height}
                onChange={(e) => setForm({ ...form, profile: { ...form.profile, height: e.target.value } })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">体重（kg）</label>
              <input
                inputMode="decimal"
                placeholder="如 65"
                value={form.profile.weight}
                onChange={(e) => setForm({ ...form, profile: { ...form.profile, weight: e.target.value } })}
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">体脂率（%，选填）</label>
              <input
                inputMode="decimal"
                placeholder="男生腹肌隐约可见≈15"
                value={form.profile.bodyFat}
                onChange={(e) => setForm({ ...form, profile: { ...form.profile, bodyFat: e.target.value } })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">目标体重（kg，选填）</label>
              <input
                inputMode="decimal"
                placeholder="会算预计达标周数"
                value={form.profile.goalWeight}
                onChange={(e) => setForm({ ...form, profile: { ...form.profile, goalWeight: e.target.value } })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-zinc-500">训练经验</label>
            <div className="grid grid-cols-3 gap-2.5">
              {(["新手（<半年）", "有些基础（半年-2年）", "老手（2年+）"] as const).map((e) => (
                <button
                  key={e}
                  onClick={() => setForm({ ...form, profile: { ...form.profile, exp: e } })}
                  className={`rounded-xl border px-1 py-2.5 text-xs leading-4 transition-colors ${
                    form.profile.exp === e
                      ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-300"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 底部固定提交条 */}
      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-800/60 bg-zinc-950/90 px-5 pb-6 pt-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          <button
            onClick={submit}
            disabled={!canSubmit()}
            className="w-full rounded-full bg-emerald-600 py-3.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-30"
          >
            🔥 生成我的吃练计划
          </button>
          {!canSubmit() && (
            <p className="mt-2 text-center text-[10px] text-zinc-600">
              填完目标 / 场地 / 出发点距离 / 练哪几天 / 器械 / 基本信息后即可生成
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
