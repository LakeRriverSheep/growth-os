import Link from "next/link";
import type { ReactNode } from "react";

// 全站统一页头：返回固定在左上，标题跟随，右侧可挂操作
export default function PageHeader({
  title,
  sub,
  backHref = "/",
  backLabel = "← 返回",
  right,
}: {
  title: string;
  sub?: ReactNode;
  backHref?: string;
  backLabel?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-4 border-b border-zinc-900 px-6 py-4">
      <Link
        href={backHref}
        className="shrink-0 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
      >
        {backLabel}
      </Link>
      <h1 className="shrink-0 text-lg font-semibold">{title}</h1>
      {sub && <span className="min-w-0 truncate text-xs text-zinc-500">{sub}</span>}
      {right && <div className="ml-auto flex shrink-0 items-center gap-3">{right}</div>}
    </header>
  );
}
