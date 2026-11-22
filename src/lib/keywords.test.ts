import { describe, expect, it } from "vitest";
import { gapReport } from "./keywords.ts";

const jd = `Junior Frontend Engineer. You will build features in React and TypeScript, write tests with Jest,
and deploy with Docker on AWS. Experience with Node.js and PostgreSQL is a plus. Knowledge of C++ or C# helps.
We care about accessibility and observability. Kubernetes (k8s) exposure welcome. Stakeholder demos weekly; demos matter.`;
const resume = `Built a course planner with React.js and Postgres. Wrote JS and Python scripts. Used GitHub daily.`;

describe("gapReport", () => {
  const r = gapReport(jd, resume);
  const names = (l: { name: string }[]) => l.map((x) => x.name);

  it("matches tools through aliases", () => {
    expect(names(r.tools.matched)).toEqual(expect.arrayContaining(["React", "PostgreSQL"]));
  });
  it("reports missing skills and tools", () => {
    expect(names(r.skills.missing)).toEqual(expect.arrayContaining(["TypeScript", "C++", "C#", "accessibility", "observability"]));
    expect(names(r.tools.missing)).toEqual(expect.arrayContaining(["Jest", "Docker", "AWS", "Node.js", "Kubernetes"]));
  });
  it("counts alias mentions toward the term and sorts by count", () => {
    expect(r.tools.missing[0]).toEqual({ name: "Kubernetes", count: 2 });
  });
  it("does not see JavaScript inside Node.js or Java inside JavaScript", () => {
    const only = gapReport("Node.js and JavaScript", "");
    expect(names(only.skills.missing)).toEqual(["JavaScript"]);
    expect(names(gapReport("Java developer", "JavaScript").skills.missing)).toEqual(["Java"]);
  });
  it("counts overlapping aliases once per mention", () => {
    const o = gapReport("Tailwind CSS and a REST API. More REST.", "");
    expect(o.tools.missing).toEqual([{ name: "Tailwind", count: 1 }]);
    expect(o.skills.missing).toContainEqual({ name: "REST", count: 2 });
  });
  it("finds seniority words", () => {
    expect(r.seniority.job).toContain("junior");
    expect(r.seniority.resume).toEqual([]);
  });
  it("lists repeated unknown words not in the resume", () => {
    expect(names(r.otherTerms)).toEqual(["demos"]);
  });
  it("computes coverage", () => {
    expect(r.coverage).toBeGreaterThan(0);
    expect(r.coverage).toBeLessThan(0.5);
    expect(gapReport("", "").coverage).toBeNull();
  });
  it("is deterministic", () => {
    expect(gapReport(jd, resume)).toEqual(r);
  });
});
