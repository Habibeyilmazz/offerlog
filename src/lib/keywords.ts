/**
 * Deterministic keyword gap report: which skills, tools and seniority words a job
 * description asks for that a resume does not mention. No network, no model.
 */

type Kind = "skill" | "tool";
interface Term {
  name: string;
  kind: Kind;
  aliases?: string[];
  /** Match case-sensitively (for names that are also common English words, like "Go"). */
  exactCase?: boolean;
}

// shortcut: a hand-curated vocabulary of common early-career tech terms; extend it or load a user list when users hit gaps.
const TERMS: Term[] = [
  // languages
  { name: "JavaScript", kind: "skill", aliases: ["js", "ecmascript"] },
  { name: "TypeScript", kind: "skill", aliases: ["ts"] },
  { name: "Python", kind: "skill" },
  { name: "Java", kind: "skill" },
  { name: "Kotlin", kind: "skill" },
  { name: "Swift", kind: "skill" },
  { name: "Go", kind: "skill", aliases: ["Golang"], exactCase: true },
  { name: "Rust", kind: "skill" },
  { name: "C++", kind: "skill", aliases: ["cpp"] },
  { name: "C#", kind: "skill", aliases: ["csharp"] },
  { name: "Ruby", kind: "skill" },
  { name: "PHP", kind: "skill" },
  { name: "Scala", kind: "skill" },
  { name: "Elixir", kind: "skill" },
  { name: "SQL", kind: "skill" },
  { name: "HTML", kind: "skill", aliases: ["html5"] },
  { name: "CSS", kind: "skill", aliases: ["css3"] },
  { name: "Bash", kind: "skill", aliases: ["shell scripting"] },
  // concepts
  { name: "REST", kind: "skill", aliases: ["restful", "rest api", "rest apis"] },
  { name: "GraphQL", kind: "skill" },
  { name: "gRPC", kind: "skill" },
  { name: "microservices", kind: "skill", aliases: ["microservice"] },
  { name: "distributed systems", kind: "skill" },
  { name: "system design", kind: "skill" },
  { name: "data structures", kind: "skill" },
  { name: "algorithms", kind: "skill" },
  { name: "object-oriented programming", kind: "skill", aliases: ["oop", "object oriented"] },
  { name: "functional programming", kind: "skill" },
  { name: "unit testing", kind: "skill", aliases: ["unit tests"] },
  { name: "integration testing", kind: "skill", aliases: ["integration tests"] },
  { name: "end-to-end testing", kind: "skill", aliases: ["e2e testing", "e2e tests", "end-to-end tests"] },
  { name: "TDD", kind: "skill", aliases: ["test-driven development", "test driven development"] },
  { name: "CI/CD", kind: "skill", aliases: ["continuous integration", "continuous delivery", "continuous deployment"] },
  { name: "DevOps", kind: "skill" },
  { name: "agile", kind: "skill", aliases: ["scrum", "kanban"] },
  { name: "code review", kind: "skill", aliases: ["code reviews"] },
  { name: "accessibility", kind: "skill", aliases: ["a11y", "wcag"] },
  { name: "responsive design", kind: "skill" },
  { name: "performance optimization", kind: "skill", aliases: ["performance tuning"] },
  { name: "security", kind: "skill", aliases: ["application security", "owasp"] },
  { name: "authentication", kind: "skill", aliases: ["oauth", "oauth2", "jwt", "sso"] },
  { name: "machine learning", kind: "skill", aliases: ["ml"] },
  { name: "deep learning", kind: "skill" },
  { name: "NLP", kind: "skill", aliases: ["natural language processing"] },
  { name: "LLM", kind: "skill", aliases: ["llms", "large language models"] },
  { name: "data analysis", kind: "skill", aliases: ["data analytics"] },
  { name: "statistics", kind: "skill" },
  { name: "ETL", kind: "skill", aliases: ["data pipelines", "data pipeline"] },
  { name: "observability", kind: "skill", aliases: ["monitoring", "logging", "tracing"] },
  { name: "cloud", kind: "skill", aliases: ["cloud computing", "cloud infrastructure"] },
  { name: "infrastructure as code", kind: "skill", aliases: ["iac"] },
  { name: "mobile development", kind: "skill", aliases: ["mobile apps"] },
  { name: "UX", kind: "skill", aliases: ["user experience"] },
  { name: "mentoring", kind: "skill", aliases: ["mentorship", "mentor"] },
  { name: "communication", kind: "skill", aliases: ["communication skills"] },
  { name: "stakeholder management", kind: "skill", aliases: ["stakeholders"] },
  // frameworks and libraries
  { name: "React", kind: "tool", aliases: ["react.js", "reactjs"] },
  { name: "Next.js", kind: "tool", aliases: ["nextjs"] },
  { name: "Vue", kind: "tool", aliases: ["vue.js", "vuejs"] },
  { name: "Angular", kind: "tool" },
  { name: "Svelte", kind: "tool", aliases: ["sveltekit"] },
  { name: "Redux", kind: "tool" },
  { name: "Tailwind", kind: "tool", aliases: ["tailwind css", "tailwindcss"] },
  { name: "Node.js", kind: "tool", aliases: ["node", "nodejs"] },
  { name: "Express", kind: "tool", aliases: ["express.js", "expressjs"] },
  { name: "NestJS", kind: "tool" },
  { name: "Django", kind: "tool" },
  { name: "Flask", kind: "tool" },
  { name: "FastAPI", kind: "tool" },
  { name: "Spring", kind: "tool", aliases: ["spring boot"] },
  { name: "Rails", kind: "tool", aliases: ["ruby on rails"] },
  { name: ".NET", kind: "tool", aliases: ["dotnet", "asp.net"] },
  { name: "Laravel", kind: "tool" },
  { name: "React Native", kind: "tool" },
  { name: "Flutter", kind: "tool" },
  { name: "pandas", kind: "tool" },
  { name: "NumPy", kind: "tool" },
  { name: "PyTorch", kind: "tool" },
  { name: "TensorFlow", kind: "tool" },
  { name: "scikit-learn", kind: "tool", aliases: ["sklearn"] },
  { name: "Spark", kind: "tool", aliases: ["apache spark", "pyspark"] },
  { name: "Airflow", kind: "tool" },
  { name: "dbt", kind: "tool" },
  { name: "Jest", kind: "tool" },
  { name: "Vitest", kind: "tool" },
  { name: "Playwright", kind: "tool" },
  { name: "Cypress", kind: "tool" },
  { name: "pytest", kind: "tool" },
  { name: "JUnit", kind: "tool" },
  // data stores
  { name: "PostgreSQL", kind: "tool", aliases: ["postgres", "psql"] },
  { name: "MySQL", kind: "tool" },
  { name: "SQLite", kind: "tool" },
  { name: "MongoDB", kind: "tool", aliases: ["mongo"] },
  { name: "Redis", kind: "tool" },
  { name: "Elasticsearch", kind: "tool", aliases: ["opensearch"] },
  { name: "Kafka", kind: "tool", aliases: ["apache kafka"] },
  { name: "RabbitMQ", kind: "tool" },
  { name: "DynamoDB", kind: "tool" },
  { name: "Snowflake", kind: "tool" },
  { name: "BigQuery", kind: "tool" },
  // platforms and infrastructure
  { name: "AWS", kind: "tool", aliases: ["amazon web services"] },
  { name: "GCP", kind: "tool", aliases: ["google cloud"] },
  { name: "Azure", kind: "tool" },
  { name: "Docker", kind: "tool", aliases: ["containers", "containerization"] },
  { name: "Kubernetes", kind: "tool", aliases: ["k8s"] },
  { name: "Terraform", kind: "tool" },
  { name: "Ansible", kind: "tool" },
  { name: "Linux", kind: "tool", aliases: ["unix"] },
  { name: "Git", kind: "tool", aliases: ["github", "gitlab", "version control"] },
  { name: "GitHub Actions", kind: "tool" },
  { name: "Jenkins", kind: "tool" },
  { name: "Vercel", kind: "tool" },
  { name: "Firebase", kind: "tool" },
  { name: "Supabase", kind: "tool" },
  { name: "Prometheus", kind: "tool" },
  { name: "Grafana", kind: "tool" },
  { name: "Datadog", kind: "tool" },
  { name: "Sentry", kind: "tool" },
  { name: "Figma", kind: "tool" },
  { name: "Jira", kind: "tool" },
  { name: "Webpack", kind: "tool" },
  { name: "Vite", kind: "tool" },
];

