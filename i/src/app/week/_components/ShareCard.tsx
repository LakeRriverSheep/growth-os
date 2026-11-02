"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isoWeekNo,
  trainingPartLine,
  weekRangeLabel,
  type WeekReport,
  type WeekStats,
} from "@/lib/week";

// 出片：1080×1440，纯黑底 + 大留白。
// 有照片走「照片墙 + 数据条」，没照片走「数据卡」——都不需要服务端存原图。

const W = 1080;
const H = 1440;
const PAD = 80;

const CN_FONT = `"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif`;
const MONO_FONT = `"SF Mono", "JetBrains Mono", ui-monospace, "Menlo", monospace`;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of text) {
    const next = cur + ch;
    if (ctx.measureText(next).width > maxWidth && cur) {
      lines.push(cur);
      cur = ch;
      if (lines.length === maxLines) break;
    } else {
      cur = next;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** 按 cover 方式裁进指定矩形 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

function dataRows(stats: WeekStats): { k: string; v: string }[] {
  const rows: { k: string; v: string }[] = [];
  const part = trainingPartLine(stats);
  if (stats.trainingDays > 0) rows.push({ k: "训练", v: part });
  if (stats.cardioKm > 0)
    rows.push({ k: "有氧", v: `${stats.cardioKm} km · ${stats.cardioMin} min` });
  if (stats.totalSets > 0) rows.push({ k: "总组数", v: `${stats.totalSets} 组` });
  if (stats.dietDays > 0) {
    rows.push({ k: "蛋白", v: `${stats.proteinAvg} g / 日均` });
    rows.push({ k: "碳水", v: `${stats.carbAvg} g / 日均` });
  }
  if (stats.sleepDays > 0) rows.push({ k: "睡眠", v: `${stats.sleepAvg} h / 日均` });
  if (rows.length === 0) rows.push({ k: "本周", v: `${stats.total} 条记录` });
  return rows.slice(0, 6);
}

export default function ShareCard({
  weekStart,
  stats,
  report,
  onClose,
}: {
  weekStart: string;
  stats: WeekStats;
  report: WeekReport | null;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const genRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gen = ++genRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setReady(false);

    const imgs: HTMLImageElement[] = [];
    for (const src of photos.slice(0, 4)) {
      try {
        imgs.push(await loadImage(src));
      } catch {
        // 坏图跳过
      }
    }
    if (gen !== genRef.current) return;

    // 底
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, W, H);

    // 顶部 meta
    ctx.fillStyle = "#71717a";
    ctx.font = `500 26px ${MONO_FONT}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`WEEK ${String(isoWeekNo(weekStart)).padStart(2, "0")}`, PAD, 108);

    ctx.textAlign = "right";
    ctx.fillStyle = "#52525b";
    ctx.fillText(weekRangeLabel(weekStart), W - PAD, 108);
    ctx.textAlign = "left";

    ctx.strokeStyle = "#27272a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, 140);
    ctx.lineTo(W - PAD, 140);
    ctx.stroke();

    const hasPhotos = imgs.length > 0;
    const headline = report?.headline || "这一周，留下了这些痕迹";
    const insight =
      report?.insight ||
      (stats.trainingDays > 0
        ? `训练 ${stats.trainingDays} 天，${trainingPartLine(stats)}。数据不用完美，能看见趋势就够了。`
        : "记录不是为了完美，是为了让下周的自己有据可依。");

    // headline
    const headSize = hasPhotos ? 46 : 54;
    ctx.fillStyle = "#fafafa";
    ctx.font = `500 ${headSize}px ${CN_FONT}`;
    const headLines = wrapText(ctx, headline, W - PAD * 2, 2);
    headLines.forEach((line, i) => {
      ctx.fillText(line, PAD, 220 + i * (headSize + 18));
    });

    let y = 220 + headLines.length * (headSize + 18) + 30;

    // 照片墙
    if (hasPhotos) {
      const gap = 12;
      const ph = 500;
      const fullW = W - PAD * 2;

      if (imgs.length === 1) {
        drawCover(ctx, imgs[0], PAD, y, fullW, ph, 18);
      } else if (imgs.length === 2) {
        const half = (fullW - gap) / 2;
        drawCover(ctx, imgs[0], PAD, y, half, ph, 18);
        drawCover(ctx, imgs[1], PAD + half + gap, y, half, ph, 18);
      } else if (imgs.length === 3) {
        const bigW = fullW * 0.58;
        const rightW = fullW - bigW - gap;
        const smallH = (ph - gap) / 2;
        drawCover(ctx, imgs[0], PAD, y, bigW, ph, 18);
        drawCover(ctx, imgs[1], PAD + bigW + gap, y, rightW, smallH, 18);
        drawCover(ctx, imgs[2], PAD + bigW + gap, y + smallH + gap, rightW, smallH, 18);
      } else {
        const halfW = (fullW - gap) / 2;
        const halfH = (ph - gap) / 2;
        drawCover(ctx, imgs[0], PAD, y, halfW, halfH, 18);
        drawCover(ctx, imgs[1], PAD + halfW + gap, y, halfW, halfH, 18);
        drawCover(ctx, imgs[2], PAD, y + halfH + gap, halfW, halfH, 18);
        drawCover(ctx, imgs[3], PAD + halfW + gap, y + halfH + gap, halfW, halfH, 18);
      }
      y += ph + 56;
    } else {
      // 大数字：训练日
      const big = stats.trainingDays > 0 ? stats.trainingDays : stats.total;
      ctx.fillStyle = "#fafafa";
      ctx.font = `500 132px ${MONO_FONT}`;
      ctx.fillText(String(big), PAD - 4, y + 110);

      const bw = ctx.measureText(String(big)).width;
      ctx.fillStyle = "#71717a";
      ctx.font = `400 26px ${CN_FONT}`;
      ctx.fillText(stats.trainingDays > 0 ? "个训练日" : "条记录", PAD + bw + 18, y + 96);

      y += 180;
    }

    // 数据行
    const rows = dataRows(stats);
    const rowH = hasPhotos ? 62 : 78;
    for (const row of rows) {
      if (y > 1180) break;
      ctx.strokeStyle = "#1f1f23";
      ctx.beginPath();
      ctx.moveTo(PAD, y);
      ctx.lineTo(W - PAD, y);
      ctx.stroke();

      ctx.fillStyle = "#71717a";
      ctx.font = `400 26px ${CN_FONT}`;
      ctx.fillText(row.k, PAD, y + rowH * 0.62);

      ctx.textAlign = "right";
      ctx.fillStyle = "#e4e4e7";
      ctx.font = `500 30px ${CN_FONT}`;
      // 值太长就缩字号
      let size = 30;
      while (ctx.measureText(row.v).width > W - PAD * 2 - 160 && size > 20) {
        size -= 2;
        ctx.font = `500 ${size}px ${CN_FONT}`;
      }
      ctx.fillText(row.v, W - PAD, y + rowH * 0.62);
      ctx.textAlign = "left";

      y += rowH;
    }

    // insight
    const insightY = Math.min(y + 50, 1210);
    ctx.strokeStyle = "#27272a";
    ctx.beginPath();
    ctx.moveTo(PAD, insightY);
    ctx.lineTo(PAD + 56, insightY);
    ctx.stroke();

    ctx.fillStyle = "#a1a1aa";
    ctx.font = `400 27px ${CN_FONT}`;
    const insLines = wrapText(ctx, insight, W - PAD * 2, 3);
    insLines.forEach((line, i) => {
      ctx.fillText(line, PAD, insightY + 48 + i * 44);
    });

    // 底部标识
    ctx.fillStyle = "#3f3f46";
    ctx.font = `500 24px ${MONO_FONT}`;
    ctx.fillText("I", PAD, H - 56);

    ctx.fillStyle = "#3f3f46";
    ctx.font = `400 20px ${CN_FONT}`;
    ctx.textAlign = "right";
    ctx.fillText("电子版的自己 · LRS", W - PAD, H - 56);
    ctx.textAlign = "left";

    setReady(true);
  }, [photos, stats, report, weekStart]);

  useEffect(() => {
    void draw();
  }, [draw]);

  function onPick(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 4);
    list.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result ?? "");
        if (src) setPhotos((prev) => (prev.length >= 4 ? prev : [...prev, src]));
      };
      reader.readAsDataURL(f);
    });
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `I-week-${weekStart}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, "image/png");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-950 p-4 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-200">出片</p>
          <button onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-300">
            关闭
          </button>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
          <canvas ref={canvasRef} width={W} height={H} className="block h-auto w-full" />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              onPick(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 rounded-xl border border-zinc-700 px-3 py-2.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500"
          >
            加照片（{photos.length}/4）
          </button>
          {photos.length > 0 && (
            <button
              onClick={() => setPhotos([])}
              className="rounded-xl border border-zinc-800 px-3 py-2.5 text-xs text-zinc-500 hover:text-zinc-300"
            >
              清空
            </button>
          )}
        </div>

        <button
          onClick={download}
          disabled={!ready}
          className="mt-2 w-full rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          保存图片
        </button>

        <p className="mt-2 text-center text-[11px] leading-5 text-zinc-600">
          照片只在本机合成，不上传服务器。
        </p>
      </div>
    </div>
  );
}
