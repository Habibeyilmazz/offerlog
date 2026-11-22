import { logout } from "@/app/actions.ts";
import { requireUser } from "@/lib/session.ts";
import { Nav } from "./nav.tsx";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          offer<span>log</span>
        </div>
        <Nav />
        <form action={logout}>
          <button className="linklike">Sign out</button>
        </form>
      </aside>
      <main>{children}</main>
    </div>
  );
}
