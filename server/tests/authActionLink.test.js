import { describe, expect, it, vi } from "vitest";

// Pin storefrontUrl so the rebuilt link's origin is deterministic.
vi.mock("../config.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    appConfig: { ...actual.appConfig, storefrontUrl: "https://eliteimpressions.co.in" },
  };
});

const { toBrandedActionLink } = await import("../config/firebaseAdmin.js");

describe("toBrandedActionLink", () => {
  it("rewrites a Firebase default-handler link to the branded /auth/action carrying the oobCode", () => {
    const firebaseLink =
      "https://print-shop-a4a0c.firebaseapp.com/__/auth/action" +
      "?mode=resetPassword&oobCode=ABC123&apiKey=KEY&continueUrl=https%3A%2F%2Feliteimpressions.co.in%2Fauth%2Faction&lang=en";

    const url = new URL(toBrandedActionLink(firebaseLink));

    expect(url.origin + url.pathname).toBe("https://eliteimpressions.co.in/auth/action");
    expect(url.searchParams.get("mode")).toBe("resetPassword");
    expect(url.searchParams.get("oobCode")).toBe("ABC123");
    // The default-handler noise is dropped — the branded page only needs mode + oobCode.
    expect(url.searchParams.get("apiKey")).toBeNull();
    expect(url.searchParams.get("continueUrl")).toBeNull();
  });

  it("carries the verifyEmail mode through unchanged", () => {
    const url = new URL(
      toBrandedActionLink("https://print-shop-a4a0c.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=XYZ"),
    );
    expect(url.searchParams.get("mode")).toBe("verifyEmail");
    expect(url.searchParams.get("oobCode")).toBe("XYZ");
  });

  it("returns the link unchanged when it carries no oobCode (nothing to redeem)", () => {
    const noCode = "https://print-shop-a4a0c.firebaseapp.com/__/auth/action?mode=resetPassword";
    expect(toBrandedActionLink(noCode)).toBe(noCode);
  });

  it("returns the input unchanged when it isn't a valid URL", () => {
    expect(toBrandedActionLink("not a url")).toBe("not a url");
  });
});
