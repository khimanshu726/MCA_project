import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { request } from "../lib/api";
import { registerAuthHandlers } from "../auth/authBridge";

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => "application/json" },
  json: async () => body,
});

describe("request() session recovery", () => {
  let unregister;
  let getFreshToken;
  let onSessionEnded;

  beforeEach(() => {
    getFreshToken = vi.fn();
    onSessionEnded = vi.fn();
    unregister = registerAuthHandlers({ getFreshToken, onSessionEnded });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    unregister();
    vi.restoreAllMocks();
  });

  it("refreshes once and replays the request when the token has gone stale", async () => {
    // The ordinary case: Firebase ID tokens live an hour, so any tab left open
    // long enough hits this. The customer should never see it.
    global.fetch
      .mockResolvedValueOnce(jsonResponse(401, { code: "SESSION_INVALID" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    getFreshToken.mockResolvedValue("fresh-token");

    const result = await request("/cart", { token: "stale-token" });

    expect(result).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe("Bearer fresh-token");
    // Recovered, so the session did NOT end.
    expect(onSessionEnded).not.toHaveBeenCalled();
  });

  it("ends the session when the replay is still unauthorized", async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(401, { code: "SESSION_INVALID" }))
      .mockResolvedValueOnce(jsonResponse(401, { code: "SESSION_REVOKED", message: "Signed out." }));
    getFreshToken.mockResolvedValue("fresh-token");

    await expect(request("/cart", { token: "stale-token" })).rejects.toThrow();
    expect(onSessionEnded).toHaveBeenCalledWith("SESSION_REVOKED");
  });

  it("ends the session when the refresh itself fails", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse(401, { code: "SESSION_EXPIRED" }));
    getFreshToken.mockResolvedValue(null);

    await expect(request("/cart", { token: "stale-token" })).rejects.toThrow();
    // No replay is attempted without a fresh token.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(onSessionEnded).toHaveBeenCalledWith("SESSION_EXPIRED");
  });

  it("never retries or signs out an unauthenticated request", async () => {
    // A 401 with no credentials means "log in", not "your token went stale".
    // Signing out a guest browsing the site would be nonsense.
    global.fetch.mockResolvedValueOnce(jsonResponse(401, { code: "AUTH_REQUIRED" }));

    await expect(request("/cart")).rejects.toThrow();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(getFreshToken).not.toHaveBeenCalled();
    expect(onSessionEnded).not.toHaveBeenCalled();
  });

  it("does not sign the customer out over a 503", async () => {
    // 503 is the server unable to verify ANYONE (Firebase Admin unconfigured).
    // That is our fault, and signing them out sends them round a login loop
    // that cannot possibly succeed — which is exactly what happened in
    // production once already.
    global.fetch.mockResolvedValueOnce(jsonResponse(503, { code: "AUTH_UNAVAILABLE", message: "Not configured." }));

    await expect(request("/cart", { token: "good-token" })).rejects.toThrow();
    expect(onSessionEnded).not.toHaveBeenCalled();
    expect(getFreshToken).not.toHaveBeenCalled();
  });

  it("does not replay a FormData upload, whose stream is already consumed", async () => {
    // Retrying the same FormData sends an empty body — a design file silently
    // uploaded as nothing is worse than a visible failure.
    global.fetch.mockResolvedValueOnce(jsonResponse(401, { code: "SESSION_INVALID" }));
    const body = new FormData();
    body.append("designFile", new Blob(["x"]), "art.png");

    await expect(request("/orders", { method: "POST", body, token: "stale-token" })).rejects.toThrow();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    // The session still ends cleanly — the customer is not left half-signed-in.
    expect(onSessionEnded).toHaveBeenCalledWith("SESSION_INVALID");
  });

  it("also ends the session on a 403", async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse(403, { code: "SESSION_INVALID" }))
      .mockResolvedValueOnce(jsonResponse(403, { code: "SESSION_INVALID" }));
    getFreshToken.mockResolvedValue("fresh-token");

    await expect(request("/orders/customer", { token: "stale-token" })).rejects.toThrow();
    expect(onSessionEnded).toHaveBeenCalledWith("SESSION_INVALID");
  });
});
