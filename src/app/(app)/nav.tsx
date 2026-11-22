"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Board"],
  ["/questions", "Question bank"],
  ["/tailor", "Resume tailor"],
  ["/analytics", "Analytics"],
  ["/data", "Import & export"],
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" style={{ display: "contents" }}>
      {LINKS.map(([href, label]) => {
        const active = href === "/" ? path === "/" || path.startsWith("/applications") : path.startsWith(href);
        return (
          <Link key={href} href={href} className="nav-link" aria-current={active ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
