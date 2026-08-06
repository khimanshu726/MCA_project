import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import ResponsiveImage from "../components/ResponsiveImage";
import HeroBackdrop from "../components/home/HeroBackdrop";
import RollButton from "../components/home/RollButton";
import SectionBadge from "../components/home/SectionBadge";
import ShowcaseCard from "../components/home/ShowcaseCard";
import bannerImage from "../assets/images/banner-print-shop.svg";
import cardsImage from "../assets/images/category-cards.svg";
import merchImage from "../assets/images/category-merch.svg";
import stationeryImage from "../assets/images/category-stationery.svg";
import "../styles/axion-home.css";

/**
 * Studio-style landing page.
 *
 * Renders inside AppLayout, so PromoStrip / AppHeader / SiteFooter still
 * frame it — the comp's own pill navbar is deliberately dropped rather than
 * stacked on top of the storefront header. The hero is sized with
 * min-h-[78vh] instead of a full 100vh for the same reason: a full viewport
 * under an existing header pushes the CTA below the fold on laptops.
 */

const IST_FORMAT = {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

function useLocalTime() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("en-GB", IST_FORMAT),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-GB", IST_FORMAT));
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  return time;
}

function HomePage() {
  const time = useLocalTime();

  return (
    <main>
      {/* ---------- 1. Hero ---------- */}
      <section className="relative flex min-h-[78vh] flex-col overflow-hidden bg-bone">
        <HeroBackdrop />

        <div className="relative z-20 mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-end px-5 pb-14 pt-16 sm:px-8 sm:pb-16 lg:px-12 lg:pb-20">
          <p className="mb-5 flex items-center gap-4 text-[13px] tracking-wide text-ink-900 sm:mb-8 sm:text-sm">
            Elite Impressions
            <span className="hidden items-center gap-1.5 text-ink-500 sm:inline-flex">
              <Clock size={14} />
              {time} press time
            </span>
          </p>

          <h1 className="max-w-[20ch] text-[clamp(1.75rem,7vw,4.2rem)] font-medium leading-[1.08] tracking-[-0.03em] text-ink-900 sm:text-[clamp(2.5rem,5vw,4.2rem)]">
            We print brand materials
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            for teams ready to look
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            launch-ready every time.
          </h1>

          <div className="mt-8 flex flex-col items-start gap-4 sm:mt-12 sm:flex-row sm:items-center sm:gap-5">
            <RollButton to="/customize">Start customizing</RollButton>

            <div className="inline-flex items-center gap-2.5 rounded-[4px] bg-white px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 100 100"
                className="h-5 w-5 shrink-0 fill-current text-brand-400 sm:h-6 sm:w-6"
                aria-hidden="true"
              >
                <path d="m19.6 66.5 19.7-11 .3-1-.3-.5h-1l-3.3-.2-11.2-.3L14 53l-9.5-.5-2.4-.5L0 49l.2-1.5 2-1.3 2.9.2 6.3.5 9.5.6 6.9.4L38 49.1h1.6l.2-.7-.5-.4-.4-.4L29 41l-10.6-7-5.6-4.1-3-2-1.5-2-.6-4.2 2.7-3 3.7.3.9.2 3.7 2.9 8 6.1L37 36l1.5 1.2.6-.4.1-.3-.7-1.1L33 25l-6-10.4-2.7-4.3-.7-2.6c-.3-1-.4-2-.4-3l3-4.2L28 0l4.2.6L33.8 2l2.6 6 4.1 9.3L47 29.9l2 3.8 1 3.4.3 1h.7v-.5l.5-7.2 1-8.7 1-11.2.3-3.2 1.6-3.8 3-2L61 2.6l2 2.9-.3 1.8-1.1 7.7L59 27.1l-1.5 8.2h.9l1-1.1 4.1-5.4 6.9-8.6 3-3.5L77 13l2.3-1.8h4.3l3.1 4.7-1.4 4.9-4.4 5.6-3.7 4.7-5.3 7.1-3.2 5.7.3.4h.7l12-2.6 6.4-1.1 7.6-1.3 3.5 1.6.4 1.6-1.4 3.4-8.2 2-9.6 2-14.3 3.3-.2.1.2.3 6.4.6 2.8.2h6.8l12.6 1 3.3 2 1.9 2.7-.3 2-5.1 2.6-6.8-1.6-16-3.8-5.4-1.3h-.8v.4l4.6 4.5 8.3 7.5L89 80.1l.5 2.4-1.3 2-1.4-.2-9.2-7-3.6-3-8-6.8h-.5v.7l1.8 2.7 9.8 14.7.5 4.5-.7 1.4-2.6 1-2.7-.6-5.8-8-6-9-4.7-8.2-.5.4-2.9 30.2-1.3 1.5-3 1.2-2.5-2-1.4-3 1.4-6.2 1.6-8 1.3-6.4 1.2-7.9.7-2.6v-.2H49L43 72l-9 12.3-7.2 7.6-1.7.7-3-1.5.3-2.8L24 86l10-12.8 6-7.9 4-4.6-.1-.5h-.3L17.2 77.4l-4.7.6-2-2 .2-3 1-1 8-5.5Z" />
              </svg>
              <span className="text-[13px] font-medium text-ink-900 sm:text-sm">
                Reprint guarantee
              </span>
              <span className="rounded bg-ink-900 px-1.5 py-0.5 text-[10px] text-white sm:px-2 sm:text-[11px]">
                100%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 2. About ---------- */}
      <section className="overflow-hidden bg-white pb-12 pt-16 sm:pb-16 sm:pt-20 lg:pb-24 lg:pt-32">
        <div className="mx-auto max-w-[1440px]">
          <div className="px-5 sm:px-8 lg:px-12">
            <SectionBadge number="1" label="Introducing Elite Impressions" />

            <h2 className="mb-12 max-w-[24ch] text-[clamp(1.5rem,4vw,3.2rem)] font-medium leading-[1.12] tracking-[-0.02em] text-ink-900 sm:mb-16 lg:mb-28">
              Premium print execution, delivered
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              with a cleaner ordering flow.
            </h2>
          </div>

          {/* Stacked below lg; the three-column ledge layout above it. */}
          <div className="px-5 sm:px-8 lg:hidden">
            <p className="text-[15px] font-medium leading-[1.6] text-ink-900 sm:text-[17px]">
              Every card, banner, invitation, and gift is proofed, printed, and
              checked in-house — so what arrives is what you approved.
            </p>
            <div className="mt-6">
              <RollButton to="/products">Browse the catalog</RollButton>
            </div>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-5">
              <div className="sm:w-[45%]">
                <ResponsiveImageSlot
                  src={stationeryImage}
                  alt="Custom stationery set"
                  aspectClassName="ratio-landscape"
                />
              </div>
              <div className="sm:w-[55%]">
                <ResponsiveImageSlot
                  src={bannerImage}
                  alt="Large-format print production"
                  aspectClassName="ratio-banner"
                />
              </div>
            </div>
          </div>

          <div className="hidden grid-cols-[26%_1fr_48%] items-end gap-6 px-12 lg:grid xl:gap-8">
            <div className="self-end">
              <ResponsiveImageSlot
                src={stationeryImage}
                alt="Custom stationery set"
                aspectClassName="ratio-landscape"
              />
            </div>
            <div className="flex flex-col items-start gap-7 self-start">
              <p className="text-base leading-[1.65] text-ink-900 xl:text-lg">
                Every card, banner, invitation, and gift is
                <br />
                proofed, printed, and checked in-house — so
                <br />
                what arrives is what you approved.
              </p>
              <RollButton to="/products">Browse the catalog</RollButton>
            </div>
            <div className="self-end">
              <ResponsiveImageSlot
                src={bannerImage}
                alt="Large-format print production"
                aspectClassName="ratio-banner"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 3. Work ---------- */}
      <section className="bg-bone-100 pb-16 pt-16 sm:pb-20 sm:pt-20 lg:pb-28 lg:pt-28">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <SectionBadge
            number="2"
            label="Featured client work"
            borderClassName="border-ink-300"
          />

          <h2 className="mb-10 text-[clamp(1.75rem,7vw,4.2rem)] font-medium leading-[1.08] tracking-[-0.03em] text-ink-900 sm:mb-14 sm:text-[clamp(2.5rem,5vw,4.2rem)] lg:mb-16">
            Our work
          </h2>

          <div className="grid grid-cols-1 items-start gap-5 sm:gap-6 md:grid-cols-2 lg:gap-7">
            <ShowcaseCard
              to="/products?category=Visiting%20Cards"
              image={cardsImage}
              imageAlt="Premium visiting cards with foil finish"
              aspectClassName="ratio-landscape"
              label="Learn more"
              labelWidth="148px"
              description="Soft-touch and foil business cards for studios that get judged on the handshake"
              title="Visiting Cards"
            />
            <ShowcaseCard
              to="/products?category=Clothing%20%26%20Merchandise"
              image={merchImage}
              imageAlt="Branded merchandise and apparel"
              aspectClassName="ratio-square"
              label="View case study"
              labelWidth="168px"
              tone="dark"
              description="Team apparel and branded gifting, print-ready from a single uploaded logo"
              title="Merchandise"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

/**
 * Thin wrapper so the rounded corners and cover fit are declared once
 * rather than on each of the four call sites above.
 */
function ResponsiveImageSlot({ src, alt, aspectClassName }) {
  return (
    <div className="overflow-hidden rounded-xl sm:rounded-2xl">
      <ResponsiveImage
        src={src}
        alt={alt}
        aspectClassName={aspectClassName}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export default HomePage;
