import type { Db } from "../db/index.ts";
import { applications, contacts, events, notes, questions, settings } from "../db/schema.ts";
import type { Stage, WorkMode } from "./stages.ts";

// Every company, person and link here is fictional. URLs use the reserved example.com domain.
interface DemoApp {
  company: string;
  role: string;
  source: string;
  location: string;
  workMode: WorkMode;
  salary?: [number, number, string];
  /** Stage history as [stage, days ago]; the last entry is the current stage. */
  path: [Stage, number][];
  nextStep?: [string, number];
  contact?: [string, string];
  note?: string;
  prep?: [Stage, string];
}

const DEMO: DemoApp[] = [
  { company: "Tidepool Labs", role: "Junior Frontend Engineer", source: "Referral", location: "Lisbon", workMode: "hybrid", salary: [38000, 46000, "EUR"],
    path: [["wishlist", 40], ["applied", 38], ["screening", 33], ["interview", 25], ["offer", 4]],
    nextStep: ["Reply to offer with counter on base salary", 2], contact: ["Mara Okafor", "Engineering Manager"],
    note: "Offer call: 42k base, 25 days PTO, start date flexible.", prep: ["interview", "Pairing session in React + TypeScript. Review useReducer and testing-library queries."] },
  { company: "Northwind Analytics", role: "Data Engineer Intern", source: "University career fair", location: "Berlin", workMode: "onsite", salary: [2200, 2600, "EUR"],
    path: [["applied", 30], ["screening", 26], ["interview", 12]], nextStep: ["Final round: SQL case study", 3], contact: ["Jonas Reiter", "Recruiter"],
    prep: ["interview", "Case study on event pipelines. Practice window functions and explain idempotent loads."] },
  { company: "Copperleaf Health", role: "Software Engineer I", source: "LinkedIn", location: "Remote (EU)", workMode: "remote", salary: [55000, 65000, "EUR"],
    path: [["applied", 21], ["screening", 15], ["interview", 6]], nextStep: ["Send thank-you note to panel", -1], contact: ["Priya Natarajan", "Staff Engineer"],
    prep: ["screening", "Recruiter asked about HIPAA-style data handling; mention audit logging project."] },
  { company: "Brightline Transit", role: "Graduate Backend Developer", source: "Company site", location: "Manchester", workMode: "hybrid", salary: [32000, 36000, "GBP"],
    path: [["applied", 18], ["screening", 11]], nextStep: ["Take-home: REST API in Node.js", 5] },
  { company: "Fernhill Games", role: "Gameplay Programmer (Junior)", source: "Wellfound", location: "Montreal", workMode: "onsite", salary: [62000, 70000, "CAD"],
    path: [["applied", 16], ["screening", 9]], nextStep: ["Phone screen with studio lead", 1] },
  { company: "Quill & Ledger", role: "Full Stack Developer", source: "Referral", location: "Remote", workMode: "remote", salary: [70000, 85000, "USD"],
    path: [["applied", 12], ["screening", 10]], contact: ["Sam Whitlock", "CTO"], note: "Small team (6 engineers), Rails + React." },
  { company: "Orbital Freight", role: "Platform Engineer, New Grad", source: "LinkedIn", location: "Austin", workMode: "hybrid", salary: [95000, 110000, "USD"],
    path: [["applied", 9]], nextStep: ["Follow up with recruiter if no reply", 4] },
  { company: "Lumen Robotics", role: "Embedded Software Intern", source: "University career fair", location: "Munich", workMode: "onsite",
    path: [["applied", 7]] },
  { company: "Harborview Bank", role: "Associate Software Engineer", source: "Company site", location: "Dublin", workMode: "hybrid", salary: [48000, 54000, "EUR"],
    path: [["applied", 5]] },
  { company: "Pinecrest Software", role: "Junior QA Automation Engineer", source: "LinkedIn", location: "Remote", workMode: "remote",
    path: [["applied", 3]] },
  { company: "Saltmarsh Studio", role: "Frontend Developer", source: "Hacker News", location: "Amsterdam", workMode: "hybrid", salary: [45000, 52000, "EUR"],
    path: [["applied", 2]] },
  { company: "Kitebox", role: "Junior iOS Developer", source: "Wellfound", location: "Remote", workMode: "remote",
    path: [["applied", 34], ["rejected", 27]], note: "Rejection email said they went with someone with shipped App Store apps." },
  { company: "Meridian Maps", role: "Software Engineer, Maps Rendering", source: "LinkedIn", location: "Zurich", workMode: "onsite", salary: [95000, 110000, "CHF"],
    path: [["applied", 44], ["screening", 37], ["rejected", 30]] },
  { company: "Bramble Commerce", role: "Backend Engineer I", source: "Company site", location: "Remote", workMode: "remote",
    path: [["applied", 50], ["ghosted", 20]] },
  { company: "Ironbark Systems", role: "Graduate DevOps Engineer", source: "LinkedIn", location: "Leeds", workMode: "hybrid",
    path: [["applied", 46], ["ghosted", 15]] },
  { company: "Cloudberry Edu", role: "Junior Full Stack Developer", source: "Hacker News", location: "Remote", workMode: "remote",
    path: [["applied", 29], ["rejected", 26]] },
  { company: "Glasswing AI", role: "ML Engineer Intern", source: "Referral", location: "Paris", workMode: "hybrid",
    path: [["wishlist", 6]], nextStep: ["Ask Lena for a referral", 2] },
  { company: "Juniper Logistics", role: "Software Developer", source: "", location: "Rotterdam", workMode: "onsite",
    path: [["wishlist", 3]] },
];

