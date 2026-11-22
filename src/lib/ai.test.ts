import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@anthropic-ai/sdk")>();
  class Fake {
    beta = { messages: { create } };
    static AuthenticationError = actual.default.AuthenticationError;
    static RateLimitError = actual.default.RateLimitError;
    static APIError = actual.default.APIError;
  }
  return { default: Fake };
});

const { rewriteBullets, rewritePrompt, aiEnabled } = await import("./ai.ts");

beforeEach(() => create.mockReset());

describe("ai rewrite", () => {
  it("is off without a key", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(aiEnabled()).toBe(false);
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    expect(aiEnabled()).toBe(true);
    vi.unstubAllEnvs();
  });

  it("puts the posting, missing keywords and bullets in tagged sections", () => {
    const p = rewritePrompt(" JD text ", "- did a thing\n", ["Docker", "AWS"]);
    expect(p).toContain("<job_description>\nJD text\n</job_description>");
    expect(p).toContain("<missing_keywords>Docker, AWS</missing_keywords>");
    expect(p).toContain("<bullets>\n- did a thing\n</bullets>");
    expect(rewritePrompt("a", "b", [])).toContain("<missing_keywords>none</missing_keywords>");
  });

  it("returns only the text blocks", async () => {
    create.mockResolvedValue({ stop_reason: "end_turn", content: [{ type: "thinking", thinking: "" }, { type: "text", text: "- Shipped X\n" }] });
    await expect(rewriteBullets("jd", "- x", [])).resolves.toBe("- Shipped X");
    expect(create.mock.calls[0][0]).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default" });
  });

  it("turns a refusal into a readable error", async () => {
    create.mockResolvedValue({ stop_reason: "refusal", content: [] });
    await expect(rewriteBullets("jd", "- x", [])).rejects.toThrow(/declined/);
  });
});
