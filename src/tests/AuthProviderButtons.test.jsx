import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthProviderButtons from "../components/AuthProviderButtons";

describe("AuthProviderButtons", () => {
  // Facebook sign-in is not enabled in this Firebase project, so a Facebook
  // button could only ever fail. It stays hidden unless explicitly enabled.
  it("shows Google but not Facebook by default", () => {
    render(<AuthProviderButtons onGoogle={vi.fn()} onFacebook={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue with Facebook" })).not.toBeInTheDocument();
  });

  it("shows Facebook when a caller turns it on", () => {
    render(<AuthProviderButtons onGoogle={vi.fn()} onFacebook={vi.fn()} showFacebook />);

    expect(screen.getByRole("button", { name: "Continue with Facebook" })).toBeInTheDocument();
  });
});
