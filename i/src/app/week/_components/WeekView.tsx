"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/_components/PageHeader";
import ShareCard from "./ShareCard";
import {
  KIND_META,
  addDays,
  computeStats,
  trainingPartLine,
  weekRangeLabel,
  weekRelativeLabel,
  weekStartOf,
  type WeekItem,
  type WeekItemKind,
  type WeekReport,
} from "@/lib/week";

type Msg = { type: "ok" | "warn" | "err"; text: string } | null;

const MAX_IMAGES = 8;

/** 压到长边 1600 / jpeg 0.82 —— 手机原图动辄 5MB，直传必被网关掐 */
async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 不可用");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.82);
}

function itemSummary(item: WeekItem): string {
  const d = item.data;
  const n = (v: unknown) => (typeof v === "number" ? v : parseFloat(String(v ?? "")));
  const bits: string[] = [];

  if (item.kind === "training") {
    if (n(d.sets)) bits.push(`${n(d.sets)} 组`);
    if (n(d.reps)) bits.push(`${n(d.reps)} 次`);
    if (n(d.weight)) bits.push(`${n(d.weight)} kg`);
    if (n(d.distance)) bits.push(`${n(d.distance)} km`);
    if (n(d.duration)) bits.push(`${n(d.duration)} 分钟`);
  } else if (item.kind === "diet") {
    if (n(d.protein)) bits.push(`蛋白 ${n(d.protein)}g`);
    if (n(d.carb)) bits.push(`碳水 ${n(d.carb)}g`);
    if (n(d.fat)) bits.push(`脂肪 ${n(d.fat)}g`);
    if (n(d.kcal)) bits.push(`${n(d.kcal)} kcal`);
  } else if (item.kind === "sleep") {
    if (n(d.hours)) bits.push(`${n(d.hours)} 小时`);
    if (d.bed && d.wake) bits.push(`${String(d.bed)}–${String(d.wake)}`);
  } else if (item.kind === "study") {
    if (d.topic) bits.push(String(d.topic));
  }

  const tail = bits.length > 0 ? bits.join(" · ") : item.raw.slice(0, 60);
  return tail || "已记录";
}

const KIND_ORDER: WeekItemKind[] = ["training", "diet", "sleep", "study", "thought", "other"];

