"use client";

import { useEffect, useRef, useState } from "react";
import type { FitnessInput, FitnessPlan } from "@/lib/fitness";
import PlanView from "./PlanView";

// ---------- 选项定义 ----------
type Opt = { value: string; label: string; sub?: string; emoji: string };

const TARGETS: Opt[] = [
  { value: "减脂", label: "减脂", sub: "降体脂 · 见腹肌", emoji: "🔥" },
  { value: "增肌", label: "增肌", sub: "涨维度 · 涨力量", emoji: "💪" },
  { value: "塑形", label: "塑形", sub: "练出薄肌线条", emoji: "✨" },
];

const PLACES: Opt[] = [
  { value: "健身房", label: "健身房", sub: "器械全 · 氛围强", emoji: "🏟️" },
  { value: "家里", label: "家里", sub: "省通勤 · 随时开练", emoji: "🏠" },
  { value: "户外", label: "户外", sub: "跑跳 · 单双杠", emoji: "🌳" },
];

const GYM_FROM: Opt[] = [
  { value: "从家", label: "从家出发", sub: "练完回家", emoji: "🏠" },
  { value: "从公司", label: "从公司出发", sub: "下班顺路练", emoji: "🏢" },
  { value: "都行", label: "家或公司", sub: "两边都方便", emoji: "🔁" },
];

const DISTANCES: Opt[] = [
  { value: "步行可达（≤1km）", label: "≤1km", sub: "步行可达", emoji: "🚶" },
  { value: "近（1-3km）", label: "1-3km", sub: "骑车 10 分钟", emoji: "🚴" },
  { value: "中等（3-5km）", label: "3-5km", sub: "通勤约 15 分钟", emoji: "🛵" },
  { value: "很远（>5km）", label: ">5km", sub: "通勤成本高", emoji: "🚌" },
];

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

const SLOT_NAMES = ["清晨", "午间", "傍晚", "夜间"];
const SLOT_SUB: Record<string, string> = { 清晨: "6-9点", 午间: "12-14点", 傍晚: "17-20点", 夜间: "20-23点" };

const EQUIPMENT: Opt[] = [
  { value: "杠铃哑铃", label: "杠铃哑铃", sub: "自由重量区", emoji: "🏋️" },
  { value: "固定器械", label: "固定器械", sub: "安全 · 好上手", emoji: "🔧" },
  { value: "弹力带", label: "弹力带", sub: "在家神器", emoji: "🎗️" },
  { value: "徒手", label: "徒手", sub: "零器械", emoji: "🤸" },
];

const STEP_TITLES = [
  "你想达成什么？",
  "打算在哪里练？",
  "健身房的情况",
  "每周哪几天练？",
  "每天什么时候练？",
  "能用什么器械？",
  "你的基本信息",
];

const STEP_HINTS = [
  "可多选 · 减脂+增肌会走「身体重组」路线",
  "可多选 · 选了健身房+家里，我会帮你分配哪天去哪练",
  "从哪出发 · 离多远（只在家练可跳过）",
  "可多选 · 选几天就是几天，1-7 天都行",
  "每个练的日子选一个时段，我会按作息排场地",
  "可多选 · 决定给你排什么动作",
  "体脂率不确定可以先不填，目标体重选填",
];

