import { expect, test } from "@playwright/test";
import { E2E_PASSWORD } from "../../playwright.config.ts";

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

  // Dated note shows up in the timeline
  await page.getByPlaceholder(/Add a dated note/).fill("Recruiter call went well");
  // Offline, the note stays in the box instead of being lost
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "the connection dropped" })).toBeVisible();
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
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".timeline .note-text")).toHaveText("Recruiter call went well, panel next week");
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
  await page.getByLabel("Move Acme Robotics to stage").selectOption("screening");
  await expect(page.getByRole("region", { name: "Screening" })).toContainText("Acme Robotics", { timeout: 10_000 });
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

  // Keyword gap report
  await page.getByRole("link", { name: "Resume tailor" }).click();
  await page.getByLabel("Load a job description from an application").selectOption({ label: "Acme Robotics, Junior Developer" });
  await page.getByLabel("Your resume").fill("Built apps in React.");
  await expect(page.locator(".chip.miss", { hasText: "TypeScript" })).toBeVisible();
  await expect(page.locator(".chip.hit", { hasText: "React" })).toBeVisible();

  // Analytics counts the reply
  await page.getByRole("link", { name: "Analytics" }).click();
  await expect(page.getByRole("cell", { name: "Referral" })).toBeVisible();
  await expect(page.locator(".stat").first()).toContainText("1");

  // Export includes the record
  const res = await page.request.get("/api/export?format=json");
  expect(res.status()).toBe(200);
  expect(res.headers()["cache-control"]).toBe("no-store"); // a full personal backup must not sit in a proxy cache
  const dump = await res.json();
  expect(dump.applications[0]).toMatchObject({ company: "Acme Robotics", stage: "interview" });

  // Import page works and a CSV lands on the board
  await page.getByRole("link", { name: "Import & export" }).click();
  await expect(page.getByRole("heading", { name: "Import & export", level: 1 })).toBeVisible();
  await page.getByLabel("CSV or JSON file").setInputFiles({
    name: "apps.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(`company,role,stage\nBramble Bank,Graduate Engineer,applied\n${"Unbrokenname".repeat(12)},Dev,wishlist\n`),
  });
  await page.getByRole("button", { name: "Import file" }).click();
  await expect(page.getByRole("status")).toHaveText("Imported 2 applications.");
  await page.getByRole("link", { name: "Board" }).first().click();
  await expect(page.getByRole("region", { name: "Applied" })).toContainText("Bramble Bank");
  // A long unbroken name wraps inside its card instead of sliding under the other columns
  await page.getByRole("link", { name: /^Unbrokenname/ }).click({ timeout: 5_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Unbrokenname");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Board" }).first().click();

  // Sign out ends the session
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/export?format=json")).status()).toBe(401);
  // A signed-out request must not leak application details, not even in the page title.
  const leak = await page.request.get(appPath, { maxRedirects: 0 });
  expect(await leak.text()).not.toContain("Acme Robotics");
});
