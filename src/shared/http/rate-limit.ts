/**
 * rate-limit.ts
 * Implementación simple de rate limiting en memoria para Next.js (Vercel).
 * Nota: En despliegues multi-proceso o múltiples lambdas, cada instancia tendrá su propio Map.
 * Para un control global estricto se requeriría Redis.
 */

type RateLimitInfo = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
};

const limiters = new Map<string, RateLimitInfo>();

/**
 * Limpia los limitadores expirados cada 60 segundos
 */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, info] of limiters.entries()) {
      if (now > info.resetAt) {
        limiters.delete(key);
      }
    }
  }, 60000);
}

export function checkRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const info = limiters.get(key);

  if (!info || now > info.resetAt) {
    const newInfo = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    limiters.set(key, newInfo);
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: newInfo.resetAt,
    };
  }

  if (info.count >= options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: info.resetAt,
    };
  }

  info.count += 1;
  return {
    allowed: true,
    remaining: options.maxRequests - info.count,
    resetAt: info.resetAt,
  };
}

/**
 * Configuraciones predefinidas
 */
export const RATE_LIMIT_CONFIGS = {
  AUTH: { windowMs: 60 * 1000, maxRequests: 5 },          // 5 req/min por IP
  WRITE: { windowMs: 60 * 1000, maxRequests: 30 },        // 30 req/min por usuario
  READ: { windowMs: 60 * 1000, maxRequests: 60 },         // 60 req/min por usuario
  PUBLIC: { windowMs: 60 * 1000, maxRequests: 100 },      // 100 req/min por IP
};
