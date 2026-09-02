"use client";

import { useState } from "react";

type Profile = {
  gender: "男" | "女";
  age: string;
  height: string;
  weight: string;
  exp: "新手（<半年）" | "有些基础（半年-2年）" | "老手（2年+）";
};

type Form = {
  targets: string[];
  places: string[];
  equipment: string[];
  days: string;
  profile: Profile;
};

const STEPS = ["训练目标", "场地", "器械", "频率", "你的信息"] as const;

const TARGET_OPTIONS = ["减脂", "增肌", "塑形（练出薄肌）"];
const PLACE_OPTIONS = ["健身房", "家里", "户外"];
const EQUIP_OPTIONS = ["杠铃哑铃", "固定器械", "弹力带", "徒手"];
const DAY_OPTIONS = ["3 天", "4 天", "5 天", "6 天+"];

export default function FitnessForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({
    targets: [],
    places: [],
    equipment: [],
    days: "",
    profile: { gender: "男", age: "22", height: "175", weight: "65", exp: "新手（<半年）" },
  });
  const [plan, setPlan] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(field: "targets" | "places" | "equipment", value: string) {
    const arr = form[field];
    setForm({
      ...form,
      [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
    });
  }

  function canNext(): boolean {
    if (step === 0) return form.targets.length > 0;
    if (step === 1) return form.places.length > 0;
    if (step === 2) return form.equipment.length > 0;
    if (step === 3) return form.days !== "";
    return true;
  }

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: "fitness",
          answers: { ...form },
        }),
      });
      const data = await res.json();
      setPlan(data.plan);
    } catch {
      setPlan(["生成失败，请稍后重试。"]);
    } finally {
      setLoading(false);
    }
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      submit();
    }
  }

  function restart() {
    setStep(0);
    setForm({
      targets: [],
      places: [],
      equipment: [],
      days: "",
      profile: { gender: "男", age: "22", height: "175", weight: "65", exp: "新手（<半年）" },
    });
    setPlan(null);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
        <p className="mt-4 text-sm text-zinc-400">正在计算你的专属吃练计划…</p>
      </div>
    );
  }

  if (plan) {
    return (
      <div>
        <div className="rounded-2xl border border-emerald-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-emerald-400">
            ✅ 你的 4 周吃练计划（已生成）
          </h2>
          <ul className="mt-4 space-y-3">
            {plan.map((p, i) => (
              <li key={i} className="flex gap-3 text-sm leading-6 text-zinc-200">
                <span className="text-emerald-500">{i + 1}.</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={restart}
          className="mt-4 rounded-full border border-zinc-700 px-5 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
        >
          重新填写
        </button>
      </div>
    );
  }

  const chip = (selected: boolean) =>
    `rounded-xl border px-4 py-2.5 text-sm transition-colors ${
      selected
        ? "border-emerald-500 bg-emerald-950 text-emerald-300"
        : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
    }`;

  const inputCls =
    "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      {/* 进度 */}
      <div className="mb-5 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-emerald-500" : "bg-zinc-800"}`}
          />
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        第 {step + 1} / {STEPS.length} 步 · {STEPS[step]}
      </p>

      {step === 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">你想达成什么？（可多选）</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {TARGET_OPTIONS.map((t) => (
              <button key={t} onClick={() => toggle("targets", t)} className={chip(form.targets.includes(t))}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">在哪里练？（可多选）</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {PLACE_OPTIONS.map((p) => (
              <button key={p} onClick={() => toggle("places", p)} className={chip(form.places.includes(p))}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">能用什么器械？（可多选）</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {EQUIP_OPTIONS.map((e) => (
              <button key={e} onClick={() => toggle("equipment", e)} className={chip(form.equipment.includes(e))}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">每周能练几天？</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setForm({ ...form, days: d })}
                className={chip(form.days === d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">你的基本信息</h2>
          <div className="mt-4 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs text-zinc-400">性别</label>
                <div className="flex gap-2">
                  {(["男", "女"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setForm({ ...form, profile: { ...form.profile, gender: g } })}
                      className={`${chip(form.profile.gender === g)} flex-1`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-28">
                <label className="mb-1.5 block text-xs text-zinc-400">年龄</label>
                <input
                  type="number"
                  value={form.profile.age}
                  onChange={(e) => setForm({ ...form, profile: { ...form.profile, age: e.target.value } })}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs text-zinc-400">身高（cm）</label>
                <input
                  type="number"
                  value={form.profile.height}
                  onChange={(e) => setForm({ ...form, profile: { ...form.profile, height: e.target.value } })}
                  className={inputCls}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-xs text-zinc-400">体重（kg）</label>
                <input
                  type="number"
                  value={form.profile.weight}
                  onChange={(e) => setForm({ ...form, profile: { ...form.profile, weight: e.target.value } })}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-zinc-400">训练经验</label>
              <div className="flex flex-wrap gap-2">
                {(["新手（<半年）", "有些基础（半年-2年）", "老手（2年+）"] as const).map((e) => (
                  <button
                    key={e}
                    onClick={() => setForm({ ...form, profile: { ...form.profile, exp: e } })}
                    className={chip(form.profile.exp === e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-4">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            ← 上一步
          </button>
        )}
        <button
          onClick={next}
          disabled={!canNext()}
          className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {step === STEPS.length - 1 ? "生成我的计划" : "下一步"}
        </button>
      </div>
    </div>
  );
}
