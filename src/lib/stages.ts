export const STAGES = ["wishlist", "applied", "screening", "interview", "offer", "rejected", "ghosted"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

/** Stages a candidate progresses through, in order. Rejected/ghosted are outcomes, not steps. */
export const FUNNEL: Stage[] = ["applied", "screening", "interview", "offer"];

/** Stages where interview prep notes make sense. */
export const PREP_STAGES: Stage[] = ["screening", "interview", "offer"];

/** Any move out of "applied" except ghosting means the company replied. */
export const RESPONSE_STAGES: Stage[] = ["screening", "interview", "offer", "rejected"];

export const WORK_MODES = ["onsite", "hybrid", "remote"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const QUESTION_CATEGORIES = ["behavioral", "technical", "system design", "company", "other"] as const;

export function isStage(v: unknown): v is Stage {
  return typeof v === "string" && (STAGES as readonly string[]).includes(v);
}
