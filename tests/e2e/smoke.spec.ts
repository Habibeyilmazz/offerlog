import { expect, test } from "@playwright/test";
import { E2E_PASSWORD } from "../../playwright.config.ts";

test("track an application end to end", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

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
  await page.getByLabel("Source").fill("Referral");
  await page.getByLabel("Salary from").fill("50k");
  await page.getByLabel("Salary to").fill("60000");
  await page.getByLabel("Next step", { exact: true }).fill("Email the recruiter");
  await page.getByLabel("Next step due").fill("2030-01-15");
  await page.getByLabel("Job description").fill("Junior developer with React, TypeScript and Docker experience.");
  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page.getByRole("heading", { name: "Acme Robotics", level: 1 })).toBeVisible();
  await expect(page.getByText("$50K–$60K")).toBeVisible();

  // Dated note shows up in the timeline
  await page.getByPlaceholder(/Add a dated note/).fill("Recruiter call went well");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.locator(".timeline")).toContainText("Recruiter call went well");
  await expect(page.locator(".timeline")).toContainText("Added as Applied");

  // Move it on the board with the keyboard-friendly menu
  await page.getByRole("link", { name: "Board" }).first().click();
  await page.getByLabel("Move Acme Robotics to stage").selectOption("screening");
  await expect(page.getByRole("region", { name: "Screening" })).toContainText("Acme Robotics", { timeout: 10_000 });
  await page.reload();
  await expect(page.getByRole("region", { name: "Screening" })).toContainText("Acme Robotics");
  await expect(page.getByText("Email the recruiter")).toBeVisible();

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
  const dump = await res.json();
  expect(dump.applications[0]).toMatchObject({ company: "Acme Robotics", stage: "screening" });

  // Sign out ends the session
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/export?format=json")).status()).toBe(401);
});
