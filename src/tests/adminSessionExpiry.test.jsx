import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { AdminAuthProvider, useAdminAuth } from "../../admin-app/src/context/AdminAuthContext";
import { SESSION_EXPIRED_EVENT, fetchAdminProducts, updateProduct } from "../../admin-app/src/lib/adminApi";

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("admin requests when the sign-in has expired or the server is restarting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("announces an expired session when the server refuses the token", async () => {
    fetch.mockResolvedValue(jsonResponse(401, { message: "Session expired. Please log in again." }));
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    await expect(fetchAdminProducts("old-token")).rejects.toThrow("Session expired");
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it("quietly retries a read through a restart (502) and returns the data", async () => {
    fetch
      .mockResolvedValueOnce(new Response("<html>Bad gateway</html>", { status: 502 }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse(200, { items: [{ id: "classic-card" }] }));

    const pending = fetchAdminProducts("tok");
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual({ items: [{ id: "classic-card" }] });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("says the server is restarting when the retries run out", async () => {
    fetch.mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 }));
    const pending = fetchAdminProducts("tok");
    const assertion = expect(pending).rejects.toThrow(/restarting after an update/);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("never repeats a save", async () => {
    fetch.mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(updateProduct("classic-card", { name: "x" }, "tok")).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

function Probe() {
  const { isAuthenticated, sessionExpired } = useAdminAuth();
  return <p>{`${isAuthenticated ? "signed in" : "signed out"}${sessionExpired ? " · expired" : ""}`}</p>;
}

describe("the admin session", () => {
  it("signs out and remembers why when the session expires", () => {
    window.localStorage.setItem("elite-admin-session", JSON.stringify({ token: "old", admin: { name: "A" } }));
    render(
      <AdminAuthProvider>
        <Probe />
      </AdminAuthProvider>,
    );
    expect(screen.getByText("signed in")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    });
    expect(screen.getByText("signed out · expired")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("elite-admin-session")).token).toBe("");
  });
});
