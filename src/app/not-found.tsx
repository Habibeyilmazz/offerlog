import Link from "next/link";

export const metadata = { title: "Not found" };

// Unknown URLs outside the app's pages; without this Next.js shows its own unstyled black-and-white page.
export default function NotFound() {
  return (
    <main className="login">
      <div className="panel">
        <h1 style={{ fontSize: "1.4rem" }}>Nothing here</h1>
        <p className="muted">This address is not a page in offerlog. Check the link, or start from the board.</p>
        <div>
          <Link href="/" className="btn">
            Back to the board
          </Link>
        </div>
      </div>
    </main>
  );
}
