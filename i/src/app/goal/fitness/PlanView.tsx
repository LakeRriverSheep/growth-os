"use client";
import Link from "next/link";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FitnessPlan, DayPlan, Exercise, MealPlan } from "@/lib/fitness";

const ALL_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const PLACE_EMOJI: Record<string, string> = { 健身房: "🏟️", 家里: "🏠", 户外: "🌳" };

function StatCard({ label, value, unit, accent }: { label: string; value: number | string; unit?: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 text-center ${
        accent ? "border-emerald-600/60 bg-emerald-950/40" : "border-zinc-800 bg-zinc-900/60"
      }`}
    >
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${accent ? "text-emerald-400" : "text-zinc-100"}`}>
        {value}
        {unit && <span className="ml-0.5 text-xs font-normal text-zinc-500">{unit}</span>}
      </p>
    </div>
  );
}

function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 时间线打勾项的读写上下文（由 PlanView 注入，落库 check_items）
type CheckCtx = {
  get: (item: string) => boolean;
  toggle: (item: string) => void;
};

// 兜底：无上下文时的空实现（不影响渲染）
const NOOP_CHECK: CheckCtx = { get: () => false, toggle: () => {} };

// 饮食清单（每条可勾选 + 可增删改）读写上下文，由 PlanView 注入，落库 diet_overrides
type DietCtx = {
  items: (section: string, fallback: string[]) => string[];
  save: (section: string, items: string[]) => void;
};

// 可勾选的一行：热身步骤 / 餐内每一条
function CheckRow({ item, ctx, num, children }: { item: string; ctx: CheckCtx; num?: number; children: React.ReactNode }) {
  const checked = ctx.get(item);
  return (
    <button
      onClick={() => ctx.toggle(item)}
      aria-pressed={checked}
      className="flex w-full items-start gap-2 text-left"
    >
      <span
        aria-hidden
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border text-[9px] leading-none ${
          checked ? "border-emerald-500 bg-emerald-500 text-zinc-950" : "border-zinc-700 text-zinc-500"
        }`}
      >
        {checked ? "✓" : num ?? ""}
      </span>
      <span className={`flex-1 text-xs leading-5 ${checked ? "text-emerald-300 line-through opacity-80" : "text-zinc-300"}`}>
        {children}
      </span>
    </button>
  );
}

const DEFAULT_BREAKFAST = ["鸡蛋 2 个 + 燕麦 50g", "牛奶 250ml", "香蕉或苹果 1 个"];
const DEFAULT_LUNCH = ["鸡胸/牛肉 150g", "米饭 1-1.5 碗", "蔬菜不限量"];
const DEFAULT_SNACK = ["希腊酸奶 1 杯 或 鸡蛋白 2 个", "坚果一小把（10g）"];
const DEFAULT_DINNER = ["鸡胸/鱼虾 150g", "红薯 150g 或 米饭半碗", "蔬菜不限量"];
const DEFAULT_PREMEAL = [
  "黑燕麦 50g 煮（或 40g 燕麦 + 全麦面包 1 片）",
  "全麦面包 1 片（48g）",
  "鸡蛋 2 个（水煮 / 少油煎）",
  "香蕉 1 根（练前快碳）",
  "蛋白粉半勺（15g）随餐或冲燕麦",
];
const DEFAULT_POST = ["蛋白质 30g+：鸡胸 150g 或 鸡蛋 3 个 + 牛奶 250ml（或蛋白粉 1 勺）", "碳水 40-60g：米饭 1 碗 / 红薯 200g", "这餐吃不好，今天训练效果打 6 折"];

// 默认时间线节点在「删除后恢复」时的展示名
const NODE_LABELS: Record<string, string> = {
  wake: "起床",
  breakfast: "早餐",
  pre: "练前吃",
  workout: "训练",
  post: "练后吃",
  lunch: "中餐",
  snack: "下午加餐",
  stair: "爬楼机",
  dinner: "晚餐",
};

function MealCard({
  title,
  when,
  items,
  accent,
  check,
  diet,
}: {
  title: string;
  when?: string;
  items: string[];
  accent?: boolean;
  /** 传入后该餐的每一条都可勾选，prefix 需在当天内唯一 */
  check?: CheckCtx & { prefix: string };
  /** 传入后支持“增删改”每条：section 为该餐唯一键 */
  diet?: { section: string; fallback: string[]; ctx: DietCtx };
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(items);
  const resolved = diet ? diet.ctx.items(diet.section, diet.fallback) : items;
  const editable = !!diet;

  function startEdit() {
    setDraft(resolved);
    setEditing(true);
  }
  function saveEdit() {
    const next = draft.map((s) => s.trim()).filter(Boolean);
    setEditing(false);
    if (diet && JSON.stringify(next) !== JSON.stringify(resolved)) diet.ctx.save(diet.section, next);
  }
  const inputCls =
    "w-full flex-1 rounded-md border border-zinc-800 bg-zinc-950/70 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-600";

  return (
    <div className={`rounded-2xl border p-3.5 ${accent ? "border-emerald-700/50 bg-emerald-950/20" : "border-zinc-800 bg-zinc-900/50"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-xs font-semibold ${accent ? "text-emerald-400" : "text-zinc-200"}`}>{title}</span>
        {editing ? (
          <span className="flex shrink-0 items-center gap-2 text-[10px]">
            <button onClick={saveEdit} className="rounded-full bg-emerald-600 px-2 py-0.5 text-white">
              完成
            </button>
            <button onClick={() => setEditing(false)} className="text-zinc-500 hover:text-zinc-300">
              取消
            </button>
          </span>
        ) : (
          <>
            {when && <span className="text-[10px] text-zinc-500">{when}</span>}
            {editable && (
              <button onClick={startEdit} className="shrink-0 text-[10px] text-zinc-500 hover:text-emerald-400">
                ✎ 改清单
              </button>
            )}
          </>
        )}
      </div>

      {editing ? (
        <div className="mt-2 space-y-1.5">
          {draft.map((it, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                value={it}
                onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? e.target.value : x)))}
                className={inputCls}
              />
              <button
                onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
                aria-label="删除这一条"
                className="shrink-0 rounded-md border border-zinc-800 px-1.5 py-1 text-[10px] text-red-400/90 hover:border-red-700"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => setDraft((d) => [...d, ""])}
            className="w-full rounded-md border border-dashed border-zinc-700 py-1 text-[11px] text-zinc-400 hover:border-emerald-600 hover:text-emerald-400"
          >
            ＋ 添加一条
          </button>
        </div>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {resolved.map((it, i) => (
            <li key={`${it}-${i}`}>
              <CheckRow item={`${check?.prefix ?? "meal"}:${it}`} ctx={check ?? NOOP_CHECK}>
                {it}
              </CheckRow>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TimelineItem({
  time,
  title,
  children,
  accent,
  open,
  onOpen,
  onTime,
  onHide,
}: {
  time: string;
  title: string;
  children: React.ReactNode;
  accent?: boolean;
  /** 时间以紧凑小胶囊显示在与标题同一行，不占整列；点了直接改 */
  open?: boolean;
  onOpen?: () => void;
  onTime?: (t: string) => void;
  onHide?: () => void;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-start gap-2">
        {open && onTime ? (
          <input
            value={time}
            onChange={(e) => onTime(e.target.value)}
            aria-label={`${title} 的时间`}
            autoFocus
            className="w-14 shrink-0 rounded-md border border-zinc-700 bg-zinc-950/80 px-1 py-0.5 text-right text-[11px] font-semibold tabular-nums text-emerald-300 outline-none focus:border-emerald-500"
          />
        ) : (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`改「${title}」的时间`}
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition-colors ${
              accent ? "bg-emerald-950/60 text-emerald-400" : "bg-zinc-800/80 text-zinc-300"
            } hover:bg-zinc-700`}
          >
            {time}
          </button>
        )}
        <p className={`min-w-0 flex-1 pt-0.5 text-[11px] ${accent ? "text-emerald-400" : "text-zinc-500"}`}>{title}</p>
        {open && (
          <span className="flex shrink-0 items-center gap-1.5 pt-0.5">
            {onHide && (
              <button
                onClick={onHide}
                aria-label={`删除「${title}」`}
                className="rounded-md border border-red-900/60 px-1.5 py-0.5 text-[10px] text-red-400 hover:border-red-700"
              >
                ✕
              </button>
            )}
            {onOpen && (
              <button
                onClick={onOpen}
                aria-label="收起编辑"
                className="rounded-md border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:border-zinc-500"
              >
                ✓
              </button>
            )}
          </span>
        )}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

