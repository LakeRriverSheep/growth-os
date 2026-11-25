"use client";
import { useCallback, useEffect, useState } from "react";
import type { Identity, ProfileGroup, Action } from "@/lib/identity";
import { IDENTITY_DEFAULT } from "@/lib/identity";

// 身份层的增删改查：整份 JSON 读写 /api/identity。
// 每一节都可加/改/删；改动先落在本地 state，点「保存」整体写回。

const inputCls =
  "rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600";
const iconBtn =
  "shrink-0 rounded-md px-1.5 py-0.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200";
const addBtn =
  "rounded-lg border border-dashed border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200";

export default function IdentityView() {
  const [data, setData] = useState<Identity>(IDENTITY_DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/identity")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) {
          setData(d);
          setLoaded(true);
        }
      })
      .catch(() => setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((fn: (d: Identity) => Identity) => {
    setData((prev) => fn(prev));
    setDirty(true);
  }, []);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const r = await fetch("/api/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (r.ok) {
        setDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  // ── profile（分组 + 标签）──────────────────────────────
  function addGroup() {
    update((d) => ({ ...d, profile: [...d.profile, { group: "", tags: [] }] }));
  }
  function setGroupName(i: number, v: string) {
    update((d) => {
      const p = d.profile.slice();
      p[i] = { ...p[i], group: v };
      return { ...d, profile: p };
    });
  }
  function delGroup(i: number) {
    update((d) => ({ ...d, profile: d.profile.filter((_, idx) => idx !== i) }));
  }
  function addTag(gi: number) {
    update((d) => {
      const p = d.profile.slice();
      p[gi] = { ...p[gi], tags: [...p[gi].tags, ""] };
      return { ...d, profile: p };
    });
  }
  function setTag(gi: number, ti: number, v: string) {
    update((d) => {
      const p = d.profile.slice();
      const tags = p[gi].tags.slice();
      tags[ti] = v;
      p[gi] = { ...p[gi], tags };
      return { ...d, profile: p };
    });
  }
  function delTag(gi: number, ti: number) {
    update((d) => {
      const p = d.profile.slice();
      p[gi] = { ...p[gi], tags: p[gi].tags.filter((_, idx) => idx !== ti) };
      return { ...d, profile: p };
    });
  }

  // ── motives / bans / dailyQuestions（字符串列表）────────
  function setStr(arr: string[], i: number, v: string): string[] {
    const a = arr.slice();
    a[i] = v;
    return a;
  }
  function delStr(arr: string[], i: number): string[] {
    return arr.filter((_, idx) => idx !== i);
  }

  // ── actions（goal + action）───────────────────────────
  function addAction() {
    update((d) => ({ ...d, actions: [...d.actions, { goal: "", action: "" }] }));
  }
  function setAction(i: number, field: keyof Action, v: string) {
    update((d) => {
      const a = d.actions.slice();
      a[i] = { ...a[i], [field]: v };
      return { ...d, actions: a };
    });
  }
  function delAction(i: number) {
    update((d) => ({ ...d, actions: d.actions.filter((_, idx) => idx !== i) }));
  }

  return (
    <div>
      {/* ① 我想成为什么样的人 */}
      <section className="mt-8 scroll-mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">① 我想成为什么样的人</h2>
          <button onClick={addGroup} className={addBtn}>+ 分组</button>
        </div>
        <div className="mt-3 space-y-4">
          {data.profile.map((g: ProfileGroup, gi) => (
            <div key={gi} className="rounded-xl border border-zinc-800/70 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={g.group}
                  onChange={(e) => setGroupName(gi, e.target.value)}
                  placeholder="分组名（身体 / 技能 / 性格…）"
                  className={inputCls + " font-medium"}
                />
                <button onClick={() => delGroup(gi)} className={iconBtn} title="删除分组">删</button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {g.tags.map((t, ti) => (
                  <span key={ti} className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60">
                    <input
                      value={t}
                      onChange={(e) => setTag(gi, ti, e.target.value)}
                      placeholder="标签"
                      className="w-[90px] bg-transparent px-2 py-1 text-xs text-zinc-300 outline-none placeholder:text-zinc-600"
                    />
                    <button onClick={() => delTag(gi, ti)} className={iconBtn} title="删除">×</button>
                  </span>
                ))}
                <button onClick={() => addTag(gi)} className={addBtn}>+ 标签</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ② 我为什么要成为这样的人 */}
      <section className="mt-8 border-t border-zinc-900 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">② 我为什么要成为这样的人</h2>
          <button
            onClick={() => update((d) => ({ ...d, motives: [...d.motives, ""] }))}
            className={addBtn}
          >
            + 动机
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {data.motives.map((m, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-zinc-600">·</span>
              <input
                value={m}
                onChange={(e) => update((d) => ({ ...d, motives: setStr(d.motives, i, e.target.value) }))}
                className={inputCls + " flex-1"}
              />
              <button
                onClick={() => update((d) => ({ ...d, motives: delStr(d.motives, i) }))}
                className={iconBtn}
              >
                删
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* ③ 我应该做什么 */}
      <section className="mt-8 border-t border-zinc-900 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">③ 我应该做什么</h2>
          <button onClick={addAction} className={addBtn}>+ 事项</button>
        </div>
        <div className="mt-3 grid gap-2.5 lg:grid-cols-2">
          {data.actions.map((a, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={a.goal}
                  onChange={(e) => setAction(i, "goal", e.target.value)}
                  placeholder="目标（雅思 8 分 / 低体脂…）"
                  className={inputCls + " flex-1 text-sm font-medium"}
                />
                <button onClick={() => delAction(i)} className={iconBtn} title="删除">删</button>
              </div>
              <textarea
                value={a.action}
                onChange={(e) => setAction(i, "action", e.target.value)}
                placeholder="为此要做什么…"
                rows={2}
                className="mt-2 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[13px] leading-6 text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ④ 我不应该做什么 */}
      <section className="mt-8 border-t border-zinc-900 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">④ 我不应该做什么</h2>
          <button
            onClick={() => update((d) => ({ ...d, bans: [...d.bans, ""] }))}
            className={addBtn}
          >
            + 禁令
          </button>
        </div>
        <ul className="mt-3 grid gap-2.5 lg:grid-cols-2">
          {data.bans.map((b, i) => (
            <li key={i} className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-800 p-3">
              <span className="h-3 w-3 shrink-0 bg-zinc-600" />
              <input
                value={b}
                onChange={(e) => update((d) => ({ ...d, bans: setStr(d.bans, i, e.target.value) }))}
                className={inputCls + " flex-1 text-[13px]"}
              />
              <button
                onClick={() => update((d) => ({ ...d, bans: delStr(d.bans, i) }))}
                className={iconBtn}
              >
                删
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 每日四问 */}
      <section className="mt-8 border-t border-zinc-900 pt-6">
        <h2 className="text-sm font-semibold text-zinc-200">每日四问</h2>
        <ol className="mt-3 space-y-1.5">
          {data.dailyQuestions.map((q, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-zinc-600">{i + 1}.</span>
              <input
                value={q}
                onChange={(e) =>
                  update((d) => ({ ...d, dailyQuestions: setStr(d.dailyQuestions, i, e.target.value) }))
                }
                className={inputCls + " flex-1"}
              />
              <button
                onClick={() => update((d) => ({ ...d, dailyQuestions: delStr(d.dailyQuestions, i) }))}
                className={iconBtn}
              >
                删
              </button>
            </li>
          ))}
        </ol>
      </section>

      {/* 保存栏 */}
      <div className="sticky bottom-0 mt-8 flex items-center justify-end gap-3 border-t border-zinc-800 bg-zinc-950/95 py-3 backdrop-blur">
        <span className="text-xs text-zinc-500">
          {saved ? "已保存 ✓" : dirty ? "有未保存的修改" : loaded ? "" : "加载中…"}
        </span>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="rounded-lg bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-950 transition-opacity hover:opacity-90 disabled:opacity-30"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  );
}
