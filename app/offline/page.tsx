import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-zinc-200">
      <h1 className="text-xl font-semibold">You’re offline</h1>
      <p className="max-w-md text-sm text-zinc-400">
        Keystone needs a network connection to load your notes from the server.
        Cached pages may still open from a previous visit.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-emerald-400 hover underline"
      >
        Try again
      </Link>
    </div>
  );
}
