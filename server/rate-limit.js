// IP üzrə sadə sürüşən pəncərə limiti (yaddaşda). Bir Node prosesi üçün nəzərdə tutulub.
export function createRateLimiter({ max = 5, windowMs = 10 * 60 * 1000, now = Date.now } = {}) {
  const hits = new Map();

  function prune(t) {
    for (const [ip, list] of hits) {
      const fresh = list.filter((x) => t - x < windowMs);
      fresh.length ? hits.set(ip, fresh) : hits.delete(ip);
    }
  }
  let lastPrune = now();

  return {
    /** @returns {{ allowed: boolean, retryAfter: number }} retryAfter saniyə ilə */
    hit(ip) {
      const t = now();
      if (t - lastPrune > windowMs) { prune(t); lastPrune = t; }
      const list = (hits.get(ip) || []).filter((x) => t - x < windowMs);
      if (list.length >= max) {
        hits.set(ip, list);
        return { allowed: false, retryAfter: Math.ceil((windowMs - (t - list[0])) / 1000) };
      }
      list.push(t);
      hits.set(ip, list);
      return { allowed: true, retryAfter: 0 };
    },
    size: () => hits.size
  };
}
