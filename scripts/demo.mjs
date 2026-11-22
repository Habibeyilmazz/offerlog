// Records the README demo GIF from a running instance freshly seeded with `npm run db:seed`:
//   node scripts/demo.mjs <baseUrl> <password> <out.gif>
// It moves one demo card to Screening, so reseed afterwards (`npm run db:seed -- --force`). Needs ffmpeg on PATH.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [baseArg = "http://localhost:4220", password, out = "docs/demo.gif"] = process.argv.slice(2);
const base = baseArg.replace(/\/+$/, "");
const size = { width: 1280, height: 800 };
const videoDir = mkdtempSync(join(tmpdir(), "offerlog-demo-"));
const browser = await chromium.launch();

// Sign in outside the recording so the GIF starts on the board.
const login = await browser.newContext();
const lp = await login.newPage();
await lp.goto(`${base}/login`);
await lp.getByLabel("Password").fill(password);
await lp.getByRole("button", { name: "Sign in" }).click();
await lp.waitForURL(`${base}/`);
const storageState = await login.storageState();
await login.close();

const ctx = await browser.newContext({ viewport: size, storageState, recordVideo: { dir: videoDir, size } });
// Headless video has no mouse pointer; draw one so the drag is visible.
await ctx.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const dot = document.createElement("div");
    dot.style.cssText =
      "position:fixed;z-index:99999;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(240,180,40,.85);border:2px solid #1a2433;pointer-events:none;left:-40px;top:-40px";
    document.body.append(dot);
    const move = (e) => ((dot.style.left = e.clientX + "px"), (dot.style.top = e.clientY + "px"));
    addEventListener("mousemove", move, true);
    addEventListener("dragover", move, true);
  });
});
const page = await ctx.newPage();
const pause = (ms) => page.waitForTimeout(ms);
async function glide(locator) {
  const box = await locator.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 20), { steps: 20 });
}

await page.goto(base + "/");
await page.mouse.move(640, 400);
await pause(1200);

// Drag a card from Applied to Screening.
const card = page.locator(".card", { hasText: "Saltmarsh Studio" });
const target = page.getByRole("region", { name: "Screening" });
await glide(card);
await page.mouse.down();
await glide(target);
await page.mouse.up();
await target.locator(".card", { hasText: "Saltmarsh Studio" }).waitFor({ timeout: 5000 }); // fail rather than record a failed move
await pause(1500);

// Open an application: timeline, contacts, prep.
const link = page.getByRole("link", { name: "Tidepool Labs" }).first();
await glide(link);
await link.click();
await page.waitForURL(/applications\/\d+/);
await pause(1500);
await page.mouse.wheel(0, 500);
await pause(1500);

// Resume tailor: keyword gap report, computed locally as you type.
await page.goto(base + "/tailor");
await page.getByLabel("Load a job description from an application").selectOption({ label: "Tidepool Labs, Junior Frontend Engineer" });
await page.getByLabel("Your resume").pressSequentially("Built a course planner in React.js and Python with a Postgres database. Unit tests with Jest. Git daily.", { delay: 12 });
await pause(800);
await page.mouse.wheel(0, 350);
await pause(1800);

// Analytics.
await page.goto(base + "/analytics");
await pause(2200);

const video = await page.video().path();
await ctx.close();
await browser.close();

execFileSync("ffmpeg", [
  "-y", "-loglevel", "error", "-i", video,
  "-vf", "fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
  out,
]);
rmSync(videoDir, { recursive: true, force: true });
console.log(`Wrote ${out}`);
