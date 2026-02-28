import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto flex max-w-xl flex-col items-start gap-4">
        <h1 className="text-headline">Page not found</h1>
        <p className="text-body text-slate-600 dark:text-slate-300">
          The page you are looking for doesn’t exist.
        </p>
        <Link
          className="rounded-xl bg-primary-600 px-6 py-3 text-white shadow-lg transition hover:bg-primary-700"
          href="/"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
