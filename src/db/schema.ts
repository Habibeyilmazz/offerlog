import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";

// Dates are ISO-8601 strings: timestamps as full ISO, calendar dates as YYYY-MM-DD.
export const applications = sqliteTable(
  "applications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    company: text("company").notNull(),
    role: text("role").notNull(),
    url: text("url").notNull().default(""),
    stage: text("stage").notNull(),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    currency: text("currency").notNull().default("USD"),
    location: text("location").notNull().default(""),
    workMode: text("work_mode").notNull().default("onsite"),
    source: text("source").notNull().default(""),
    description: text("description").notNull().default(""),
    nextStep: text("next_step").notNull().default(""),
    nextStepDue: text("next_step_due"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("applications_stage_idx").on(t.stage)],
);

export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  title: text("title").notNull().default(""),
  email: text("email").notNull().default(""),
  url: text("url").notNull().default(""),
});

// A note with a stage is an interview-prep note for that stage.
export const notes = sqliteTable(
  "notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    stage: text("stage"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("notes_app_idx").on(t.applicationId)],
);

// Stage transitions; the source of truth for timelines and analytics.
export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStage: text("from_stage"),
    toStage: text("to_stage").notNull(),
    at: text("at").notNull(),
  },
  (t) => [index("events_app_idx").on(t.applicationId)],
);

export const questions = sqliteTable("questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  question: text("question").notNull(),
  category: text("category").notNull(),
  stage: text("stage").notNull(),
  answer: text("answer").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  expiresAt: text("expires_at").notNull(),
});

export type Application = typeof applications.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type StageEvent = typeof events.$inferSelect;
export type Question = typeof questions.$inferSelect;
