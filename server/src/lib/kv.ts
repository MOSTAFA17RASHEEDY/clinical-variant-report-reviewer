import { Redis } from "@upstash/redis";

// Lazy singleton, not a Proxy wrapper (Proxies around client objects can
// break libraries that inspect the instance) — a plain lazy getter is the
// pattern Vercel's own storage docs recommend for serverless cold starts.
let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = Redis.fromEnv();
  }
  return _redis;
}
