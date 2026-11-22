import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/session.ts";
import { LoginForm } from "./login-form.tsx";

export const metadata = { title: "Sign in to offerlog" };

export default async function LoginPage() {
  if (await isSignedIn()) redirect("/");
  return (
    <div className="login">
      <div className="panel">
        <div className="brand" style={{ padding: 0 }}>
          offer<span>log</span>
        </div>
        <p className="muted">Your job search, on your own machine.</p>
        <LoginForm />
      </div>
    </div>
  );
}