export default function WeekView({
  weekStart,
  initialItems,
  initialReport,
  ai,
}: {
  weekStart: string;
  initialItems: WeekItem[];
  initialReport: WeekReport | null;
  ai: { ready: boolean; vision: boolean; label: string };
}) {
  const [items, setItems] = useState<WeekItem[]>(initialItems);
  const [report, setReport] = useState<WeekReport | null>(initialReport);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [dragging, setDragging] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => computeStats(items), [items]);

  const grouped = useMemo(() => {
    const map = new Map<WeekItemKind, WeekItem[]>();
    for (const it of items) {
      const arr = map.get(it.kind) ?? [];
      arr.push(it);
      map.set(it.kind, arr);
    }
    return KIND_ORDER.filter((k) => (map.get(k)?.length ?? 0) > 0).map((k) => ({
      kind: k,
      list: map.get(k) as WeekItem[],
    }));
  }, [items]);

  const refreshItems = useCallback(async () => {
    const res = await fetch(`/api/week/items?week=${weekStart}`, { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { items?: WeekItem[] };
    setItems(json.items ?? []);
  }, [weekStart]);

  const submit = useCallback(
    async (payload: { images?: string[]; text?: string; url?: string }) => {
      setBusy("正在识别…");
      setMsg(null);
      try {
        const res = await fetch("/api/week/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weekStart, ...payload }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          inserted?: number;
          warning?: string;
          provider?: string;
        };

        if (json.warning) {
          setMsg({ type: json.ok ? "warn" : "err", text: json.warning });
        } else if (json.ok) {
          setMsg({
            type: "ok",
            text: `已整理出 ${json.inserted ?? 0} 条${json.provider ? `（${json.provider}）` : ""}`,
          });
        }

        if ((json.inserted ?? 0) > 0) {
          setText("");
          setUrl("");
          setReport(null);
          await refreshItems();
        }
      } catch {
        setMsg({ type: "err", text: "网络错误，再试一次" });
      } finally {
        setBusy("");
      }
    },
    [weekStart, refreshItems],
  );

  const onFiles = useCallback(
    async (files: FileList | File[]) => {
      const imgs = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, MAX_IMAGES);
      if (imgs.length === 0) {
        setMsg({ type: "err", text: "只支持图片和截图" });
        return;
      }
      setBusy(`正在压缩 ${imgs.length} 张图…`);
      const dataUrls: string[] = [];
      for (const f of imgs) {
        try {
          dataUrls.push(await compressImage(f));
        } catch {
          // HEIC 等格式浏览器解不了，跳过
        }
      }
      if (dataUrls.length === 0) {
        setBusy("");
        setMsg({ type: "err", text: "这些图浏览器解不了，换 jpg/png 截图试试" });
        return;
      }
      await submit({ images: dataUrls });
    },
    [submit],
  );

  // 直接 Ctrl+V 粘截图 —— 比「保存到本地再选文件」少两步
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.some((f) => f.type.startsWith("image/"))) onFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFiles]);

  async function genReport() {
    setBusy("正在写总结…");
    setMsg(null);
    try {
      const res = await fetch("/api/week/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart }),
      });
      const json = (await res.json()) as { report?: WeekReport; warning?: string };
      if (json.report) setReport(json.report);
      if (json.warning) setMsg({ type: "warn", text: json.warning });
    } catch {
      setMsg({ type: "err", text: "生成失败，再试一次" });
    } finally {
      setBusy("");
    }
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/week/items?id=${id}`, { method: "DELETE" });
    await refreshItems();
  }

  const prev = addDays(weekStart, -7);
  const next = addDays(weekStart, 7);
  const isCurrent = weekStart === weekStartOf(new Date());

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <PageHeader
        title="周复盘"
        sub={`${weekRangeLabel(weekStart)} · ${weekRelativeLabel(weekStart)}`}
        backHref="/"
        right={
          <button
            onClick={() => setShowShare(true)}
            disabled={items.length === 0}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500 disabled:opacity-30"
          >
            出片
          </button>
        }
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-24 pt-4">
        {/* 周切换 */}
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <Link href={`/week?week=${prev}`} className="px-2 py-1 hover:text-zinc-300">
            ← {weekRangeLabel(prev)}
          </Link>
          {!isCurrent && (
            <Link href="/week" className="text-zinc-600 hover:text-zinc-400">
              回到本周
            </Link>
          )}
          <Link href={`/week?week=${next}`} className="px-2 py-1 hover:text-zinc-300">
            {weekRangeLabel(next)} →
          </Link>
        </div>

        {/* 上传 */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void onFiles(e.dataTransfer.files);
          }}
          className={`mt-3 rounded-2xl border border-dashed p-6 text-center transition-colors ${
            dragging ? "border-zinc-400 bg-zinc-900" : "border-zinc-800 bg-zinc-900/30"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) void onFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <p className="text-sm text-zinc-300">把这一周的截图丢进来</p>
          <p className="mt-1 text-[11px] leading-5 text-zinc-500">
            训练记录 · 饭照 · 体重报告 · 课表 · 聊天记录，截图和照片都行
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={!!busy}
            className="mt-4 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-500 disabled:opacity-40"
          >
            {busy || "选图 / 拖进来 / Ctrl+V"}
          </button>
          <p className="mt-3 text-[11px] text-zinc-600">
            {ai.ready
              ? `识别引擎：${ai.label}${ai.vision ? "" : "（不支持图片，仅文字）"}`
              : "未配置 AI key：目前只能存文字"}
          </p>
        </section>

        {/* 文字 / 链接 */}
        <section className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="也可以直接写：周三练胸，卧推 60kg 8次 4组；周四上了算法课，讲贪心…"
            className="w-full resize-none bg-transparent text-sm leading-6 text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-2 border-t border-zinc-800 pt-3">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="或者粘一个链接"
              className="min-w-0 flex-1 bg-transparent text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
            />
            <button
              onClick={() => void submit({ text, url })}
              disabled={!!busy || (!text.trim() && !url.trim())}
              className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500 disabled:opacity-30"
            >
              整理进去
            </button>
          </div>
        </section>

        {msg && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-xs leading-5 ${
              msg.type === "err"
                ? "bg-red-950/40 text-red-300"
                : msg.type === "warn"
                  ? "bg-amber-950/30 text-amber-300"
                  : "bg-emerald-950/30 text-emerald-300"
            }`}
          >
            {msg.text}
          </p>
        )}

        {/* 本周数据 */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-zinc-300">这周的数据</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="训练" value={trainingPartLine(stats)} small />
            <Stat
              label="有氧"
              value={stats.cardioKm > 0 ? `${stats.cardioKm} km` : "—"}
              sub={stats.cardioMin > 0 ? `${stats.cardioMin} 分钟` : ""}
            />
            <Stat label="训练日" value={`${stats.trainingDays} 天`} />
            <Stat
              label="蛋白 · 日均"
              value={stats.dietDays > 0 ? `${stats.proteinAvg} g` : "—"}
              sub={stats.dietDays > 0 ? `记了 ${stats.dietDays} 天` : ""}
            />
            <Stat
              label="碳水 · 日均"
              value={stats.dietDays > 0 ? `${stats.carbAvg} g` : "—"}
            />
            <Stat
              label="睡眠 · 日均"
              value={stats.sleepDays > 0 ? `${stats.sleepAvg} h` : "—"}
            />
          </div>
        </section>

        {/* 周报 */}
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">周总结</h2>
            <button
              onClick={() => void genReport()}
              disabled={!!busy || items.length === 0}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500 disabled:opacity-30"
            >
              {report ? "重写" : "生成"}
            </button>
          </div>

          {report ? (
            <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-lg font-semibold leading-7">{report.headline}</p>
              {report.insight && (
                <p className="mt-2 text-xs leading-6 text-zinc-400">{report.insight}</p>
              )}

              <Block title="做到了" items={report.highlights} tone="ok" />
              <Block title="缺口" items={report.gaps} tone="warn" />
              <Block title="下周" items={report.next} tone="plain" />

              <p className="mt-4 text-[11px] text-zinc-600">
                {report.source === "ai" ? "AI 生成" : "模板生成（未配置 AI 或调用失败）"}
              </p>
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 text-xs leading-6 text-zinc-500">
              {items.length === 0
                ? "先传点东西，再生成总结。"
                : "点「生成」，把这一周的条目浓缩成几句话说清楚。"}
            </p>
          )}
        </section>

        {/* 条目 */}
        {grouped.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-zinc-300">
              本周条目 <span className="text-zinc-600">{items.length}</span>
            </h2>
            <div className="mt-3 space-y-4">
              {grouped.map(({ kind, list }) => (
                <div key={kind}>
                  <p className="text-[11px] text-zinc-600">
                    {KIND_META[kind].emoji} {KIND_META[kind].label} · {list.length}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {list.map((it) => (
                      <li
                        key={it.id}
                        className="group flex items-center gap-3 rounded-lg border border-zinc-800/70 px-3 py-2"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs text-zinc-300">
                            {it.label || KIND_META[kind].label}
                          </span>
                          <span className="block truncate text-[11px] text-zinc-600">
                            {itemSummary(it)}
                          </span>
                        </span>
                        <button
                          onClick={() => void removeItem(it.id)}
                          className="shrink-0 text-[11px] text-zinc-700 transition-colors hover:text-red-400"
                          aria-label="删除"
                        >
                          删
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {items.length === 0 && (
          <p className="mt-10 text-center text-xs leading-6 text-zinc-600">
            这周还是空的。
            <br />
            周末花五分钟，把相册里的截图一口气丢进来就够。
          </p>
        )}
      </main>

      {showShare && (
        <ShareCard
          weekStart={weekStart}
          stats={stats}
          report={report}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  small,
}: {
  label: string;
  value: string;
  sub?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p
        className={`mt-1 font-semibold leading-5 text-zinc-100 ${
          small ? "text-xs" : "text-base"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-zinc-600">{sub}</p>}
    </div>
  );
}

function Block({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "ok" | "warn" | "plain";
}) {
  if (!items || items.length === 0) return null;
  const color =
    tone === "ok" ? "text-emerald-400/80" : tone === "warn" ? "text-amber-400/80" : "text-zinc-400";
  return (
    <div className="mt-4">
      <p className={`text-[10px] ${color}`}>{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((s, i) => (
          <li key={i} className="text-xs leading-6 text-zinc-300">
            · {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