const DEMO_JD = `We are looking for a Junior Frontend Engineer to join our product team.

What you'll do
- Build accessible, responsive interfaces with React and TypeScript
- Write unit tests with Jest and end-to-end tests with Playwright
- Work with our design team in Figma and ship behind feature flags
- Collaborate on REST and GraphQL APIs with backend engineers (Node.js, PostgreSQL)

Nice to have
- Experience with Next.js and CI/CD on GitHub Actions
- Familiarity with Docker and AWS
- Interest in performance optimization and web vitals`;

const DEMO_QUESTIONS: [string, string, Stage, string][] = [
  ["Tell me about a project you're proud of.", "behavioral", "screening", "Capstone: course-planner app. Situation, my role (frontend + API), result: 300 student users."],
  ["Describe a time you disagreed with a teammate.", "behavioral", "interview", "Group project test strategy; proposed a small spike and we compared results."],
  ["Why do you want to work here?", "company", "screening", ""],
  ["Explain the difference between a process and a thread.", "technical", "interview", ""],
  ["How would you design a URL shortener?", "system design", "interview", "Hash vs counter IDs, read-heavy caching, 301 vs 302."],
  ["What happens when you type a URL into the browser?", "technical", "interview", "DNS, TCP/TLS, HTTP, parsing, render tree, paint."],
  ["What are your salary expectations?", "other", "screening", "Give a researched range; ask about the band first."],
];

const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
const isoDate = (now: Date, days: number) => new Date(now.getTime() + days * 86_400_000).toLocaleDateString("sv-SE"); // local, like today()
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** No applications and no questions: the only state the board's "Load demo data" may replace, since seeding deletes both. */
export const isEmptyTracker = (d: Db): boolean =>
  !d.select({ id: applications.id }).from(applications).limit(1).get() && !d.select({ id: questions.id }).from(questions).limit(1).get();

/** Replaces all data with the fictional demo set, dated relative to `now`. */
export function seedDemo(d: Db, now = new Date()): void {
  d.transaction((tx) => {
    for (const t of [events, notes, contacts, applications, questions, settings]) tx.delete(t).run();
    DEMO.forEach((a, i) => {
      const created = daysAgo(now, a.path[0][1]);
      const updated = daysAgo(now, a.path[a.path.length - 1][1]);
      const { id } = tx
        .insert(applications)
        .values({
          company: a.company,
          role: a.role,
          url: `https://jobs.example.com/${slug(a.company)}/${1000 + i}`,
          stage: a.path[a.path.length - 1][0],
          salaryMin: a.salary?.[0] ?? null,
          salaryMax: a.salary?.[1] ?? null,
          currency: a.salary?.[2] ?? "USD",
          location: a.location,
          workMode: a.workMode,
          source: a.source,
          description: i === 0 ? DEMO_JD : "",
          nextStep: a.nextStep?.[0] ?? "",
          nextStepDue: a.nextStep ? isoDate(now, a.nextStep[1]) : null,
          createdAt: created,
          updatedAt: updated,
        })
        .returning({ id: applications.id })
        .get();
      a.path.forEach(([stage, ago], j) =>
        tx.insert(events).values({ applicationId: id, fromStage: j === 0 ? null : a.path[j - 1][0], toStage: stage, at: daysAgo(now, ago) }).run(),
      );
      if (a.contact) {
        const [name, title] = a.contact;
        tx.insert(contacts).values({ applicationId: id, name, title, email: `${slug(name).split("-")[0]}@example.com`, url: "" }).run();
      }
      if (a.note) tx.insert(notes).values({ applicationId: id, body: a.note, stage: null, createdAt: updated }).run();
      if (a.prep) tx.insert(notes).values({ applicationId: id, body: a.prep[1], stage: a.prep[0], createdAt: updated }).run();
    });
    for (const [question, category, stage, answer] of DEMO_QUESTIONS)
      tx.insert(questions).values({ question, category, stage, answer, createdAt: now.toISOString() }).run();
    tx.insert(settings).values({ key: "weeklyGoal", value: "4" }).run();
  });
}
