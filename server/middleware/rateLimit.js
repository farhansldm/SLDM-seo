export class SlidingWindowRateLimiter {
  constructor({ max, windowMs, now = Date.now }) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
    this.entries = new Map();
  }

  middleware() {
    return (req, res, next) => {
      const currentTime = this.now();
      const key = `${req.auth?.id ?? req.ip}:${req.baseUrl}`;
      const active = (this.entries.get(key) ?? []).filter((timestamp) => currentTime - timestamp < this.windowMs);
      const resetAt = active[0] ? active[0] + this.windowMs : currentTime + this.windowMs;

      res.set({
        "RateLimit-Limit": String(this.max),
        "RateLimit-Remaining": String(Math.max(0, this.max - active.length - 1)),
        "RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      });

      if (active.length >= this.max) {
        this.entries.set(key, active);
        res.set("Retry-After", String(Math.max(1, Math.ceil((resetAt - currentTime) / 1000))));
        return res.status(429).json({ error: "AI request limit reached. Try again shortly." });
      }

      active.push(currentTime);
      this.entries.set(key, active);
      return next();
    };
  }
}
