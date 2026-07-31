import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUuid } from "@/analytics/uuid";

/**
 * Guards the insecure-context fallback. Loading the game from a LAN address on
 * a phone (plain http) means `crypto.randomUUID` is undefined — and since
 * analytics.ts generates a session id at module scope, getting this wrong is a
 * blank screen on device, not a degraded stat.
 */

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("randomUuid", () => {
  it("uses the native implementation when the context is secure", () => {
    const native = vi.fn(() => "11111111-2222-4333-8444-555555555555");
    vi.stubGlobal("crypto", { randomUUID: native, getRandomValues: () => {} });

    expect(randomUuid()).toBe("11111111-2222-4333-8444-555555555555");
    expect(native).toHaveBeenCalled();
  });

  it("builds a valid v4 UUID from getRandomValues when randomUUID is missing", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) array[i] = (i * 37 + 11) % 256;
        return array;
      },
    });

    const id = randomUuid();
    expect(id).toMatch(UUID_V4);
  });

  it("still works when crypto is absent entirely", () => {
    vi.stubGlobal("crypto", undefined);
    expect(randomUuid()).toMatch(UUID_V4);
  });

  it("sets the version and variant bits even for all-zero randomness", () => {
    // The nibble-masking is the easiest part to get wrong, and an invalid UUID
    // would be silently accepted by the analytics backend.
    vi.stubGlobal("crypto", {
      getRandomValues: (array: Uint8Array) => array.fill(0),
    });
    const id = randomUuid();
    expect(id).toMatch(UUID_V4);
    expect(id[14]).toBe("4");
    expect("89ab").toContain(id[19]);
  });

  it("does not collide across many draws", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) array[i] = Math.floor(Math.random() * 256);
        return array;
      },
    });
    const ids = new Set(Array.from({ length: 500 }, () => randomUuid()));
    expect(ids.size).toBe(500);
  });
});
