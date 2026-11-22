import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/session.ts";
import { LoginForm } from "./login-form.tsx";

export const metadata = { title: "Sign in to offerlog" };

export default async function LoginPage() {
  if (await isSignedIn()) redirect("/");
  return (
    <main className="login">
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="" width={40} height={40} style={{ borderRadius: 9 }} />
          <h1 style={{ fontSize: "1.4rem" }}>offerlog</h1>
        </div>
        <p className="muted">Your job search, on your own machine.</p>
        <LoginForm />
      </div>
    </main>
  );
}