// ---------- 每天固定餐次 + 爬楼机：单一来源 ----------
// 训练日时间线 / 休息日时间线共用同一份时间表与卡片，避免两处改漏（曾出过中餐 08:00 这种不一致）
const DAY_TIMES = {
  lunch: "12:00",
  snack: "15:00",
  stair: "16:30",
  dinner: "17:30",
} as const;

// 阻力等级形如 "5-7"，取下界展示；解析失败给个安全兜底，避免显示 "阻力 NaN"
function stairLevelFloor(level: string): number {
  const n = parseInt(level.split("-")[0] ?? "", 10);
  return Number.isFinite(n) ? n : 5;
}

function StairClimberCard({
  stairClimber,
  restNote,
}: {
  stairClimber: MealPlan["stairClimber"];
  restNote?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-cyan-800/40 bg-cyan-950/15 p-3.5">
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-cyan-900/40 px-2 py-0.5 text-[10px] text-cyan-300">阻力 {stairClimber.level}</span>
        <span className="rounded-full bg-cyan-900/40 px-2 py-0.5 text-[10px] text-cyan-300">心率 {stairClimber.hrZone}</span>
        <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-400">{stairClimber.durationMin} 分钟</span>
      </div>
      {restNote ? (
        <p className="mt-2 text-[11px] leading-5 text-zinc-400">
          休息日做爬楼机可选：强度降到阻力 {stairLevelFloor(stairClimber.level)}，保持心率 ≤{stairClimber.hrZone} 即可
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {stairClimber.cues.map((c, i) => (
            <li key={i} className="text-[11px] leading-5 text-zinc-300">
              · {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- 周计划：可编辑的时间线 ----------
// 每个"星期几"一套（如所有周一相同）；默认模板可改时间/删除，可加自定义事项；改一次长期生效
type WeekDoc = {
  edits: Record<string, { time?: string; hidden?: boolean }>;
  customs: { id?: number; time: string; title: string; note?: string }[];
};

// 传给训练日/休息日视图的读写句柄（无需先进入"编辑模式"，每条都可直接改）
type WeekHandle = {
  time: (key: string, def: string) => string;
  hidden: (key: string) => boolean;
  hiddenKeys: string[];
  setTime: (key: string, time: string) => void;
  hide: (key: string) => void;
  unhide: (key: string) => void;
  customs: WeekDoc["customs"];
  addCustom: (c: { time: string; title: string; note?: string }) => void;
  updateCustom: (index: number, patch: Partial<{ time: string; title: string; note: string }>) => void;
  removeCustom: (index: number) => void;
  reset: () => void; // 清空该天所有自定义改动
};

/** "07:30"/"7:30" → 分钟；非时间文本返回 NaN */
function timeMin(t: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(t ?? "");
  if (!m) return Number.NaN;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

// 中餐/加餐/晚餐 三张共用餐卡的内容（供训练日/休息日各自的节点使用）
function SharedMealCard({
  meals,
  section,
  keyName,
  title,
  check,
  diet,
}: {
  meals: MealPlan;
  section: string;
  keyName: "lunch" | "snack" | "dinner";
  title: string;
  check?: CheckCtx;
  diet?: DietCtx;
}) {
  const fallback =
    keyName === "lunch" ? DEFAULT_LUNCH : keyName === "snack" ? DEFAULT_SNACK : DEFAULT_DINNER;
  const items = meals.meals.find((m) => m.name.includes(section))?.items ?? fallback;
  return (
    <MealCard
      title={title}
      items={items}
      check={check ? { ...check, prefix: keyName } : undefined}
      diet={diet ? { section: keyName, fallback: items, ctx: diet } : undefined}
    />
  );
}

// 自定义事项行（自己加的带时间的事；勾选状态按当天日期保存）。每条右侧直接可改/删，无需先进入编辑模式
function CustomTaskRow({
  c,
  index,
  handle,
  check,
}: {
  c: { id?: number; time: string; title: string; note?: string };
  index: number;
  handle: WeekHandle;
  check?: CheckCtx;
}) {
  const [edit, setEdit] = useState(false);
  const checked = check ? check.get(`custom:${c.id ?? index}`) : false;
  const inputCls =
    "min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-950/70 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-600";

  if (edit) {
    return (
      <div className="flex flex-wrap items-center gap-2 py-1">
        <input
          value={c.time}
          onChange={(e) => handle.updateCustom(index, { time: e.target.value })}
          aria-label="时间"
          autoFocus
          className={`${inputCls} !w-14 flex-none`}
        />
        <input
          value={c.title}
          onChange={(e) => handle.updateCustom(index, { title: e.target.value })}
          aria-label="事情"
          className={inputCls}
        />
        <button
          onClick={() => handle.removeCustom(index)}
          aria-label="删除该事项"
          className="shrink-0 rounded-md border border-zinc-800 px-1.5 py-1 text-[10px] text-red-400/90 hover:border-red-700"
        >
          ✕
        </button>
        <button onClick={() => setEdit(false)} className="shrink-0 rounded-md bg-emerald-600 px-2 py-1 text-[10px] text-white">
          完成
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        onClick={() => setEdit(true)}
        aria-label="改这条事项的时间"
        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition-colors ${
          checked ? "bg-emerald-950/60 text-emerald-400" : "bg-zinc-800/80 text-zinc-300"
        } hover:bg-zinc-700`}
      >
        {c.time}
      </button>
      <div className="min-w-0 flex-1">
        <CheckRow item={`custom:${c.id ?? index}`} ctx={check ?? NOOP_CHECK}>
          {c.title}
          {c.note ? ` — ${c.note}` : ""}
        </CheckRow>
      </div>
      <button
        onClick={() => handle.removeCustom(index)}
        aria-label="删除这条事项"
        className="shrink-0 px-1 pt-0.5 text-[11px] text-zinc-600 hover:text-red-400"
      >
        ✕
      </button>
    </div>
  );
}

// 时间线里的细分隔线：点它就在这一行下面直接加一件事
function AddDivider({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-my-1 flex w-full items-center gap-2 py-0.5 text-[10px] text-zinc-700 transition-colors hover:text-emerald-400"
    >
      <span className="h-px flex-1 bg-zinc-800/80" />
      <span className="shrink-0 hover:bg-emerald-950/40">＋ {label}</span>
      <span className="h-px flex-1 bg-zinc-800/80" />
    </button>
  );
}

// 行内添加表单：默认填好"这一行的时间"，可改，回车即加
function AddInPlace({
  defaultTime,
  onAdd,
  onCancel,
}: {
  defaultTime: string;
  onAdd: (time: string, title: string) => void;
  onCancel: () => void;
}) {
  const [time, setTime] = useState(defaultTime);
  const [title, setTitle] = useState("");
  const add = () => {
    const t = title.trim();
    if (!t) return;
    onAdd(time.trim() || "07:00", t);
    onCancel();
  };
  return (
    <div className="flex items-center gap-2 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-2 py-1.5">
      <input
        value={time}
        onChange={(e) => setTime(e.target.value)}
        aria-label="时间"
        className="w-16 rounded-md border border-zinc-700 bg-zinc-950 px-1.5 py-1.5 text-center text-xs text-emerald-300 outline-none focus:border-emerald-500"
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        aria-label="要做什么"
        placeholder="要做什么？例如：背单词 50 个"
        autoFocus
        className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-500"
      />
      <button onClick={add} className="shrink-0 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
        添加
      </button>
      <button onClick={onCancel} className="shrink-0 px-1 text-[11px] text-zinc-500">
        取消
      </button>
    </div>
  );
}

// 时间线尾部小工具：恢复被删默认项 + 恢复该天默认模板
function DayTail({ week }: { week: WeekHandle }) {
  return (
    <div className="mt-3 space-y-2">
      {week.hiddenKeys.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-zinc-500">已删除的默认项：</span>
          {week.hiddenKeys.map((k) => (
            <button
              key={k}
              onClick={() => week.unhide(k)}
              className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 transition-colors hover:border-emerald-600 hover:text-emerald-300"
            >
              ↺ {NODE_LABELS[k] ?? k}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => {
          if (window.confirm("把这一天恢复成默认模板？会清掉该天所有自定义改动。")) week.reset();
        }}
        className="w-full text-center text-[10px] text-zinc-600 underline-offset-2 hover:text-zinc-400 hover:underline"
      >
        ↺ 恢复这一天的默认模板（清空自定义）
      </button>
    </div>
  );
}

// 单个动作行：勾选 + 3 个输入框 + 自动保存
function ExerciseRow({ ex, dateIso }: { ex: Exercise; dateIso: string }) {
  const [state, setState] = useState({ checked: false, weight: "", reps: "", sets: "" });
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // 该日期是否原本就有记录：无记录且未改动时跳过自动保存，不写空行
  const hadRow = useRef(false);

  // 加载历史（组件随日期 key 重挂载，天然无上一日残留数据）
  useEffect(() => {
    let alive = true;
    fetch(`/api/exercise-logs?date=${dateIso}&name=${encodeURIComponent(ex.name)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((row: { checked: number; weight: string; reps: string; sets: string } | null) => {
        if (!alive) return;
        if (row) {
          hadRow.current = true;
          setState({
            checked: !!row.checked,
            weight: row.weight ?? "",
            reps: row.reps ?? "",
            sets: row.sets ?? "",
          });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      alive = false;
    };
  }, [dateIso, ex.name]);

  // 自动保存（debounce 500ms；失败提示，下个动作会自动再试）
  useEffect(() => {
    if (!loaded) return;
    const isClean = !state.checked && !state.weight && !state.reps && !state.sets;
    if (isClean && !hadRow.current) return; // 从未改过，别为每个动作写空行
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/exercise-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: dateIso,
            name: ex.name,
            checked: state.checked,
            weight: state.weight,
            reps: state.reps,
            sets: state.sets,
          }),
        });
        if (!res.ok) throw new Error("save failed");
        hadRow.current = true;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [state, dateIso, ex.name, loaded]);

  function update<K extends keyof typeof state>(key: K, val: (typeof state)[K]) {
    setState((s) => ({ ...s, [key]: val }));
  }

  const inputCls =
    "w-full rounded-md border border-zinc-800 bg-zinc-950/60 px-1.5 py-1 text-center text-[11px] tabular-nums text-zinc-200 outline-none focus:border-emerald-600 focus:bg-zinc-900";

  return (
    <div
      className={`flex items-start gap-2 border-b border-zinc-900 px-3 py-2.5 last:border-b-0 ${
        state.checked ? "bg-emerald-950/30" : "bg-zinc-950/40"
      }`}
    >
      <button
        onClick={() => update("checked", !state.checked)}
        aria-pressed={state.checked}
        aria-label={state.checked ? "已完成" : "未完成"}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
          state.checked ? "border-emerald-500 bg-emerald-500 text-zinc-950" : "border-zinc-700 bg-transparent"
        }`}
      >
        {state.checked && <span className="text-[12px] font-bold leading-none">✓</span>}
      </button>
      <div className="min-w-0 flex-1">
        {/* 动作名占整行，不再被右边的"起…"挤窄 */}
        <p className={`text-[13px] font-medium leading-snug ${state.checked ? "text-emerald-300 line-through" : "text-zinc-200"}`}>
          {ex.name}
        </p>
        <p className="mt-0.5 text-[10px] text-zinc-500">起 {ex.startWeight}</p>
        <p className="mt-0.5 text-[10px] text-zinc-500">
          {ex.muscle} · 计划 {ex.setsReps} · 休 {ex.rest}
        </p>
        <p className="mt-1 text-[11px] leading-5 text-emerald-600/90">{ex.cue}</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          <label className="block">
            <span className="block text-center text-[9px] text-zinc-600">重量(kg)</span>
            <input
              inputMode="decimal"
              className={inputCls}
              value={state.weight}
              onChange={(e) => update("weight", e.target.value)}
              placeholder="—"
            />
          </label>
          <label className="block">
            <span className="block text-center text-[9px] text-zinc-600">次数</span>
            <input
              inputMode="numeric"
              className={inputCls}
              value={state.reps}
              onChange={(e) => update("reps", e.target.value)}
              placeholder="—"
            />
          </label>
          <label className="block">
            <span className="block text-center text-[9px] text-zinc-600">组数</span>
            <input
              inputMode="numeric"
              className={inputCls}
              value={state.sets}
              onChange={(e) => update("sets", e.target.value)}
              placeholder="—"
            />
          </label>
        </div>
        {loaded && saveState === "saving" && (
          <span className="mt-1 block text-right text-[9px] text-zinc-500">保存中…</span>
        )}
        {saveState === "saved" && (
          <span className="mt-1 block text-right text-[9px] text-emerald-500/90">✓ 已自动保存</span>
        )}
        {saveState === "error" && (
          <span className="mt-1 block text-right text-[9px] text-red-400">保存失败，再改动会自动重试</span>
        )}
      </div>
    </div>
  );
}

function TrainingDay({
  day,
  meals,
  warmup,
  stairClimber,
  dateIso,
  done,
  check,
  diet,
  week,
  onSetDone,
}: {
  day: DayPlan;
  meals: MealPlan;
  warmup: string[];
  stairClimber: MealPlan["stairClimber"];
  dateIso: string;
  done: boolean;
  check?: CheckCtx;
  diet?: DietCtx;
  week: WeekHandle;
  onSetDone: (next: boolean) => Promise<boolean>;
}) {
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [insertKey, setInsertKey] = useState<string | null>(null);
  const [insertTime, setInsertTime] = useState("06:00");

  async function toggleDone() {
    if (saving) return;
    setSaving(true);
    setSaveErr(false);
    const ok = await onSetDone(!done); // done → 再点一次取消，防误触后无法恢复
    if (!ok) setSaveErr(true);
    setSaving(false);
  }

  const ed = (section: string, fallback: string[]) => (diet ? { section, fallback, ctx: diet } : undefined);

  // 时间线 = 默认节点（可改时间/删除）+ 自定义事项，统一按时间排序
  const nodes: { key: string; time: string; min: number; seq: number; el: React.ReactElement }[] = [];
  const push = (key: string, defTime: string, seq: number, title: string, content: React.ReactNode) => {
    if (week.hidden(key)) return;
    const time = week.time(key, defTime);
    nodes.push({
      key,
      time,
      min: timeMin(time),
      seq,
      el: (
        <TimelineItem
          time={time}
          title={title}
          open={openKey === key}
          onOpen={() => setOpenKey((k) => (k === key ? null : key))}
          onTime={(t) => week.setTime(key, t)}
          onHide={() => week.hide(key)}
        >
          {content}
        </TimelineItem>
      ),
    });
  };

  push("wake", "05:00", 1, "起床", <p className="text-[11px] text-zinc-500">洗漱 + 200ml 水</p>);

  // 早餐和练前吃合并为一餐（练前 30-60 分钟吃），不再分开两张卡
  push(
    "breakfast",
    "05:30",
    2,
    "早餐 + 练前吃（练前 30-60 分钟）",
    <MealCard
      title="🍳 早餐 + 练前吃"
      when={meals.preWorkout.when}
      items={diet ? diet.items("premeal", DEFAULT_PREMEAL) : DEFAULT_PREMEAL}
      check={check ? { ...check, prefix: "premeal" } : undefined}
      diet={ed("premeal", DEFAULT_PREMEAL)}
    />,
  );

  push(
    "workout",
    "06:00",
    4,
    `出发去${day.place}，开练 ${day.place}`,
    <>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-300">
          {PLACE_EMOJI[day.place] ?? "📍"} {day.place}
        </span>
        <span className="rounded-full bg-emerald-950/60 px-2 py-0.5 text-[10px] text-emerald-400">{day.slot}</span>
        <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-400">≈{day.minutes} 分钟</span>
      </div>
      {/* 动作表（带勾选 + 输入） */}
      <div className="mt-3 mb-3 overflow-hidden rounded-2xl border border-zinc-800">
        <div className="flex items-baseline justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-2">
          <p className="text-xs font-semibold text-emerald-400">🎯 动作（点击打勾 · 填重量/次数/组数）</p>
          <span className="text-[10px] text-zinc-500">{day.exercises.length} 个</span>
        </div>
        {day.exercises.map((ex, i) => (
          <ExerciseRow key={`${dateIso}-${i}`} ex={ex} dateIso={dateIso} />
        ))}
      </div>
    </>,
  );

  push(
    "post",
    "07:30",
    5,
    "练后吃（练后 30 分钟内 · 最重要的一餐）",
    <MealCard
      title="🍗 练后吃"
      when={meals.postWorkout.when}
      items={meals.postWorkout.items ?? DEFAULT_POST}
      accent
      check={check ? { ...check, prefix: "post" } : undefined}
      diet={ed("post", meals.postWorkout.items ?? DEFAULT_POST)}
    />,
  );

  push("lunch", DAY_TIMES.lunch, 6, "中餐", (
    <SharedMealCard meals={meals} section="午餐" keyName="lunch" title="🍚 中餐" check={check} diet={diet} />
  ));
  push("snack", DAY_TIMES.snack, 7, "下午加餐", (
    <SharedMealCard meals={meals} section="加餐" keyName="snack" title="🥛 下午加餐" check={check} diet={diet} />
  ));
  push("stair", DAY_TIMES.stair, 8, `爬楼机 · ${stairClimber.durationMin} 分钟`, (
    <StairClimberCard stairClimber={stairClimber} />
  ));
  push("dinner", DAY_TIMES.dinner, 9, "晚餐", (
    <SharedMealCard meals={meals} section="晚餐" keyName="dinner" title="🥗 晚餐" check={check} diet={diet} />
  ));

  week.customs.forEach((c, i) => {
    const m = timeMin(c.time);
    nodes.push({
      key: `custom-${c.id ?? i}`,
      time: c.time,
      min: Number.isNaN(m) ? Number.POSITIVE_INFINITY : m,
      seq: 1000 + i,
      el: <CustomTaskRow c={c} index={i} handle={week} check={check} />,
    });
  });
  nodes.sort((a, b) => {
    const am = Number.isNaN(a.min) ? Number.POSITIVE_INFINITY : a.min;
    const bm = Number.isNaN(b.min) ? Number.POSITIVE_INFINITY : b.min;
    return am - bm || a.seq - b.seq;
  });

  return (
    <div className="space-y-5">
      {/* 1. 热身（最前）：每步可勾选，一步步确认 */}
      <div className="rounded-2xl border border-amber-800/40 bg-amber-950/15 p-3.5">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold text-amber-300">🔥 热身（每次开练前 · 10 分钟）</p>
          <span className="text-[10px] text-zinc-500">每步点一下确认</span>
        </div>
        <div className="mt-2 space-y-1.5">
          {warmup.map((w, i) => (
            <CheckRow key={i} item={`warmup:${i}`} ctx={check ?? NOOP_CHECK} num={i + 1}>
              {w}
            </CheckRow>
          ))}
        </div>
      </div>

      {/* 2. 时间线 */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-200">⏰ 今天的时间线</h3>
        <div className="space-y-1">
          <AddDivider
            label="在开头加一件"
            onClick={() => {
              setInsertKey("top");
              setInsertTime("06:00");
            }}
          />
          {insertKey === "top" && (
            <AddInPlace
              defaultTime={insertTime}
              onAdd={(t, ti) => week.addCustom({ time: t, title: ti })}
              onCancel={() => setInsertKey(null)}
            />
          )}
          {nodes.map((n) => (
            <div key={n.key} className="space-y-1">
              <div>{n.el}</div>
              {insertKey === n.key && (
                <AddInPlace
                  defaultTime={insertTime}
                  onAdd={(t, ti) => week.addCustom({ time: t, title: ti })}
                  onCancel={() => setInsertKey(null)}
                />
              )}
              <AddDivider
                label="在这条下面加一件"
                onClick={() => {
                  setInsertKey(n.key);
                  setInsertTime(n.time);
                }}
              />
            </div>
          ))}
        </div>
        {nodes.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-center text-xs text-zinc-500">
            这一天还没有安排 —— 用上面的「＋ 在开头加一件」直接加
          </p>
        )}
        <DayTail week={week} />
      </div>

      {/* 完成 / 取消（再点一次可取消，防误触后无法恢复） */}
      <button
        onClick={toggleDone}
        disabled={saving}
        className={`w-full rounded-full py-3 text-sm font-medium transition-colors ${
          done
            ? "bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/70"
            : "bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
        }`}
      >
        {done ? "✓ 今日全部完成" : saving ? "记录中…" : "✓ 时间线全部走完，打卡"}
      </button>
      {done && !saving && (
        <p className="text-center text-[10px] text-zinc-500">已完成 —— 再点一次可取消</p>
      )}
      {saveErr && <p className="mt-2 text-center text-xs text-red-400">操作失败，请检查网络后重试</p>}
    </div>
  );
}

function RestDay({ meals, warmup, stairClimber, check, diet, week }: { meals: MealPlan; warmup: string[]; stairClimber: MealPlan["stairClimber"]; check?: CheckCtx; diet?: DietCtx; week: WeekHandle }) {
  const breakfastItems = meals.meals.find((m) => m.name.includes("早餐"))?.items ?? DEFAULT_BREAKFAST;
  const ed = (section: string, fallback: string[]) => (diet ? { section, fallback, ctx: diet } : undefined);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [insertKey, setInsertKey] = useState<string | null>(null);
  const [insertTime, setInsertTime] = useState("06:00");

  const nodes: { key: string; time: string; min: number; seq: number; el: React.ReactElement }[] = [];
  const push = (key: string, defTime: string, seq: number, title: string, content: React.ReactNode) => {
    if (week.hidden(key)) return;
    const time = week.time(key, defTime);
    nodes.push({
      key,
      time,
      min: timeMin(time),
      seq,
      el: (
        <TimelineItem
          time={time}
          title={title}
          open={openKey === key}
          onOpen={() => setOpenKey((k) => (k === key ? null : key))}
          onTime={(t) => week.setTime(key, t)}
          onHide={() => week.hide(key)}
        >
          {content}
        </TimelineItem>
      ),
    });
  };

  push(
    "wake",
    "08:00",
    1,
    "起床 + 早餐（睡到自然醒）",
    <MealCard
      title="🍳 早餐"
      items={breakfastItems}
      check={check ? { ...check, prefix: "breakfast" } : undefined}
      diet={ed("breakfast", breakfastItems)}
    />,
  );
  push("lunch", DAY_TIMES.lunch, 2, "中餐", (
    <SharedMealCard meals={meals} section="午餐" keyName="lunch" title="🍚 中餐" check={check} diet={diet} />
  ));
  push("snack", DAY_TIMES.snack, 3, "下午加餐", (
    <SharedMealCard meals={meals} section="加餐" keyName="snack" title="🥛 下午加餐" check={check} diet={diet} />
  ));
  push("stair", DAY_TIMES.stair, 4, `爬楼机 · ${stairClimber.durationMin} 分钟`, (
    <StairClimberCard stairClimber={stairClimber} restNote />
  ));
  push("dinner", DAY_TIMES.dinner, 5, "晚餐", (
    <SharedMealCard meals={meals} section="晚餐" keyName="dinner" title="🥗 晚餐" check={check} diet={diet} />
  ));

  week.customs.forEach((c, i) => {
    const m = timeMin(c.time);
    nodes.push({
      key: `custom-${c.id ?? i}`,
      time: c.time,
      min: Number.isNaN(m) ? Number.POSITIVE_INFINITY : m,
      seq: 1000 + i,
      el: <CustomTaskRow c={c} index={i} handle={week} check={check} />,
    });
  });
  nodes.sort((a, b) => {
    const am = Number.isNaN(a.min) ? Number.POSITIVE_INFINITY : a.min;
    const bm = Number.isNaN(b.min) ? Number.POSITIVE_INFINITY : b.min;
    return am - bm || a.seq - b.seq;
  });

  return (
    <div className="space-y-5">
      {/* 休息日可选项：走路/拉伸 */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-sm font-medium text-zinc-200">今天休息 —— 肌肉是休息时长的</p>
        <ul className="mt-2 space-y-1 text-xs leading-5 text-zinc-400">
          <li>· 拉伸 10 分钟（胸、髋、肩各 2 个动作）</li>
          <li>· 走路 6000 步，促进血液循环恢复</li>
          <li>· 蛋白吃够，睡够 7.5 小时</li>
        </ul>
      </div>

      {/* 热身（休息日也允许做低强度）：每步可勾选 */}
      <details className="rounded-2xl border border-amber-800/30 bg-amber-950/10 p-3.5">
        <summary className="cursor-pointer text-xs font-semibold text-amber-300">
          🔥 热身参考（休息日做低强度有氧时再用）
        </summary>
        <div className="mt-2 space-y-1.5">
          {warmup.map((w, i) => (
            <CheckRow key={i} item={`warmup:${i}`} ctx={check ?? NOOP_CHECK} num={i + 1}>
              {w}
            </CheckRow>
          ))}
        </div>
      </details>

      {/* 时间线（无训练，仅吃 + 爬楼机可加） */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-200">⏰ 休息日时间线</h3>
        <div className="space-y-1">
          <AddDivider
            label="在开头加一件"
            onClick={() => {
              setInsertKey("top");
              setInsertTime("06:00");
            }}
          />
          {insertKey === "top" && (
            <AddInPlace
              defaultTime={insertTime}
              onAdd={(t, ti) => week.addCustom({ time: t, title: ti })}
              onCancel={() => setInsertKey(null)}
            />
          )}
          {nodes.map((n) => (
            <div key={n.key} className="space-y-1">
              <div>{n.el}</div>
              {insertKey === n.key && (
                <AddInPlace
                  defaultTime={insertTime}
                  onAdd={(t, ti) => week.addCustom({ time: t, title: ti })}
                  onCancel={() => setInsertKey(null)}
                />
              )}
              <AddDivider
                label="在这条下面加一件"
                onClick={() => {
                  setInsertKey(n.key);
                  setInsertTime(n.time);
                }}
              />
            </div>
          ))}
        </div>
        {nodes.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-center text-xs text-zinc-500">
            这一天还没有安排 —— 用上面的「＋ 在开头加一件」直接加
          </p>
        )}
        <DayTail week={week} />
      </div>
    </div>
  );
}

// 全局"随手待办"：没定时间的事。支持：新增 / 打勾 / 删 / 改内容 / 一键排进某天某时段
function InboxPanel({
  currentDay,
  onScheduleCurrent,
}: {
  currentDay: string;
  onScheduleCurrent: (entry: { time: string; title: string }) => void;
}) {
  const [items, setItems] = useState<{ id: number; text: string; checked: boolean }[]>([]);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [schedId, setSchedId] = useState<number | null>(null);
  const [sched, setSched] = useState({ weekday: currentDay, time: "12:00" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/inbox")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (alive) setItems(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2500);
    return () => clearTimeout(t);
  }, [msg]);

  async function post(body: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function add() {
    const t = text.trim();
    if (!t) return;
    const ok = await post({ action: "add", text: t });
    if (ok) {
      setItems((s) => [{ id: Date.now(), text: t, checked: false }, ...s]);
      setText("");
    }
  }
  function toggle(id: number, checked: boolean) {
    setItems((s) => s.map((i) => (i.id === id ? { ...i, checked } : i)));
    post({ action: "toggle", id, checked });
  }
  function del(id: number) {
    setItems((s) => s.filter((i) => i.id !== id));
    post({ action: "delete", id });
  }
  async function saveEdit(id: number) {
    const t = draft.trim();
    if (!t) return;
    const ok = await post({ action: "edit", id, text: t });
    if (ok) {
      setItems((s) => s.map((i) => (i.id === id ? { ...i, text: t } : i)));
      setEditingId(null);
    }
  }

  // 把某条待办排进「某天某时段」：当天直接进时间线，其它星期几写入数据库
  async function schedule() {
    const item = items.find((i) => i.id === schedId);
    if (!item || busy) return;
    setBusy(true);
    const entry = { time: sched.time.trim() || "12:00", title: item.text };
    try {
      if (sched.weekday === currentDay) {
        onScheduleCurrent(entry); // 当前页：插入时间线，自动保存
      } else {
        const g = await fetch(`/api/week-schedule?weekday=${encodeURIComponent(sched.weekday)}`);
        const doc = g.ok ? ((await g.json()) as { edits: Record<string, unknown>; customs: { time: string; title: string }[] }) : null;
        if (!doc) throw new Error("load failed");
        const body = {
          weekday: sched.weekday,
          edits: doc.edits ?? {},
          customs: [...(doc.customs ?? []), entry],
        };
        const res = await fetch("/api/week-schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("save failed");
      }
      // 安排成功后从随手待办移除
      await post({ action: "delete", id: item.id });
      setItems((s) => s.filter((i) => i.id !== item.id));
      setSchedId(null);
      setMsg(`已安排到 ${sched.weekday} ${entry.time}：${entry.title}`);
    } catch {
      setMsg("安排失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <h2 className="text-sm font-semibold text-zinc-200">🗒️ 随手待办（没定时间的事）</h2>
        <span className={`text-[10px] ${msg ? "text-emerald-400" : "text-zinc-500"}`}>
          {msg || (items.length ? `${items.length} 条` : "想记什么就写什么，随时可安排进某天")}
        </span>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="例如：买牛奶、回邮件…"
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
        <button
          onClick={add}
          className="shrink-0 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
        >
          添加
        </button>
      </div>
      {items.length > 0 && (
        <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
          {items.map((it) => (
            <li key={it.id} className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => toggle(it.id, !it.checked)}
                aria-pressed={it.checked}
                aria-label={it.checked ? "取消完成" : "标记完成"}
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border text-[10px] ${
                  it.checked ? "border-emerald-500 bg-emerald-500 text-zinc-950" : "border-zinc-600"
                }`}
              >
                {it.checked ? "✓" : ""}
              </button>

              {editingId === it.id ? (
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(it.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                  className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(it.id);
                    setDraft(it.text);
                  }}
                  aria-label={`改这条待办：${it.text}`}
                  className={`min-w-0 flex-1 rounded px-0.5 py-0.5 text-left text-xs leading-5 transition-colors hover:bg-zinc-800 ${
                    it.checked ? "text-zinc-500 line-through" : "text-zinc-200"
                  }`}
                >
                  {it.text}
                </button>
              )}

              {editingId === it.id ? (
                <button
                  onClick={() => saveEdit(it.id)}
                  className="shrink-0 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] text-white"
                >
                  保存
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setSchedId(it.id);
                      setSched((s) => ({ ...s, weekday: currentDay }));
                    }}
                    aria-label="安排到某天某时"
                    className="shrink-0 px-1 text-[11px] text-zinc-500 hover:text-emerald-400"
                  >
                    📅
                  </button>
                  <button
                    onClick={() => del(it.id)}
                    aria-label="删除该条"
                    className="shrink-0 px-1 text-[10px] text-zinc-600 hover:text-red-400"
                  >
                    ✕
                  </button>
                </>
              )}

              {schedId === it.id && !(editingId === it.id) && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-700/70 bg-zinc-950/60 px-2 py-1.5">
                  <select
                    value={sched.weekday}
                    onChange={(e) => setSched((s) => ({ ...s, weekday: e.target.value }))}
                    className="rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-[10px] text-zinc-200 outline-none"
                  >
                    {ALL_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    value={sched.time}
                    onChange={(e) => setSched((s) => ({ ...s, time: e.target.value }))}
                    aria-label="时间"
                    className="w-14 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-center text-[10px] text-emerald-300 outline-none"
                  />
                  <button onClick={schedule} disabled={busy} className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-medium text-white disabled:opacity-50">
                    安排
                  </button>
                  <button onClick={() => setSchedId(null)} className="px-1 text-[10px] text-zinc-500">
                    取消
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PlanView({
  plan,
  onRestart,
  showHeader = true,
  showMacros = true,
}: {
  plan: FitnessPlan;
  onRestart?: () => void;
  showHeader?: boolean; // 是否显示 PlanView 自身的头部（← 返回 + 重新填写）
  showMacros?: boolean; // 是否显示底部"每天吃多少"营养卡（首页摘要里已有，避免重复）
}) {
  const { overview, macros, meals, warmup, schedule } = plan;
  const [offset, setOffset] = useState(0);
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});

  // 兜底：旧版缓存 plan 缺新字段（爬楼机等）时不炸屏
  const safeMeals = useMemo(() => {
    const m = meals ?? ({} as MealPlan);
    return {
      ...m,
      stairClimber: m.stairClimber ?? {
        durationMin: 30,
        level: "5-7",
        hrZone: "119-139 bpm",
        slot: "下午加餐后 / 晚餐前（16:30 左右）",
        cues: [
          "目标心率区间 = (220 − 年龄) × 60-70%",
          "不握扶手多消耗 ~10% 热量",
          "阻力等级 5-7，步频稳定",
        ],
      },
    };
  }, [meals]);

  const viewDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  }, [offset]);

  const dayIndex = (viewDate.getDay() + 6) % 7;
  const dayName = ALL_DAYS[dayIndex];
  const dayPlan = schedule.find((d) => d.day === dayName)!;
  const iso = dateStr(viewDate);
  const isToday = offset === 0;
  const done = doneMap[iso] ?? false;

  // 载入已打卡记录
  useEffect(() => {
    let alive = true;
    fetch("/api/records")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { date: string; done: number }[]) => {
        if (!alive) return;
        const map: Record<string, boolean> = {};
        for (const r of rows ?? []) map[r.date] = !!r.done;
        setDoneMap(map);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 时间线打勾项（热身 / 各餐每一条）：按日期加载
  // 用 {iso, map} 结构：渲染时 iso 不匹配就视为空，天然避免“上一日勾选闪烁”
  const [checksState, setChecksState] = useState<{ iso: string; map: Record<string, boolean> }>({
    iso: "",
    map: {},
  });
  useEffect(() => {
    let alive = true;
    fetch(`/api/check-items?date=${iso}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { item: string; checked: number }[]) => {
        if (!alive) return;
        const map: Record<string, boolean> = {};
        for (const r of rows ?? []) if (r?.item) map[r.item] = !!r.checked;
        setChecksState({ iso, map });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [iso]);
  const checks = checksState.iso === iso ? checksState.map : {};

  // 乐观更新 + 落库；失败回滚
  const checkCtx: CheckCtx = {
    get: (item) => !!checks[item],
    toggle: (item) => {
      const next = !checks[item];
      setChecksState((s) => (s.iso === iso ? { ...s, map: { ...s.map, [item]: next } } : s));
      fetch("/api/check-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: iso, item, checked: next }),
      })
        .then((r) => {
          if (!r.ok) throw new Error("save failed");
        })
        .catch(() =>
          setChecksState((s) => (s.iso === iso ? { ...s, map: { ...s.map, [item]: !next } } : s)),
        );
    },
  };

  // 饮食清单覆盖：每条可增删改，独立存 diet_overrides（重生成计划不会被覆盖）
  const [dietSections, setDietSections] = useState<Record<string, string[]>>({});
  useEffect(() => {
    let alive = true;
    fetch("/api/plan/diet?goalId=fitness")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { sections?: Record<string, string[]> } | null) => {
        if (alive && d?.sections && typeof d.sections === "object") setDietSections(d.sections);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const dietCtx: DietCtx = {
    items: (section, fallback) => {
      const s = dietSections[section];
      return s !== undefined ? s : fallback;
    },
    save: (section, items) => {
      const prev = dietSections;
      const next = { ...prev, [section]: items };
      setDietSections(next);
      fetch("/api/plan/diet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: "fitness", sections: next }),
      })
        .then((r) => {
          if (!r.ok) throw new Error("save failed");
        })
        .catch(() => setDietSections(prev)); // 失败回滚
    },
  };

  // ---------- 周计划：当前星期几的节点编辑/自定义（自动保存） ----------
  // 用 {day, doc, ready} 结构：渲染时 day 不匹配就视为空，避免跨星期几闪烁
  const [weekState, setWeekState] = useState<{ day: string; doc: WeekDoc; ready: boolean }>({
    day: "",
    doc: { edits: {}, customs: [] },
    ready: false,
  });
  useEffect(() => {
    let alive = true;
    fetch(`/api/week-schedule?weekday=${encodeURIComponent(dayName)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { edits?: WeekDoc["edits"]; customs?: WeekDoc["customs"] } | null) => {
        if (!alive) return;
        const doc: WeekDoc =
          d && typeof d === "object"
            ? { edits: d.edits ?? {}, customs: d.customs ?? [] }
            : { edits: {}, customs: [] };
        setWeekState({ day: dayName, doc, ready: true });
      })
      .catch(() => {
        if (!alive) return;
        setWeekState({ day: dayName, doc: { edits: {}, customs: [] }, ready: true });
      });
    return () => {
      alive = false;
    };
  }, [dayName]);

  const weekReady = weekState.day === dayName && weekState.ready;
  const weekDoc = useMemo(
    () => (weekState.day === dayName ? weekState.doc : { edits: {}, customs: [] }),
    [weekState, dayName],
  );
  const patchDoc = (fn: (doc: WeekDoc) => WeekDoc) =>
    setWeekState((s) => (s.day === dayName ? { ...s, doc: fn(s.doc) } : s));

  // 有改动时自动保存（防抖 600ms）
  useEffect(() => {
    if (!weekReady) return;
    const t = setTimeout(() => {
      fetch("/api/week-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekday: dayName,
          edits: weekDoc.edits,
          customs: weekDoc.customs.map((c) => ({ time: c.time, title: c.title, note: c.note ?? "" })),
        }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [weekDoc, weekReady, dayName]);

  const setEdit = (key: string, patch: { time?: string; hidden?: boolean }) =>
    patchDoc((d) => ({ ...d, edits: { ...d.edits, [key]: { ...(d.edits[key] ?? {}), ...patch } } }));

  const week: WeekHandle = {
    time: (key, def) => weekDoc.edits[key]?.time || def,
    hidden: (key) => !!weekDoc.edits[key]?.hidden,
    hiddenKeys: Object.keys(weekDoc.edits).filter((k) => weekDoc.edits[k]?.hidden),
    setTime: (key, t) => setEdit(key, { time: t }),
    hide: (key) => setEdit(key, { hidden: true }),
    unhide: (key) => setEdit(key, { hidden: false }),
    customs: weekDoc.customs,
    addCustom: (c) => patchDoc((d) => ({ ...d, customs: [...d.customs, c] })),
    updateCustom: (index, patch) =>
      patchDoc((d) => ({ ...d, customs: d.customs.map((c, i) => (i === index ? { ...c, ...patch } : c)) })),
    removeCustom: (index) =>
      patchDoc((d) => ({ ...d, customs: d.customs.filter((_, i) => i !== index) })),
    reset: () => patchDoc(() => ({ edits: {}, customs: [] })),
  };

  // 完成 / 取消打卡（done 标记写 /api/records；再点一次即取消）
  async function setDayDone(next: boolean): Promise<boolean> {
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: iso,
          training: next ? `${dayPlan.type} · ${dayPlan.place} · ${dayPlan.exercises.length}个动作` : "",
          diet: next ? "全套时间线已执行" : "",
          calories: "",
          done: next,
        }),
      });
      if (!res.ok) return false;
      setDoneMap((m) => ({ ...m, [iso]: next }));
      return true;
    } catch {
      return false;
    }
  }

  // A / D 与 ← / → 快速切换日期（在输入框打字时不触发）
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        setOffset((o) => o - 1);
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        setOffset((o) => o + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const label = isToday
    ? "今天"
    : offset === 1
      ? "明天"
      : offset === -1
        ? "昨天"
        : `${viewDate.getMonth() + 1}/${viewDate.getDate()}`;

  return (
    <div className={showHeader ? "mx-auto max-w-lg px-5 pb-16 pt-5" : "pb-4"}>
      {/* 头部（PlanView 自带；首页关闭以避免与外层头部重复） */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
            ←
          </Link>
          <span className="text-xs text-zinc-500">
            {overview.splitName} · {overview.timeline}
          </span>
          <button onClick={onRestart} className="text-xs text-zinc-500 hover:text-zinc-300">
            重新填写
          </button>
        </div>
      )}
      {!showHeader && (
        <div className="mb-3 flex items-baseline justify-between px-1">
          <p className="text-xs text-zinc-500">
            {overview.splitName} · {overview.timeline}
          </p>
          {onRestart && (
            <button onClick={onRestart} className="text-[10px] text-zinc-500 hover:text-zinc-300">
              重新填写
            </button>
          )}
        </div>
      )}

      {/* 日期导航 */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setOffset(offset - 1)}
          aria-label="前一天"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
        >
          ←
        </button>
        <div className="text-center">
          <p className="text-lg font-bold">
            {dayName} <span className="text-emerald-400">{label}</span>
          </p>
          <p className="text-[11px] text-zinc-500">
            {dayPlan.type === "休息" ? "休息日" : `${dayPlan.type} · ${dayPlan.place}`}
          </p>
        </div>
        <button
          onClick={() => setOffset(offset + 1)}
          aria-label="后一天"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
        >
          →
        </button>
      </div>

      {/* 周条 */}
      <div className="mt-3 flex justify-center gap-2">
        {ALL_DAYS.map((d, i) => {
          const dp = schedule.find((s) => s.day === d)!;
          const active = i === dayIndex;
          return (
            <button
              key={d}
              onClick={() => setOffset(offset + (i - dayIndex))}
              className={`flex h-10 w-10 flex-col items-center justify-center rounded-xl border text-[10px] transition-all ${
                active
                  ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
              }`}
            >
              <span>{d.replace("周", "")}</span>
              <span className={`mt-0.5 h-1 w-1 rounded-full ${dp.type === "休息" ? "bg-zinc-700" : "bg-emerald-500"}`} />
            </button>
          );
        })}
      </div>

      {/* 随手待办（全局）：放日期下方、时间线上面，方便随时看到；支持改内容/安排进某天某时 */}
      <div className="mt-4">
        <InboxPanel
          currentDay={dayName}
          onScheduleCurrent={(entry) =>
            patchDoc((d) => ({ ...d, customs: [...d.customs, { time: entry.time, title: entry.title }] }))
          }
        />
      </div>

      {/* 当日内容 */}
      <div className="mt-5">
        {dayPlan.type === "休息" ? (
          <RestDay meals={safeMeals} warmup={warmup} stairClimber={safeMeals.stairClimber} check={checkCtx} diet={dietCtx} week={week} />
        ) : (
          <TrainingDay
            day={dayPlan}
            meals={safeMeals}
            warmup={dayPlan.warmup && dayPlan.warmup.length > 0 ? dayPlan.warmup : warmup}
            stairClimber={safeMeals.stairClimber}
            dateIso={iso}
            done={done}
            check={checkCtx}
            diet={dietCtx}
            week={week}
            onSetDone={setDayDone}
          />
        )}
      </div>
      <p className="mt-2 text-center text-[10px] text-zinc-600">快捷键：← → 或 A / D 切换日期</p>

      {/* 营养数字卡（首页关闭——摘要已有） */}
      {showMacros && (
        <>
          <h2 className="mt-10 text-base font-semibold text-zinc-100">🍽️ 每天吃多少</h2>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <StatCard label="基础代谢 BMR" value={macros.bmr} unit="kcal" />
            <StatCard label="每日消耗 TDEE" value={macros.tdee} unit="kcal" />
            <StatCard label={macros.targetLabel} value={macros.targetKcal} unit="kcal" accent />
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2.5">
            <StatCard label="蛋白质" value={macros.protein} unit="g" accent />
            <StatCard label="碳水" value={macros.carb} unit="g" />
            <StatCard label="脂肪" value={macros.fat} unit="g" />
          </div>
          <p className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs leading-5 text-zinc-400">
            {macros.note}
          </p>
        </>
      )}
    </div>
  );
}
