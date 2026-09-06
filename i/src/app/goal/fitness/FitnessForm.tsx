"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FitnessInput, FitnessPlan } from "@/lib/fitness";
import { movesByEquipment } from "@/lib/fitness";
import PlanView from "./PlanView";
import PlanSummary from "./PlanSummary";
import Card from "./_components/Card";
import Section from "./_components/Section";
import UserPicksPicker from "./_components/UserPicksPicker";
import ProfileSection from "./_components/ProfileSection";
import {
  TARGETS,
  PARTS,
  PLACES,
  GYM_POINTS,
  DISTANCES,
  WEEKDAYS,
  SLOT_NAMES,
  SLOT_SUB,
  EQUIPMENT,
} from "./_constants";

const EMPTY_PROFILE = { gender: "", age: "", height: "", weight: "", bodyFat: "", goalWeight: "", exp: "" };

const INITIAL_FORM: FitnessInput = {
  targets: [],
  parts: [],
  places: [],
  gymPoints: [],
  weekdays: [],
  daySlots: {},
  equipment: [],
  profile: { ...EMPTY_PROFILE },
  userPicks: {},
};

export default function FitnessForm() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<FitnessPlan | null>(null);
  const [restored, setRestored] = useState(false);
  const [form, setForm] = useState<FitnessInput>(INITIAL_FORM);
  // 保存的计划更新时间，用于摘要卡片显示
  const [planUpdatedAt, setPlanUpdatedAt] = useState<string | undefined>(undefined);
  // 板块状态：「home」= 摘要+表单折叠 / 「full」= 完整 PlanView / 「edit」= 摘要+表单展开
  const [viewMode, setViewMode] = useState<"home" | "full" | "edit">("home");
  const [editExpanded, setEditExpanded] = useState(false);

  // 进入页面时恢复已保存的计划
  useEffect(() => {
    fetch("/api/plan?goalId=fitness")
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data) => {
        if (!data || data.source !== "fitness-calc" || !data.plan || Array.isArray(data.plan)) return;
        const p = data.plan as FitnessPlan;
        // 检测旧版缓存（缺新字段如 stairClimber）→ 用保存的 answers 自动 regen
        const isOldPlan = !p.meals?.stairClimber;
        if (isOldPlan && data.answers) {
          try {
            const res = await fetch("/api/plan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ goalId: "fitness", answers: data.answers }),
            });
            const fresh = await res.json();
            if (fresh?.plan) {
              setPlan(fresh.plan as FitnessPlan);
              setPlanUpdatedAt(new Date().toISOString());
              return;
            }
          } catch {}
        }
        setPlan(p);
        setPlanUpdatedAt(data.updatedAt);
      })
      .catch(() => {})
      .finally(() => setRestored(true));
  }, []);

  // 通用数组切换：目标 / 场地
  function toggleArr(field: "targets" | "places", value: string) {
    const arr = form[field];
    setForm({ ...form, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] });
  }

  // 部位：点击顺序即训练顺序。取消勾选时同步清掉 userPicks 中该部位的自选动作
  function togglePart(p: string) {
    const willRemove = form.parts.includes(p);
    const next = willRemove ? form.parts.filter((v) => v !== p) : [...form.parts, p];
    const nextPicks = { ...(form.userPicks ?? {}) };
    if (willRemove) delete nextPicks[p];
    setForm({ ...form, parts: next, userPicks: nextPicks });
  }

  // 器械：取消勾选时清掉涉及该器械的所有自选动作
  function toggleEquipment(e: string) {
    const arr = form.equipment;
    const willRemove = arr.includes(e);
    const next = willRemove ? arr.filter((v) => v !== e) : [...arr, e];
    const nextPicks: Record<string, string[]> = { ...(form.userPicks ?? {}) };
    if (willRemove) {
      const lib = movesByEquipment();
      const removedNames = new Set((lib[e] ?? []).map((m) => m.name));
      for (const [part, names] of Object.entries(nextPicks)) {
        nextPicks[part] = names.filter((n) => !removedNames.has(n));
        if (nextPicks[part].length === 0) delete nextPicks[part];
      }
    }
    setForm({ ...form, equipment: next, userPicks: nextPicks });
  }

  // userPicks 切换：part + 动作名。保持点击顺序
  function togglePick(part: string, name: string) {
    const cur = form.userPicks?.[part] ?? [];
    const next = cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name];
    setForm({
      ...form,
      userPicks: { ...(form.userPicks ?? {}), [part]: next },
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
        setPlanUpdatedAt(new Date().toISOString());
        setViewMode("home");
        setEditExpanded(false);
        window.scrollTo({ top: 0 });
      }
    } catch {
      alert("生成失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  // 在已有计划时重置表单（让用户重新填）
  function prepareEdit() {
    setForm({ ...INITIAL_FORM, profile: { ...EMPTY_PROFILE } });
    setViewMode("home");
    setEditExpanded(true);
    window.scrollTo({ top: 0 });
  }

  // 从 PlanView 整页返回到首页摘要
  function backToHome() {
    setViewMode("home");
    window.scrollTo({ top: 0 });
  }

  // 把当前 state 和 handlers 传给 FormBody
  function renderForm() {
    return (
      <FormBody
        form={form}
        setForm={setForm}
        toggleArr={toggleArr}
        togglePart={togglePart}
        toggleEquipment={toggleEquipment}
        togglePick={togglePick}
        togglePoint={togglePoint}
        setPointDistance={setPointDistance}
        toggleDay={toggleDay}
        setDaySlot={setDaySlot}
        canSubmit={canSubmit()}
        submit={submit}
      />
    );
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

  if (!restored) return null;

  // 完整 PlanView 模式 —— 用户点了「查看完整计划」按钮
  if (viewMode === "full" && plan) {
    return <PlanView plan={plan} onRestart={backToHome} />;
  }

  // 主页面：两个板块 ——「我的计划」+「制定新计划」
  return (
    <div className="mx-auto max-w-lg px-5 pb-32 pt-5">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← 返回
      </Link>
      <h1 className="mt-3 text-2xl font-bold">💪 健身计划</h1>
      <p className="mt-1 text-xs text-zinc-500">上面看你的计划 · 下面调整或新建</p>

      {/* 板块 1：我的计划（有计划时显示摘要，无计划时引导去填表） */}
      {plan ? (
        <div className="mt-5">
          <PlanSummary
            plan={plan}
            updatedAt={planUpdatedAt}
            onViewFull={() => setViewMode("full")}
            onEdit={prepareEdit}
          />
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-amber-800/40 bg-amber-950/15 p-4">
          <p className="text-sm font-semibold text-amber-300">📋 你还没有训练计划</p>
          <p className="mt-1.5 text-[11px] leading-5 text-amber-200/80">
            填完下面的表单（一分钟左右），会自动生成：5 分化训练 / 你今天的动作清单 / 时间线餐次 / 爬楼机推荐。
          </p>
        </div>
      )}

      {/* 板块 2：制定新计划 / 调整 */}
      <div className="mt-6">
        {plan ? (
          // 已有计划 → 默认折叠表单
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
            <button
              onClick={() => setEditExpanded(!editExpanded)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-semibold text-zinc-200">
                {editExpanded ? "▲ 收起表单" : "▼ 调整 / 重新制定"}
              </span>
              <span className="text-[10px] text-zinc-500">
                {editExpanded ? "" : "点开重新填"}
              </span>
            </button>
            {editExpanded && (
              <div className="border-t border-zinc-800 px-4 pb-6 pt-4">
                <div className="mb-4 rounded-xl border border-amber-800/40 bg-amber-950/15 p-3 text-[11px] leading-5 text-amber-200/90">
                  ⚠️ 重新提交会覆盖现有计划。是否要先「📖 查看完整计划」备份动作/重量？
                </div>
                {renderForm()}
              </div>
            )}
          </div>
        ) : (
          // 无计划 → 直接显示表单
          <div>{renderForm()}</div>
        )}
      </div>
    </div>
  );
}

// 抽出的表单渲染（避免上面 return 里嵌套大段 JSX）
function FormBody({
  form,
  setForm,
  toggleArr,
  togglePart,
  toggleEquipment,
  togglePick,
  togglePoint,
  setPointDistance,
  toggleDay,
  setDaySlot,
  canSubmit,
  submit,
}: {
  form: FitnessInput;
  setForm: (f: FitnessInput) => void;
  toggleArr: (field: "targets" | "places", value: string) => void;
  togglePart: (p: string) => void;
  toggleEquipment: (e: string) => void;
  togglePick: (part: string, name: string) => void;
  togglePoint: (p: string) => void;
  setPointDistance: (p: string, distance: string) => void;
  toggleDay: (day: string) => void;
  setDaySlot: (day: string, slot: string) => void;
  canSubmit: boolean;
  submit: () => void;
}) {
  return (
    <div className="pb-32 pt-1">
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
              onClick={() => toggleEquipment(o.value)}
            />
          ))}
        </div>
      </Section>

      {/* 7 自选动作 */}
      <Section
        title="想自己挑动作？（可选）"
        hint="不选就用上面的器械自动推荐；选了优先按你的勾选顺序编排。动作按热度排序，越靠前越主流高效。"
      >
        {form.parts.length === 0 ? (
          <p className="rounded-xl border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-xs text-amber-300">
            ⚠️ 先在上面「想练哪些部位？」勾选要练的部位，才能展开动作选择。
          </p>
        ) : form.equipment.length === 0 ? (
          <p className="rounded-xl border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-xs text-amber-300">
            ⚠️ 先在上面「能用什么器械？」勾选器械，才能看到可用的动作。
          </p>
        ) : (
          <UserPicksPicker form={form} togglePick={togglePick} />
        )}
      </Section>

      {/* 8 基本信息 */}
      <Section title="你的基本信息" hint="全空着，如实填 · 体脂率和目标体重不确定可不填">
        <ProfileSection profile={form.profile} onChange={(p) => setForm({ ...form, profile: p })} />
      </Section>

      {/* 底部固定提交条 */}
      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-800/60 bg-zinc-950/90 px-5 pb-6 pt-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full rounded-full bg-emerald-600 py-3.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-30"
          >
            🔥 生成我的吃练计划
          </button>
          {!canSubmit && (
            <p className="mt-2 text-center text-[10px] text-zinc-600">
              填完目标 / 场地 / 出发点距离 / 练哪几天 / 器械 / 基本信息后即可生成
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