const SENIORITY = [
  "intern",
  "internship",
  "new grad",
  "graduate",
  "entry level",
  "entry-level",
  "junior",
  "associate",
  "mid-level",
  "mid level",
  "senior",
  "staff",
  "principal",
  "lead",
  "manager",
  "head of",
];

const STOPWORDS = new Set(
  `a about above after again against all also am an and any are as at be because been before being below between both but by can
  could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it
  its itself just me more most my no nor not now of off on once only or other our ours out over own same she should so some such
  than that the their theirs them then there these they this those through to too under until up very was we were what when where
  which while who whom why will with would you your yours etc e.g i.e via per within across including include includes
  work working works team teams role roles job company you'll we're you're we'll experience experienced years year strong ability
  able good great excellent new using use used build building help helping make making well like plus must nice bonus looking
  join part based day days time skills skill knowledge understanding familiarity familiar preferred required requirements
  responsibilities qualifications candidate candidates opportunity opportunities environment people world want across closely
  others own ownership impact high quality fast paced fast-paced every way ways love passionate passion level levels`.split(/\s+/),
);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word boundaries that understand symbols used in tech names ("C++", "C#", ".NET", "Node.js").
function termRegex(alias: string, exactCase: boolean): RegExp {
  return new RegExp(`(?<![\\w+#.])${escapeRegex(alias)}(?![\\w+#]|\\.\\w)`, exactCase ? "g" : "gi");
}

