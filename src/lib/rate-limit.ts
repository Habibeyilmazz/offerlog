/**
 * Fixed-window limiter for failed logins. Keys are checked per client and globally,
 * so a spoofed X-Forwarded-For cannot buy unlimited guesses.
 */
export class FailureLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Milliseconds until `key` may try again, or 0 if it is not blocked. */
  blockedFor(key: string, now = Date.now()): number {
    const h = this.hits.get(key);
    if (!h || h.resetAt <= now) return 0;
    return h.count >= this.max ? h.resetAt - now : 0;
  }

  fail(key: string, now = Date.now()): void {
    if (this.hits.size > 10_000) for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    const h = this.hits.get(key);
    if (!h || h.resetAt <= now) this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
    else h.count++;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }
}
