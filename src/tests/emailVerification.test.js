import { describe, expect, it } from "vitest";
import { isPasswordProvider, requiresEmailVerification } from "../utils/emailVerification";

const passwordUser = (overrides = {}) => ({
  email: "person@example.com",
  emailVerified: false,
  providerData: [{ providerId: "password" }],
  ...overrides,
});

describe("requiresEmailVerification", () => {
  it("gates an unverified email/password account", () => {
    expect(requiresEmailVerification(passwordUser())).toBe(true);
  });

  it("does not gate once the password account is verified", () => {
    expect(requiresEmailVerification(passwordUser({ emailVerified: true }))).toBe(false);
  });

  it("never gates a Google account (its email is already verified)", () => {
    const googleUser = {
      email: "person@gmail.com",
      emailVerified: true,
      providerData: [{ providerId: "google.com" }],
    };
    expect(requiresEmailVerification(googleUser)).toBe(false);
  });

  it("never gates a phone-OTP account (no email to verify)", () => {
    const phoneUser = {
      email: "",
      emailVerified: false,
      providerData: [{ providerId: "phone" }],
    };
    expect(requiresEmailVerification(phoneUser)).toBe(false);
  });

  it("treats a null/absent user as not requiring verification", () => {
    expect(requiresEmailVerification(null)).toBe(false);
    expect(requiresEmailVerification(undefined)).toBe(false);
  });

  it("isPasswordProvider detects a linked password provider among several", () => {
    const linked = {
      providerData: [{ providerId: "google.com" }, { providerId: "password" }],
    };
    expect(isPasswordProvider(linked)).toBe(true);
  });
});
