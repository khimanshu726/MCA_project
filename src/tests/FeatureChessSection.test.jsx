import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FeatureChessSection from "../components/FeatureChessSection.jsx";
import { homeFeatures } from "../data";

const renderSection = (props) =>
  render(
    <MemoryRouter>
      <FeatureChessSection {...props} />
    </MemoryRouter>,
  );

describe("FeatureChessSection", () => {
  it("renders one row per feature, each with its heading and CTA link", () => {
    const { container } = renderSection();

    expect(container.querySelectorAll(".feature-row")).toHaveLength(homeFeatures.length);

    homeFeatures.forEach((feature) => {
      expect(screen.getByRole("heading", { name: feature.title })).toBeInTheDocument();
      const cta = screen.getByRole("link", { name: feature.cta.label });
      expect(cta).toHaveAttribute("href", feature.cta.to);
    });
  });

  it("carries the institutions entry link to /institutions (the homepage anchor)", () => {
    renderSection();

    const link = screen.getByRole("link", { name: /explore institutional supplies/i });
    expect(link).toHaveAttribute("href", "/institutions");
  });

  it("shows a still image by default and no <video> when a row has no videoSrc", () => {
    renderSection({
      features: [{ ...homeFeatures[0], videoSrc: "" }],
    });

    expect(screen.queryByTestId(`feature-video-${homeFeatures[0].id}`)).not.toBeInTheDocument();
    // ResponsiveImage renders an <img> for the still.
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("mounts a looping <video> for a row once its videoSrc is set", () => {
    const feature = { ...homeFeatures[0], id: "studio", videoSrc: "/videos/studio.mp4", poster: "/p.jpg" };
    renderSection({ features: [feature] });

    const video = screen.getByTestId("feature-video-studio");
    expect(video.tagName).toBe("VIDEO");
    expect(video).toHaveAttribute("poster", "/p.jpg");
    expect(video.querySelector("source")).toHaveAttribute("src", "/videos/studio.mp4");
    expect(video).toHaveAttribute("loop");
  });
});