// ---------- 卡片组件 ----------
function Card({
  opt,
  selected,
  onClick,
  cols,
}: {
  opt: Opt;
  selected: boolean;
  onClick: () => void;
  cols: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all active:scale-95 ${
        selected
          ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
          : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600"
      } ${cols === 4 ? "min-h-[84px]" : "min-h-[110px]"}`}
    >
      <span className={cols === 4 ? "text-xl" : "text-2xl"}>{opt.emoji}</span>
      <span className="mt-1.5 text-sm font-medium">{opt.label}</span>
      {opt.sub && (
        <span className={`mt-1 text-[11px] ${selected ? "text-emerald-500/80" : "text-zinc-500"}`}>{opt.sub}</span>
      )}
      {selected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] text-zinc-950">
          ✓
        </span>
      )}
    </button>
  );
}

// ---------- 主表单 ----------
export default function FitnessForm() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<FitnessPlan | null>(null);
  const [restored, setRestored] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FitnessInput>({
    targets: [],
    places: [],
    gymFrom: "从家",
    gymDistance: "",
    weekdays: [],
    daySlots: {},
    equipment: [],
    profile: {
      gender: "男",
      age: "22",
      height: "175",
      weight: "65",
      bodyFat: "",
      goalWeight: "",
      exp: "新手（<半年）",
    },
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

  function toggle(field: "targets" | "places" | "equipment", value: string) {
    const arr = form[field];
    setForm({ ...form, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] });
  }

  function toggleDay(day: string) {
    if (form.weekdays.includes(day)) {
      const rest = { ...(form.daySlots ?? {}) };
      delete rest[day];
      setForm({ ...form, weekdays: form.weekdays.filter((d) => d !== day), daySlots: rest });
    } else {
      setForm({
        ...form,
        weekdays: [...form.weekdays, day],
        daySlots: { ...(form.daySlots ?? {}), [day]: "傍晚" },
      });
    }
  }

  function setDaySlot(day: string, slot: string) {
    setForm({ ...form, daySlots: { ...(form.daySlots ?? {}), [day]: slot } });
  }

  function goTo(i: number) {
    const c = containerRef.current;
    if (!c) return;
    setStep(i);
    c.scrollTo({ top: i * c.clientHeight, behavior: "smooth" });
  }

  function onScroll() {
    const c = containerRef.current;
    if (!c) return;
    const i = Math.round(c.scrollTop / c.clientHeight);
    if (i !== step && i >= 0 && i < STEP_TITLES.length) setStep(i);
  }

  const numOk = (v: string) => {
    const n = parseFloat(v);
    return !Number.isNaN(n) && n > 0;
  };

  const needGym = form.places.includes("健身房");

  function canNext(): boolean {
    switch (step) {
      case 0:
        return form.targets.length > 0;
      case 1:
        return form.places.length > 0;
      case 2:
        return needGym ? form.gymDistance !== "" : true;
      case 3:
        return form.weekdays.length > 0;
      case 4:
        return form.weekdays.length > 0 && form.weekdays.every((d) => form.daySlots?.[d]);
      case 5:
        return form.equipment.length > 0;
      case 6:
        return numOk(form.profile.age) && numOk(form.profile.height) && numOk(form.profile.weight);
      default:
        return true;
    }
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
      if (data?.plan) setPlan(data.plan as FitnessPlan);
    } catch {
      alert("生成失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  function next() {
    if (step < STEP_TITLES.length - 1) goTo(step + 1);
    else submit();
  }

  function restart() {
    setPlan(null);
    setStep(0);
    setForm({
      targets: [],
      places: [],
      gymFrom: "从家",
      gymDistance: "",
      weekdays: [],
      daySlots: {},
      equipment: [],
      profile: {
        gender: "男",
        age: "22",
        height: "175",
        weight: "65",
        bodyFat: "",
        goalWeight: "",
        exp: "新手（<半年）",
      },
    });
    requestAnimationFrame(() => containerRef.current?.scrollTo({ top: 0 }));
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
        <p className="mt-5 text-sm text-zinc-400">正在排你的专属吃练计划…</p>
        <p className="mt-1 text-xs text-zinc-600">分化逻辑 + 营养公式 · 本地计算，不花钱</p>
      </div>
    );
  }

  if (plan) return <PlanView plan={plan} onRestart={restart} />;
  if (!restored) return null;

  const gridCls = (n: 2 | 3 | 4) =>
    n === 4 ? "grid grid-cols-4 gap-2.5" : n === 3 ? "grid grid-cols-3 gap-3" : "grid grid-cols-2 gap-3";

  const inputCls =
    "w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-center text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none";

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-lg flex-col">
      {/* 顶部：返回 + 进度 */}
      <div className="flex items-center gap-3 px-5 pt-5">
        <a href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ←
        </a>
        <div className="flex flex-1 gap-1">
          {STEP_TITLES.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-emerald-500" : "bg-zinc-800"}`}
            />
          ))}
        </div>
        <span className="text-xs tabular-nums text-zinc-500">
          {step + 1}/{STEP_TITLES.length}
        </span>
      </div>

      {/* 上下滑动的步骤容器 */}
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 snap-y snap-mandatory overflow-y-auto scroll-smooth overscroll-contain"
      >
        {/* 1 训练目标 */}
        <section className="flex min-h-full snap-start snap-always flex-col justify-center px-5 pb-28 pt-8">
          <h1 className="text-2xl font-bold">{STEP_TITLES[0]}</h1>
          <p className="mt-1.5 text-xs text-zinc-500">{STEP_HINTS[0]}</p>
          <div className={`mt-8 ${gridCls(3)}`}>
            {TARGETS.map((o) => (
              <Card key={o.value} opt={o} cols={3} selected={form.targets.includes(o.value)} onClick={() => toggle("targets", o.value)} />
            ))}
          </div>
        </section>

        {/* 2 场地 */}
        <section className="flex min-h-full snap-start snap-always flex-col justify-center px-5 pb-28 pt-8">
          <h1 className="text-2xl font-bold">{STEP_TITLES[1]}</h1>
          <p className="mt-1.5 text-xs text-zinc-500">{STEP_HINTS[1]}</p>
          <div className={`mt-8 ${gridCls(3)}`}>
            {PLACES.map((o) => (
              <Card key={o.value} opt={o} cols={3} selected={form.places.includes(o.value)} onClick={() => toggle("places", o.value)} />
            ))}
          </div>
        </section>

        {/* 3 健身房情况：出发点 + 距离 */}
        <section className="flex min-h-full snap-start snap-always flex-col justify-center px-5 pb-28 pt-8">
          <h1 className="text-2xl font-bold">{STEP_TITLES[2]}</h1>
          <p className="mt-1.5 text-xs text-zinc-500">{STEP_HINTS[2]}</p>
          <p className="mt-6 text-xs text-zinc-500">平时从哪出发去健身房？</p>
          <div className={`mt-2.5 ${gridCls(3)}`}>
            {GYM_FROM.map((o) => (
              <Card key={o.value} opt={o} cols={3} selected={form.gymFrom === o.value} onClick={() => setForm({ ...form, gymFrom: o.value })} />
            ))}
          </div>
          <p className="mt-5 text-xs text-zinc-500">健身房离多远？</p>
          <div className={`mt-2.5 ${gridCls(2)}`}>
            {DISTANCES.map((o) => (
              <Card
                key={o.value}
                opt={o}
                cols={2}
                selected={form.gymDistance === o.value}
                onClick={() => setForm({ ...form, gymDistance: o.value })}
              />
            ))}
          </div>
        </section>

        {/* 4 一周哪几天 */}
        <section className="flex min-h-full snap-start snap-always flex-col justify-center px-5 pb-28 pt-8">
          <h1 className="text-2xl font-bold">{STEP_TITLES[3]}</h1>
          <p className="mt-1.5 text-xs text-zinc-500">{STEP_HINTS[3]}</p>
          <div className={`mt-8 ${gridCls(4)}`}>
            {WEEKDAYS.map((d) => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`flex min-h-[84px] flex-col items-center justify-center rounded-2xl border p-3 transition-all active:scale-95 ${
                  form.weekdays.includes(d)
                    ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <span className="text-sm font-medium">{d}</span>
                {form.daySlots?.[d] && <span className="mt-1 text-[10px] text-emerald-500/80">{form.daySlots[d]}</span>}
              </button>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-zinc-500">
            已选 <span className="text-emerald-400">{form.weekdays.length}</span> 天
            {form.weekdays.length >= 6 && " · 高频党，注意安排恢复"}
          </p>
        </section>

        {/* 5 每天的时段 */}
        <section className="flex min-h-full snap-start snap-always flex-col justify-center px-5 pb-28 pt-8">
          <h1 className="text-2xl font-bold">{STEP_TITLES[4]}</h1>
          <p className="mt-1.5 text-xs text-zinc-500">{STEP_HINTS[4]}</p>
          <div className="mt-6 space-y-4">
            {form.weekdays.length === 0 && (
              <p className="text-center text-sm text-zinc-500">先上一步选好练哪几天</p>
            )}
            {form.weekdays.map((d) => (
              <div key={d}>
                <p className="mb-2 text-sm font-medium text-zinc-200">{d}</p>
                <div className="grid grid-cols-4 gap-2">
                  {SLOT_NAMES.map((s) => {
                    const on = form.daySlots?.[d] === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setDaySlot(d, s)}
                        className={`rounded-xl border py-2.5 text-center transition-all active:scale-95 ${
                          on ? "border-emerald-500 bg-emerald-950/60 text-emerald-300" : "border-zinc-800 bg-zinc-900/60 text-zinc-300"
                        }`}
                      >
                        <span className="block text-xs font-medium">{s}</span>
                        <span className={`block text-[10px] ${on ? "text-emerald-500/80" : "text-zinc-500"}`}>{SLOT_SUB[s]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6 器械 */}
        <section className="flex min-h-full snap-start snap-always flex-col justify-center px-5 pb-28 pt-8">
          <h1 className="text-2xl font-bold">{STEP_TITLES[5]}</h1>
          <p className="mt-1.5 text-xs text-zinc-500">{STEP_HINTS[5]}</p>
          <div className={`mt-8 ${gridCls(2)}`}>
            {EQUIPMENT.map((o) => (
              <Card key={o.value} opt={o} cols={2} selected={form.equipment.includes(o.value)} onClick={() => toggle("equipment", o.value)} />
            ))}
          </div>
        </section>

        {/* 7 个人信息 */}
        <section className="flex min-h-full snap-start snap-always flex-col justify-center px-5 pb-28 pt-8">
          <h1 className="text-2xl font-bold">{STEP_TITLES[6]}</h1>
          <p className="mt-1.5 text-xs text-zinc-500">{STEP_HINTS[6]}</p>
          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-4 gap-2.5">
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
              {[
                { k: "age" as const, label: "年龄" },
                { k: "height" as const, label: "身高cm" },
                { k: "weight" as const, label: "体重kg" },
              ].map(({ k, label }) => (
                <div key={k}>
                  <input
                    inputMode="numeric"
                    placeholder={label}
                    value={form.profile[k]}
                    onChange={(e) => setForm({ ...form, profile: { ...form.profile, [k]: e.target.value } })}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                inputMode="decimal"
                placeholder="体脂率 %（选填）"
                value={form.profile.bodyFat}
                onChange={(e) => setForm({ ...form, profile: { ...form.profile, bodyFat: e.target.value } })}
                className={inputCls}
              />
              <input
                inputMode="decimal"
                placeholder="目标体重 kg（选填）"
                value={form.profile.goalWeight}
                onChange={(e) => setForm({ ...form, profile: { ...form.profile, goalWeight: e.target.value } })}
                className={inputCls}
              />
              <p className="col-span-2 text-center text-[10px] leading-4 text-zinc-600">
                填了体脂率用 Katch-McArdle 公式更准 · 目标体重会算出预计达标周数（男生腹肌隐约可见 ≈ 15%）
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs text-zinc-500">训练经验</p>
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
        </section>
      </div>

      {/* 底部操作栏 */}
      <div className="absolute inset-x-0 bottom-0 border-t border-zinc-800/60 bg-zinc-950/85 px-5 pb-6 pt-3 backdrop-blur">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => goTo(step - 1)} className="rounded-full px-4 py-2.5 text-sm text-zinc-500 hover:text-zinc-300">
              上一步
            </button>
          )}
          <button
            onClick={next}
            disabled={!canNext()}
            className="flex-1 rounded-full bg-emerald-600 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {step === STEP_TITLES.length - 1 ? "🔥 生成我的吃练计划" : "下一步"}
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-zinc-600">上下滑动也可切换步骤</p>
      </div>
    </div>
  );
}
