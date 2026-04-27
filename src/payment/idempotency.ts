/**
 * Idempotency store for webhook event deduplication.
 *
 * Stripe will retry webhook deliveries on non-2xx responses, so handlers must
 * be idempotent. Implementations are responsible for atomically recording
 * processed event IDs.
 *
 * For production deployments — especially serverless or multi-instance setups —
 * provide a persistent, shared store (Redis, DynamoDB, Postgres, etc.). The
 * default {@link InMemoryIdempotencyStore} is process-local and will lose state
 * on restart; concurrent webhook deliveries hitting separate instances will not
 * see each other.
 */
export interface IdempotencyStore {
  /** Returns true if the eventId has already been processed. */
  has(eventId: string): boolean | Promise<boolean>;
  /** Records the eventId as processed. */
  add(eventId: string): void | Promise<void>;
}

const DEFAULT_MAX_EVENTS = 1000;
const DEFAULT_EVICT_BATCH = 100;

/**
 * Process-local idempotency store. Suitable for single-instance development
 * and tests. **Not safe for production at scale** — see {@link IdempotencyStore}.
 */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly events = new Set<string>();
  private readonly maxEvents: number;
  private readonly evictBatch: number;

  constructor(options: { maxEvents?: number; evictBatch?: number } = {}) {
    this.maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;
    this.evictBatch = options.evictBatch ?? DEFAULT_EVICT_BATCH;
  }

  has(eventId: string): boolean {
    return this.events.has(eventId);
  }

  add(eventId: string): void {
    if (this.events.size >= this.maxEvents) {
      const iterator = this.events.values();
      for (let i = 0; i < this.evictBatch; i++) {
        const val = iterator.next().value;
        if (val === undefined) break;
        this.events.delete(val);
      }
    }
    this.events.add(eventId);
  }
}
