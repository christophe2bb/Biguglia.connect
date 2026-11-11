import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AppError,
  authHeaders,
  request,
  safeLocalPath,
  safeUrl,
  setBearer,
  timedFetch,
} from "../src/lib/client";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  setBearer();
});
describe("safe routing", () => {
  it.each([
    "https://evil.example/",
    "//evil.example/",
    "/\\evil.example/",
    "/\nunsafe",
  ])("rejects external redirect %s", (path) =>
    expect(safeLocalPath(path)).toBe("/"),
  );
  it("keeps the requested local destination", () =>
    expect(safeLocalPath("/demandes/nouveau?x=1")).toBe(
      "/demandes/nouveau?x=1",
    ));
  it.each(["javascript:alert(1)", "data:text/html,evil", "not a url"])(
    "rejects active URL %s",
    (url) => expect(safeUrl(url)).toBeUndefined(),
  );
});
describe("network lifecycle", () => {
  it("never treats a publishable API key as a user JWT", () => {
    setBearer();
    expect(authHeaders()).not.toHaveProperty("Authorization");
    setBearer("session-token");
    expect(authHeaders().Authorization).toBe("Bearer session-token");
  });
  it("cancels a stalled request after twelve seconds", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      ),
    );
    const result = timedFetch("https://example.test/");
    const assertion = expect(result).rejects.toThrow("trop de temps");
    await vi.advanceTimersByTimeAsync(12000);
    await assertion;
  });
  it("propagates cancellation when leaving a page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      ),
    );
    const controller = new AbortController();
    const pending = timedFetch("https://example.test/", {
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(AppError);
  });
  it("turns server failures into an error rather than an empty successful list", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message: "internal error" }), {
            status: 503,
          }),
        ),
    );
    await expect(request("events")).rejects.toThrow(
      "temporairement indisponible",
    );
  });
});
