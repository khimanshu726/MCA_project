import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

// Admin SDK link generation + token verification are mocked so no real Firebase
// project is touched. The link builders are the seam Option B hangs on.
const buildPasswordResetLinkMock = vi.fn();
const buildEmailVerificationLinkMock = vi.fn();

vi.mock("../config/firebaseAdmin.js", () => ({
  verifyFirebaseIdToken: vi.fn(async (token) => {
    if (token === "unverified-password-token") {
      return {
        uid: "verify-uid",
        email: "verify@example.com",
        auth_time: Math.floor(Date.now() / 1000),
        email_verified: false,
        firebase: { sign_in_provider: "password" },
      };
    }
    const error = new Error("Invalid token");
    error.statusCode = 401;
    throw error;
  }),
  buildPasswordResetLink: (...args) => buildPasswordResetLinkMock(...args),
  buildEmailVerificationLink: (...args) => buildEmailVerificationLinkMock(...args),
  isFirebaseAdminConfigured: () => true,
  revokeFirebaseSessions: vi.fn(),
}));

// Resend is mocked as a class (matches new Resend(key) in resendService). The
// shared send spy lets us assert what mail went out.
const sendMock = vi.fn(async () => ({ data: { id: "email_test" }, error: null }));
vi.mock("resend", () => ({
  Resend: class {
    constructor() {
      this.emails = { send: sendMock };
    }
  },
}));

// Force Option B on with a usable Resend key, without a real .env.
vi.mock("../config.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    appConfig: {
      ...actual.appConfig,
      resendApiKey: "re_test_key",
      emailSecurityProvider: "resend",
      emailFrom: "Elite Impressions <orders@eliteimpressions.co.in>",
      storefrontUrl: "https://eliteimpressions.co.in",
    },
  };
});

const { app } = await import("../index.js");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("auth-email-test"));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => {
  buildPasswordResetLinkMock.mockReset();
  buildEmailVerificationLinkMock.mockReset();
  sendMock.mockClear();
  buildPasswordResetLinkMock.mockResolvedValue(
    "https://eliteimpressions.co.in/auth/action?mode=resetPassword&oobCode=CODE",
  );
  buildEmailVerificationLinkMock.mockResolvedValue(
    "https://eliteimpressions.co.in/auth/action?mode=verifyEmail&oobCode=CODE",
  );
});

describe("POST /api/auth/customer/password-reset", () => {
  it("generates a link and sends branded mail for a known address", async () => {
    const res = await request(app).post("/api/auth/customer/password-reset").send({ email: "known@example.com" });

    expect(res.statusCode).toBe(200);
    expect(res.body.provider).toBe("resend");
    expect(buildPasswordResetLinkMock).toHaveBeenCalledWith("known@example.com");
    expect(sendMock).toHaveBeenCalledTimes(1);
    const sent = sendMock.mock.calls[0][0];
    expect(sent.to).toBe("known@example.com");
    expect(sent.subject).toMatch(/reset your.*password/i);
    expect(sent.html).toContain("oobCode=CODE");
  });

  it("is enumeration-safe: an unknown address returns the identical generic reply and sends nothing", async () => {
    // Known address: link resolves (default), mail is sent.
    const known = await request(app).post("/api/auth/customer/password-reset").send({ email: "known@example.com" });

    // Unknown address: the Admin SDK throws user-not-found, which must be swallowed.
    sendMock.mockClear();
    const notFound = new Error("no user");
    notFound.code = "auth/user-not-found";
    buildPasswordResetLinkMock.mockRejectedValueOnce(notFound);
    const unknown = await request(app).post("/api/auth/customer/password-reset").send({ email: "ghost@example.com" });

    // Same status, same provider, same message — no oracle.
    expect(unknown.statusCode).toBe(known.statusCode);
    expect(unknown.body).toEqual(known.body);
    // And nothing was actually mailed for the unknown address.
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed email with 400", async () => {
    const res = await request(app).post("/api/auth/customer/password-reset").send({ email: "not-an-email" });
    expect(res.statusCode).toBe(400);
    expect(buildPasswordResetLinkMock).not.toHaveBeenCalled();
  });

  it("falls back to the Firebase provider when the Admin SDK is unconfigured (503)", async () => {
    const unavailable = new Error("admin down");
    unavailable.statusCode = 503;
    buildPasswordResetLinkMock.mockRejectedValueOnce(unavailable);

    const res = await request(app).post("/api/auth/customer/password-reset").send({ email: "known@example.com" });

    expect(res.statusCode).toBe(200);
    expect(res.body.provider).toBe("firebase");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does NOT claim success when the Resend send fails — hands off to Firebase instead", async () => {
    // Link generation succeeds (default), but Resend rejects the send. The old
    // code discarded this result and returned provider:"resend" (a false "reset
    // link sent"); it must now report provider:"firebase" so the client delivers
    // via Firebase and the customer actually receives a reset email.
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "domain not verified" } });

    const res = await request(app).post("/api/auth/customer/password-reset").send({ email: "known@example.com" });

    expect(res.statusCode).toBe(200);
    expect(res.body.provider).toBe("firebase");
    expect(buildPasswordResetLinkMock).toHaveBeenCalledWith("known@example.com");
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("also hands off to Firebase when the Resend send throws (network/SDK failure)", async () => {
    sendMock.mockRejectedValueOnce(new Error("connection reset"));

    const res = await request(app).post("/api/auth/customer/password-reset").send({ email: "known@example.com" });

    expect(res.statusCode).toBe(200);
    expect(res.body.provider).toBe("firebase");
  });
});

describe("POST /api/auth/customer/verify-email/send", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/api/auth/customer/verify-email/send");
    expect(res.statusCode).toBe(401);
    expect(buildEmailVerificationLinkMock).not.toHaveBeenCalled();
  });

  it("generates a verification link and sends branded mail for the signed-in customer", async () => {
    const res = await request(app)
      .post("/api/auth/customer/verify-email/send")
      .set("Authorization", "Bearer unverified-password-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.provider).toBe("resend");
    expect(buildEmailVerificationLinkMock).toHaveBeenCalledWith("verify@example.com");
    // First-time auth also creates the account (and fires a welcome email), so
    // assert the verification mail specifically rather than a total count.
    const verifyCall = sendMock.mock.calls.find((call) => /verify your email/i.test(call[0].subject));
    expect(verifyCall).toBeTruthy();
    expect(verifyCall[0].to).toBe("verify@example.com");
    expect(verifyCall[0].html).toContain("oobCode=CODE");
  });
});
