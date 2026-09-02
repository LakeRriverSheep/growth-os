import FitnessForm from "./FitnessForm";

export default function FitnessPage() {
  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
      <main className="mx-auto max-w-2xl">
        <a href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← 返回
        </a>
        <header className="mt-4 mb-8">
          <h1 className="text-2xl font-bold">💪 健身</h1>
          <p className="text-sm text-zinc-400">
            回答几个问题，直接给你能照着执行的详细计划
          </p>
        </header>
        <FitnessForm />
      </main>
    </div>
  );
}
