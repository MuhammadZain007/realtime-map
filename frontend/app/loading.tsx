export default function Loading() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="glass-effect h-[420px] rounded-2xl" />
        <div className="glass-effect h-28 rounded-2xl" />
      </div>
    </main>
  );
}
