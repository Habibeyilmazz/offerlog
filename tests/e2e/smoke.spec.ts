import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import { E2E_PASSWORD } from "../../playwright.config.ts";

const AXE = await readFile("node_modules/axe-core/axe.min.js", "utf8");

/** WCAG 2.2 AA and best-practice violations axe-core finds on the current page, as "rule(count)". */
async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
    const { violations } = await (window as unknown as { axe: { run: (c: Document, o: object) => Promise<{ violations: { id: string; nodes: unknown[] }[] }> } }).axe.run(document, { runOnly: tags });
    return violations.map((v) => `${v.id}(${v.nodes.length})`);
  });
}

test("track an application end to end", async ({ page }) => {
  const first = await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  // Not frameable (clickjacking) and no MIME sniffing.
  const sent = first!.headers();
  expect(sent["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(sent["x-frame-options"]).toBe("DENY");
  expect(sent["x-content-type-options"]).toBe("nosniff");

  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Wrong password.")).toBeVisible();

  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Start your log" })).toBeVisible();

  // Add an application
  await page.getByRole("link", { name: "Add application" }).first().click();
  await page.getByLabel("Company").fill("Acme Robotics");
  await page.getByLabel("Role").fill("Junior Developer");
  await page.getByLabel("Stage").selectOption("applied");
  await page.getByLabel("Date", { exact: true }).fill("2025-03-03"); // backfilled: applied before using offerlog
  await page.getByLabel("Source").fill("Referral");
  await page.getByLabel("Salary from").fill("50k");
  await page.getByLabel("Salary to").fill("40k");
  await page.getByLabel("Next step", { exact: true }).fill("Email the recruiter");
  await page.getByLabel("Next step due").fill("2030-01-15");
  await page.getByLabel("Job description").fill("Junior developer with React, TypeScript and Docker experience.");
  // A refused save keeps everything typed, so only the wrong field needs fixing
  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Minimum salary is above the maximum." })).toBeVisible();
  await expect(page.getByLabel("Company")).toHaveValue("Acme Robotics");
  await expect(page.getByLabel("Stage")).toHaveValue("applied");
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue("2025-03-03");
  await expect(page.getByLabel("Job description")).toHaveValue(/React, TypeScript and Docker/);
  await page.getByLabel("Salary to").fill("60000");
  // So does a save that cannot reach the server
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "the connection dropped" })).toBeVisible();
  await expect(page.getByLabel("Salary to")).toHaveValue("60000");
  await expect(page.getByLabel("Job description")).toHaveValue(/React, TypeScript and Docker/);
  await page.context().setOffline(false);
  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page.getByRole("heading", { name: "Acme Robotics", level: 1 })).toBeVisible();
  const appPath = new URL(page.url()).pathname;
  await expect(page.getByText("$50K–$60K")).toBeVisible();

  // The next step goes to a calendar as an all-day event
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Add to calendar" }).click();
  const event = await readFile(await (await download).path(), "utf8");
  expect(event).toContain("SUMMARY:Acme Robotics: Email the recruiter\r\n");
  expect(event).toContain("DTSTART;VALUE=DATE:20300115\r\n");

  // Dated note shows up in the timeline
  await page.getByPlaceholder(/Add a dated note/).fill("Recruiter call went well");
  // Offline, the note stays in the box instead of being lost
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Add note" }).press("Enter");
  await expect(page.getByRole("alert").filter({ hasText: "the connection dropped" })).toBeVisible();
  // The button is not disabled while sending, which would have dropped keyboard focus to the top of the page
  await expect(page.getByRole("button", { name: "Add note" })).toBeFocused();
  await expect(page.getByPlaceholder(/Add a dated note/)).toHaveValue("Recruiter call went well");
  await page.context().setOffline(false);
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByPlaceholder(/Add a dated note/)).toHaveValue("");
  await expect(page.locator(".timeline")).toContainText("Recruiter call went well");
  await expect(page.locator(".timeline")).toContainText("Added as Applied");
  await expect(page.locator(".timeline")).toContainText("Mar 3, 2025");
  await expect(page.locator(".facts")).toContainText("Added Mar 3, 2025");

  // Edit the note and a contact in place
  await page.locator(".timeline").getByText("Edit note").click();
  await page.getByLabel("Text of the note").fill("Recruiter call went well, panel next week");
  await page.getByRole("button", { name: "Save", exact: true }).press("Enter");
  await expect(page.locator(".timeline .note-text")).toHaveText("Recruiter call went well, panel next week");
  // The saved panel is re-rendered closed; keyboard focus goes to its section's heading, not the top of the page
  await expect(page.getByRole("heading", { name: "Timeline" })).toBeFocused();
  await expect(page.locator(".timeline details.edit[open]")).toHaveCount(0);
  await page.getByLabel("Name").fill("Dana Reyes");
  // The browser accepts any scheme in type=url; the server must say why it refused, and keep the typed values.
  await page.getByLabel("Profile link").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Add contact" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Profile link must start with http" })).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveValue("Dana Reyes");
  await page.getByLabel("Profile link").fill("");
  await page.getByRole("button", { name: "Add contact" }).click();
  await page.locator(".contacts").getByText("Edit Dana Reyes").click();
  await page.locator(".contacts").getByLabel("Title").fill("Recruiter");
  await page.getByRole("button", { name: "Save contact" }).click();
  await expect(page.locator(".contacts li").first()).toContainText("Dana Reyes, Recruiter");

  // Move it on the board with the keyboard-friendly menu
  await page.getByRole("link", { name: "Board" }).first().click();
  await page.getByLabel("Move Acme Robotics to stage").focus();
  await page.getByLabel("Move Acme Robotics to stage").selectOption("screening");
  await expect(page.getByRole("region", { name: "Screening" })).toContainText("Acme Robotics", { timeout: 10_000 });
  // The card changed column; keyboard focus stays on its menu and the move is announced
  await expect(page.getByLabel("Move Acme Robotics to stage")).toBeFocused();
  await expect(page.getByRole("status")).toHaveText("Moved Acme Robotics to Screening.");
  await page.reload();
  await expect(page.getByRole("region", { name: "Screening" })).toContainText("Acme Robotics");
  await expect(page.getByText("Email the recruiter")).toBeVisible();

  // Drag and drop moves it too, and the move is saved
  await page.locator(".card", { hasText: "Acme Robotics" }).dragTo(page.getByRole("region", { name: "Interview" }));
  await expect(page.getByRole("region", { name: "Interview" })).toContainText("Acme Robotics", { timeout: 10_000 });
  await page.reload();
  await expect(page.getByRole("region", { name: "Interview" })).toContainText("Acme Robotics");

  // A move that cannot reach the server keeps the board, puts the card back and says so
  await page.context().setOffline(true);
  await page.getByLabel("Move Acme Robotics to stage").selectOption("rejected");
  await expect(page.getByRole("alert").filter({ hasText: "Could not move Acme Robotics to Rejected" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Interview" })).toContainText("Acme Robotics");
  await expect(page.getByLabel("Move Acme Robotics to stage")).toHaveValue("interview");
  await page.context().setOffline(false);

  const filter = page.getByPlaceholder(/Filter by company/);
  await filter.fill("no such company");
  await expect(page.locator(".card")).toHaveCount(0);
  await filter.fill("referral");
  await expect(page.locator(".card")).toHaveCount(1);

  // A wrong move is taken back from the timeline, so the funnel never counts it
  await page.getByLabel("Move Acme Robotics to stage").selectOption("offer");
  await expect(page.getByRole("region", { name: "Offer" })).toContainText("Acme Robotics", { timeout: 10_000 });
  await page.goto(appPath);
  await page.locator(".timeline").getByText("Edit move to Offer").click();
  await expect(page.getByText("Removing it moves the application back to Interview.")).toBeVisible();
  await page.getByRole("button", { name: "Remove this change" }).click();
  await expect(page.locator(".timeline")).not.toContainText("Offer");
  await expect(page.locator(".facts")).toContainText("Interview");

  // Question bank: a saved question clears the form and shows up as prep for that stage
  await page.getByRole("link", { name: "Question bank" }).click();
  const add = page.getByRole("region", { name: "Add a question" });
  await add.getByLabel("Question").fill("Walk me through a project you are proud of");
  await add.getByLabel("Category").selectOption("behavioral");
  await add.getByLabel("Asked at").selectOption("interview");
  await add.getByRole("button", { name: "Add question" }).click();
  await expect(add.getByRole("status")).toHaveText("Added to the bank.");
  await expect(add.getByLabel("Question")).toHaveValue("");
  await expect(page.getByRole("region", { name: "behavioral" })).toContainText("Walk me through a project");
  await page.goto(appPath);
  await expect(page.getByText("1 question from your bank")).toBeVisible();

  // Keyword gap report. The tailor page sends job labels only; a description is fetched when picked.
  const tailorHtml = await (await page.request.get("/tailor")).text();
  expect(tailorHtml).toContain("Acme Robotics, Junior Developer");
  expect(tailorHtml).not.toContain("React, TypeScript and Docker");
  await page.goto(appPath);
  await page.getByRole("link", { name: "Tailor resume for this job" }).click();
  await page.waitForURL(/\/tailor\?app=\d+$/);
  const jd = page.getByRole("textbox", { name: "Job description" });
  await expect(jd).toHaveValue(/React, TypeScript and Docker/);
  const picker = page.getByLabel("Load a job description from an application");
  await picker.selectOption({ label: "None, I will paste one" });
  await expect(jd).toHaveValue("");
  await page.context().setOffline(true);
  await picker.selectOption({ label: "Acme Robotics, Junior Developer" });
  const loadError = page.getByRole("alert").filter({ hasText: "Could not load that job description" });
  await expect(loadError).toBeVisible();
  await page.context().setOffline(false);
  await picker.selectOption({ label: "None, I will paste one" });
  await picker.selectOption({ label: "Acme Robotics, Junior Developer" });
  await expect(jd).toHaveValue(/React, TypeScript and Docker/);
  await expect(loadError).toHaveCount(0);
  await page.getByLabel("Your resume").fill("Built apps in React.");
  await expect(page.locator(".chip.miss", { hasText: "TypeScript" })).toBeVisible();
  await expect(page.locator(".chip.hit", { hasText: "React" })).toBeVisible();

  // "Mark done" (and every delete button) offline says so next to the button instead of replacing the page
  await page.goto(appPath);
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Mark done" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Not sent" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Acme Robotics", level: 1 })).toBeVisible();
  await page.context().setOffline(false);
  await page.getByRole("button", { name: "Mark done" }).click();
  await expect(page.locator(".timeline")).toContainText("Done: Email the recruiter");
  await expect(page.getByRole("button", { name: "Mark done" })).toHaveCount(0);

  // Analytics counts the reply
  await page.getByRole("link", { name: "Analytics" }).click();
  await expect(page.getByRole("cell", { name: "Referral" })).toBeVisible();
  await expect(page.locator(".stat").first()).toContainText("1");
  // A weekly goal that cannot be saved stays in the box
  await page.context().setOffline(true);
  await page.getByLabel("Weekly goal").fill("7");
  await page.getByRole("button", { name: "Save goal" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Not sent" })).toBeVisible();
  await expect(page.getByLabel("Weekly goal")).toHaveValue("7");
  await page.context().setOffline(false);

  // Export includes the record
  const res = await page.request.get("/api/export?format=json");
  expect(res.status()).toBe(200);
  expect(res.headers()["cache-control"]).toBe("no-store"); // a full personal backup must not sit in a proxy cache
  const dump = await res.json();
  expect(dump.applications[0]).toMatchObject({ company: "Acme Robotics", stage: "interview" });

  // Import page works and a CSV lands on the board
  await page.getByRole("link", { name: "Import & export" }).click();
  await expect(page.getByRole("heading", { name: "Import & export", level: 1 })).toBeVisible();
  // A file over the server's request limit is stopped in the browser, instead of failing as a dropped connection
  await page.getByLabel("CSV or JSON file").setInputFiles({ name: "huge.csv", mimeType: "text/csv", buffer: Buffer.alloc(7 * 1024 * 1024, "a") });
  await page.getByRole("button", { name: "Import file" }).click();
  expect(await page.getByLabel("CSV or JSON file").evaluate((el: HTMLInputElement) => el.validationMessage)).toBe("That file is over 5 MB.");
  await expect(page.getByRole("heading", { name: "Import & export", level: 1 })).toBeVisible();
  await page.getByLabel("CSV or JSON file").setInputFiles({
    name: "apps.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `company,role,stage,created_at\nBramble Bank,Graduate Engineer,applied,\n${"Unbrokenname".repeat(12)},Dev,wishlist,\n` +
        "Old Mill Labs,Tester,applied,2025-01-10\nQuarry Systems,Developer,screening,2025-02-01\n",
    ),
  });
  await page.getByRole("button", { name: "Import file" }).click();
  await expect(page.getByRole("status")).toHaveText("Imported 4 applications.");
  await page.getByRole("link", { name: "Board" }).first().click();
  await expect(page.getByRole("region", { name: "Applied" })).toContainText("Bramble Bank");

  // Applications with no news for two weeks ask for a follow-up; one press puts it in Up next
  const waiting = page.getByRole("region", { name: "Waiting on a reply" });
  await expect(waiting.getByRole("listitem")).toHaveText([/Old Mill Labs.*Applied, no news/, /Quarry Systems.*Screening, no news/]);
  await waiting.getByRole("button", { name: "Follow up with Old Mill Labs" }).click();
  await expect(page.getByRole("region", { name: "Up next" })).toContainText(/Old Mill Labs\s*Due today\s*Send a follow-up/);
  await expect(waiting.getByRole("listitem")).toHaveCount(1);
  // A long unbroken name wraps inside its card instead of sliding under the other columns
  await page.getByRole("link", { name: /^Unbrokenname/ }).click({ timeout: 5_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Unbrokenname");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Board" }).first().click();

  // No axe-core violations on any page with data on it, in light and dark, on desktop and phone widths
  for (const path of ["/", appPath, "/applications/new", "/tailor", "/analytics", "/questions", "/data", "/no-such-page"]) {
    for (const [colorScheme, width] of [["light", 1280], ["dark", 1280], ["light", 390]] as const) {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme });
      await page.goto(path);
      expect(await axeViolations(page), `${path} ${colorScheme} ${width}px`).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ colorScheme: "light" });
  // An unknown address gets the app's own page, not the framework's unstyled one
  expect((await page.goto("/no-such-page"))!.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Nothing here" })).toBeVisible();
  await page.getByRole("link", { name: "Back to the board" }).click();
  await expect(page.getByRole("heading", { name: "Board", level: 1 })).toBeVisible();
  // ...or marked ghosted, which empties the waiting list
  await page.getByRole("button", { name: "Mark ghosted, Quarry Systems" }).click();
  await expect(page.getByRole("region", { name: "Ghosted" })).toContainText("Quarry Systems");
  await expect(page.getByRole("region", { name: "Waiting on a reply" })).toHaveCount(0);

  // A card deleted in another tab cannot be moved from this stale board; it says so instead of announcing a move
  const other = await page.context().newPage();
  await other.goto("/");
  await other.getByRole("link", { name: /^Quarry Systems/ }).click();
  await other.getByText("Delete this application").click();
  await other.getByRole("button", { name: "Delete application" }).click();
  await expect(other.getByRole("heading", { name: "Board", level: 1 })).toBeVisible();
  await other.close();
  await page.getByLabel("Move Quarry Systems to stage").selectOption("offer");
  await expect(page.getByRole("alert").filter({ hasText: "Quarry Systems was deleted" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("");
  await expect(page.getByLabel("Move Quarry Systems to stage")).toHaveCount(0);

  // Sign out ends the session (offline it says so and stays put)
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Not sent" })).toBeVisible();
  await page.context().setOffline(false);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/export?format=json")).status()).toBe(401);
  expect(await axeViolations(page)).toEqual([]);
  // A signed-out request must not leak application details, not even in the page title.
  const leak = await page.request.get(appPath, { maxRedirects: 0 });
  expect(await leak.text()).not.toContain("Acme Robotics");
});
