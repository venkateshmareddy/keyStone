import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

function MissingAuthSecret() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 text-zinc-200">
      <h1 className="text-xl font-semibold">Environment not configured</h1>
      <p className="text-sm text-zinc-400">
        This deploy does not have <code className="text-zinc-300">AUTH_SECRET</code>{" "}
        (or <code className="text-zinc-300">NEXTAUTH_SECRET</code>). Auth.js refuses
        to run without it, which produces a generic 500 error.
      </p>
      <p className="text-sm text-zinc-400">
        In Netlify: <strong>Site configuration → Environment variables</strong> →
        open <code className="text-zinc-300">AUTH_SECRET</code> → under{" "}
        <strong>Scopes</strong>, enable <strong>Deploy previews</strong> (and
        branch deploys if you use them), not only Production. Redeploy after saving.
      </p>
      <p className="text-sm text-zinc-400">
        Diagnostic:{" "}
        <Link href="/api/health" className="text-emerald-400 hover:underline">
          /api/health
        </Link>{" "}
        should show <code className="text-zinc-300">hasAuthSecret: true</code>.
      </p>
    </div>
  );
}

export default async function Home() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret?.length) {
    return <MissingAuthSecret />;
  }

  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  redirect("/login");
}
