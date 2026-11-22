// Captures README screenshots from a running instance: node scripts/screenshots.mjs <baseUrl> <password> <outDir>
import { chromium } from "@playwright/test";

const [base = "http://localhost:4220", password, out = "docs/screenshots"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${base}/login`);
await page.getByLabel("Password").fill(password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(`${base}/`);

const shots = [
  ["board", "/"],
  ["application", null],
  ["tailor", "/tailor?app=1"],
  ["analytics", "/analytics"],
  ["questions", "/questions"],
  ["data", "/data"],
];
for (const [name, path] of shots) {
  if (path) await page.goto(base + path);
  else {
    await page.goto(base + "/");
    await page.getByRole("link", { name: "Tidepool Labs" }).first().click();
    await page.waitForURL(/applications\/\d+/);
  }
  if (name === "tailor") await page.getByLabel("Your resume").fill("Computer science student. Built a course planner in React.js and Python with a Postgres database. Wrote unit tests with Jest. Used Git and GitHub daily.");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: name !== "board" });
}
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + "/");
await page.screenshot({ path: `${out}/mobile-board.png` });
await browser.close();
