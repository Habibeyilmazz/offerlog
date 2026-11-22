import { logout } from "@/app/actions.ts";
import { requireUser } from "@/lib/session.ts";
import { FocusKeeper } from "./focus-keeper.tsx";
import { Nav } from "./nav.tsx";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">
          offer<span>log</span>
        </div>
        <Nav />
        <form action={logout}>
          <button className="linklike">Sign out</button>
        </form>
      </aside>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <FocusKeeper />
    </div>
  );
}