const MATCHERS = TERMS.map((t) => ({
  term: t,
  regexes: [t.name, ...(t.aliases ?? [])].map((a) => termRegex(a, t.exactCase ?? false)),
}));

function countTerm(text: string, regexes: RegExp[]): number {
  return regexes.reduce((n, re) => n + (text.match(re)?.length ?? 0), 0);
}

export interface TermHit {
  name: string;
  count: number;
}

export interface GapReport {
  skills: { matched: TermHit[]; missing: TermHit[] };
  tools: { matched: TermHit[]; missing: TermHit[] };
  seniority: { job: string[]; resume: string[] };
  /** Frequent job-description words the resume never uses (outside the known vocabulary). */
  otherTerms: TermHit[];
  /** Share of known skills and tools from the job description that the resume mentions, 0..1; null if none were found. */
  coverage: number | null;
}

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z0-9+#.-]*[a-z0-9+#]|[a-z]/g) ?? [];
}

export function gapReport(jobDescription: string, resume: string): GapReport {
  const skills = { matched: [] as TermHit[], missing: [] as TermHit[] };
  const tools = { matched: [] as TermHit[], missing: [] as TermHit[] };
  const known = new Set<string>();
  for (const { term, regexes } of MATCHERS) {
    for (const a of [term.name, ...(term.aliases ?? [])]) for (const w of words(a)) known.add(w);
    const count = countTerm(jobDescription, regexes);
    if (count === 0) continue;
    const bucket = term.kind === "skill" ? skills : tools;
    (countTerm(resume, regexes) > 0 ? bucket.matched : bucket.missing).push({ name: term.name, count });
  }
  const byCount = (a: TermHit, b: TermHit) => b.count - a.count || a.name.localeCompare(b.name);
  for (const list of [skills.matched, skills.missing, tools.matched, tools.missing]) list.sort(byCount);

  const seniorityIn = (text: string) => SENIORITY.filter((w) => termRegex(w, false).test(text));

  const resumeWords = new Set(words(resume));
  const freq = new Map<string, number>();
  for (const w of words(jobDescription)) {
    if (w.length < 4 || STOPWORDS.has(w) || known.has(w) || resumeWords.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const otherTerms = [...freq]
    .filter(([, count]) => count >= 2)
    .map(([name, count]) => ({ name, count }))
    .sort(byCount)
    .slice(0, 15);

  const found = skills.matched.length + skills.missing.length + tools.matched.length + tools.missing.length;
  return {
    skills,
    tools,
    seniority: { job: seniorityIn(jobDescription), resume: seniorityIn(resume) },
    otherTerms,
    coverage: found === 0 ? null : (skills.matched.length + tools.matched.length) / found,
  };
}
