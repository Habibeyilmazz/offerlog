import Anthropic from "@anthropic-ai/sdk";

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

export const REWRITE_SYSTEM = `You help a student or early-career developer tailor resume bullet points to one job description.
Rules:
- Rewrite only the bullets you are given, one output bullet per input bullet, in the same order.
- Never invent experience, employers, numbers, tools or results that are not in the original bullet. If a missing keyword cannot honestly be added to a bullet, leave it out.
- Prefer strong verbs, concrete outcomes and the job description's own wording for things the candidate really did.
- Output only the bullets, each starting with "- ", with no preamble or commentary.`;

export function rewritePrompt(jobDescription: string, bullets: string, missing: string[]): string {
  return [
    `<job_description>\n${jobDescription.trim()}\n</job_description>`,
    `<missing_keywords>${missing.join(", ") || "none"}</missing_keywords>`,
    `<bullets>\n${bullets.trim()}\n</bullets>`,
    "Rewrite the bullets for this job.",
  ].join("\n\n");
}

/** Rewrites resume bullets with Claude. Throws a user-facing Error on failure. */
export async function rewriteBullets(jobDescription: string, bullets: string, missing: string[]): Promise<string> {
  const client = new Anthropic();
  try {
    const res = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: REWRITE_SYSTEM,
      messages: [{ role: "user", content: rewritePrompt(jobDescription, bullets, missing) }],
    });
    if (res.stop_reason === "refusal") throw new Error("The model declined this request. Try editing the bullets.");
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    if (!text) throw new Error("The model returned no text.");
    return text;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error("ANTHROPIC_API_KEY was rejected.");
    if (e instanceof Anthropic.RateLimitError) throw new Error("Rate limited by the API. Try again in a minute.");
    if (e instanceof Anthropic.APIError) throw new Error(`API error ${e.status ?? ""}: ${e.message}`);
    throw e;
  }
}
