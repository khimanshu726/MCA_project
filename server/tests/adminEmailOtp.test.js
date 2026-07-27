import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

// Mock Resend so no real email is sent and we can assert dispatch.
const sendMock = vi.fn(async () => ({ data: { id: "otp_email" }, error: null }));
vi.mock("resend", () => ({
  Resend: class {
    constructor() {
      this.emails = { send: sendMock };
    }
  },
}));

// Ensure Resend is "configured" regardless of the local .env.
vi.mock("../config.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    appConfig: {
      ...actual.appConfig,
      resendApiKey: "re_test_key",
      emailFrom: "Elite Impressions <orders@eliteimpressions.co.in>",
    },
  };
});

const { app } = await import("../index.js");
const { User } = await import("../models/User.js");
const { OTP } = await import("../models/OTP.js");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("admin-email-otp-test"));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => sendMock.mockClear());

afterEach(async () => {
  await User.deleteMany({});
  await OTP.deleteMany({});
});

const createAdmin = (email) =>
  User.create({ id: "adm", email, password: bcrypt.hashSync("pw", 10), provider: "email", role: "admin" });

const send = (email) => request(app).post("/api/auth/admin/email-otp/send").send({ email });
const verify = (email, otp) => request(app).post("/api/auth/admin/email-otp/verify").send({ email, otp });

describe("admin email OTP", () => {
  it("mails a code to a real admin and issues a token on verify", async () => {
    await createAdmin("admin@example.com");

    const sendRes = await send("admin@example.com");
    expect(sendRes.statusCode).toBe(200);
    expect(sendRes.body.devOtp).toMatch(/^\d{6}$/);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].to).toBe("admin@example.com");
    expect(await OTP.countDocuments({ email: "admin@example.com" })).toBe(1);

    const verifyRes = await verify("admin@example.com", sendRes.body.devOtp);
    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.body.token).toBeTruthy();
    expect(verifyRes.body.user.role).toBe("admin");
    // Single-use: consumed on success.
    expect(await OTP.countDocuments({ email: "admin@example.com" })).toBe(0);
  });

  it("is enumeration-safe: an unknown email gets the same message, no code, no email", async () => {
    const res = await send("nobody@example.com");

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/if an admin account exists/i);
    expect(res.body.devOtp).toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
    expect(await OTP.countDocuments({})).toBe(0);
  });

  it("does not issue a code for a non-admin (customer) account sharing an email", async () => {
    await User.create({ id: "cust", email: "person@example.com", password: "", provider: "google", role: "customer" });

    const res = await send("person@example.com");

    expect(res.statusCode).toBe(200);
    expect(res.body.devOtp).toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
    expect(await OTP.countDocuments({})).toBe(0);
  });

  it("rejects a wrong code", async () => {
    await createAdmin("admin@example.com");
    await send("admin@example.com");

    const res = await verify("admin@example.com", "000000");
    expect(res.statusCode).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it("rate-limits a second immediate request for the same admin", async () => {
    await createAdmin("admin@example.com");

    const first = await send("admin@example.com");
    expect(first.statusCode).toBe(200);
    const second = await send("admin@example.com");
    expect(second.statusCode).toBe(429);
  });

  it("validates the email and the 6-digit code", async () => {
    expect((await send("not-an-email")).statusCode).toBe(400);
    expect((await verify("admin@example.com", "12")).statusCode).toBe(400);
  });
});
