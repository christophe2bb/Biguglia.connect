import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useQuery } from "../src/lib/hooks";

describe("private query lifecycle", () => {
  it("hides the previous account's data on the first render of the next account", async () => {
    const seen: { account: string; data: string | null }[] = [];
    const { result, rerender } = renderHook(
      ({ account }) => {
        const query = useQuery(account, async () =>
          account === "a"
            ? "Private response A"
            : new Promise<string>(() => {}),
        );
        seen.push({ account, data: query.data });
        return query;
      },
      { initialProps: { account: "a" } },
    );
    await waitFor(() => expect(result.current.data).toBe("Private response A"));
    rerender({ account: "b" });
    expect(
      seen.filter((r) => r.account === "b").every((r) => r.data === null),
    ).toBe(true);
    expect(result.current.loading).toBe(true);
  });
});
