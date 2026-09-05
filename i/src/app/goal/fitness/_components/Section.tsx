// 表单区块容器：标题 + 提示 + 内容
export default function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-6">
      <h2 className="text-xl font-bold">{title}</h2>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
