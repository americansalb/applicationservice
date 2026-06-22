// Lightweight text wordmark for the platform. Pure/presentational so it can be
// used from both server and client components. The product name shown here
// ("Evaluation Platform") is a placeholder until the service is named.
export function Wordmark({
  className = "",
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  const main = tone === "dark" ? "text-gray-900" : "text-white";
  const sub = tone === "dark" ? "text-teal-700" : "text-teal-300";
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 font-black text-white shadow-sm">
        A
      </span>
      <span className="leading-tight">
        <span className={`block text-base font-extrabold tracking-tight ${main}`}>
          AALB
        </span>
        <span
          className={`block text-[11px] font-medium uppercase tracking-wider ${sub}`}
        >
          Evaluation Platform
        </span>
      </span>
    </div>
  );
}
