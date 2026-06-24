// Skeleton shown while a portal page streams in. Mirrors the shell (rail +
// content) so navigation feels instant and stable.
export default function PortalLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 lg:flex">
      <div className="hidden w-64 shrink-0 bg-teal-950 lg:block" />
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          <div className="mb-2 h-7 w-44 animate-pulse rounded-lg bg-zinc-200" />
          <div className="mb-8 h-4 w-80 animate-pulse rounded bg-zinc-200/70" />
          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-zinc-200/80 bg-white"
              />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl border border-zinc-200/80 bg-white" />
        </main>
      </div>
    </div>
  );
}
