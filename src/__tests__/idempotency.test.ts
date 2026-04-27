import { describe, expect, it } from "vitest";
import { InMemoryIdempotencyStore } from "../payment/idempotency";

describe("InMemoryIdempotencyStore", () => {
  it("returns false before add and true after", () => {
    const store = new InMemoryIdempotencyStore();
    expect(store.has("evt_1")).toBe(false);
    store.add("evt_1");
    expect(store.has("evt_1")).toBe(true);
  });

  it("evicts oldest entries when capacity is exceeded", () => {
    const store = new InMemoryIdempotencyStore({ maxEvents: 5, evictBatch: 2 });
    for (let i = 0; i < 5; i++) store.add(`evt_${i}`);
    // Adding 6th triggers eviction of first 2
    store.add("evt_5");
    expect(store.has("evt_0")).toBe(false);
    expect(store.has("evt_1")).toBe(false);
    expect(store.has("evt_2")).toBe(true);
    expect(store.has("evt_5")).toBe(true);
  });

  it("is idempotent on repeated add", () => {
    const store = new InMemoryIdempotencyStore();
    store.add("evt_x");
    store.add("evt_x");
    expect(store.has("evt_x")).toBe(true);
  });
});
