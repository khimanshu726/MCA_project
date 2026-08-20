import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HeroCinematic from "../components/HeroCinematic.jsx";

const renderHero = (props) =>
  render(
    <MemoryRouter>
      <HeroCinematic {...props} />
    </MemoryRouter>,
  );

describe("HeroCinematic", () => {
  it("renders the headline and both CTAs pointing at the catalog and customizer", () => {
    renderHero();

    expect(screen.getByRole("heading", { name: /launch-ready from the first click/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /shop all products/i })).toHaveAttribute("href", "/products");
    expect(screen.getByRole("link", { name: /start customizing/i })).toHaveAttribute("href", "/customize");
  });

  it("uses the animated backdrop and mounts no <video> when no source is configured", () => {
    const { container } = renderHero({ media: { videoSrc: "", poster: "/p.jpg", dividerSrc: "" } });

    // The animated gradient mesh is always present as the default backdrop.
    expect(container.querySelectorAll(".hero-mesh").length).toBeGreaterThan(0);
    // With no source, the heavy <video> layer must not be rendered at all.
    expect(screen.queryByTestId("hero-video")).not.toBeInTheDocument();
  });

  it("mounts the drop-in <video> (with poster + source) once a videoSrc is provided", () => {
    renderHero({ media: { videoSrc: "/videos/hero.mp4", poster: "/poster.jpg", dividerSrc: "" } });

    const video = screen.getByTestId("hero-video");
    expect(video.tagName).toBe("VIDEO");
    expect(video).toHaveAttribute("poster", "/poster.jpg");
    expect(video.querySelector("source")).toHaveAttribute("src", "/videos/hero.mp4");
    // Autoplay-safe: looping + playsInline. (React sets `muted` as a DOM
    // property, not a reflected attribute, so it isn't asserted here.)
    expect(video).toHaveAttribute("loop");
    expect(video).toHaveAttribute("playsinline");
  });
});
