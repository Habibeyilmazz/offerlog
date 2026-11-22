// Captures README screenshots from a running instance: node scripts/screenshots.mjs <baseUrl> <password> <outDir>
import { chromium } from "@playwright/test";

const [base = "http://localhost:4220", password, out = "docs/screenshots"] = process.argv.slice(2);
const browser = await chromium.launch();

async function signedIn(options) {
  const page = await browser.newPage(options);
  await page.goto(`${base}/login`);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${base}/`);
  return page;
}

async function openApplication(page) {
  await page.goto(base + "/");
  await page.getByRole("link", { name: "Tidepool Labs" }).first().click();
  await page.waitForURL(/applications\/\d+/);
}

const page = await signedIn({ viewport: { width: 1440, height: 900 } });
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
  else await openApplication(page);
  if (name === "tailor") await page.getByLabel("Your resume").fill("Computer science student. Built a course planner in React.js and Python with a Postgres database. Wrote unit tests with Jest. Used Git and GitHub daily.");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: name !== "board" });
}

// The dark theme follows the system setting.
const dark = await signedIn({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
await openApplication(dark);
await dark.locator(".timeline details.edit summary").first().click();
await dark.screenshot({ path: `${out}/application-dark.png` });

const phone = await signedIn({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await phone.screenshot({ path: `${out}/mobile-board.png` });
const phoneDark = await signedIn({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark" });
await phoneDark.goto(base + "/analytics");
await phoneDark.screenshot({ path: `${out}/mobile-analytics-dark.png` });
await browser.close();
