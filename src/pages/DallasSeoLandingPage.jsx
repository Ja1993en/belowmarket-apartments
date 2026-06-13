import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, MapPin, Search, ShieldCheck, Tag } from "lucide-react";

const DALLAS_LANDING_PAGES = {
  "dallas-tx": {
    title: "Dallas Apartments With Verified Specials",
    eyebrow: "Dallas apartment deals",
    description:
      "Search Dallas apartments by rent specials, effective rent, bedroom type, neighborhood, and property details.",
    searchLabel: "Browse Dallas apartments",
    searchUrl: "/properties?search=Dallas%2C%20TX",
    primaryKeyword: "Dallas apartments",
    highlight: "Compare normal rent, effective rent, and current specials before you tour.",
    sections: [
      {
        title: "Find Dallas apartments with transparent pricing",
        text: "Below Market Apartments helps renters compare listed rent, estimated effective rent, active specials, and available floor plans in one place.",
      },
      {
        title: "Use filters built for real apartment shopping",
        text: "Filter by price range, bedroom count, map area, and specials so the results match the type of unit you are actually looking for.",
      },
    ],
    relatedLinks: [
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
      { label: "8 weeks free apartments", to: "/apartments/dallas-tx/8-weeks-free" },
    ],
  },
  specials: {
    title: "Dallas Apartments With Rent Specials",
    eyebrow: "Dallas rent specials",
    description:
      "Find Dallas apartments with current move-in specials, weeks-free offers, rent credits, and transparent effective rent estimates.",
    searchLabel: "Search Dallas specials",
    searchUrl: "/properties?search=special",
    primaryKeyword: "Dallas apartment specials",
    highlight: "See the special and the estimated effective rent without guessing what the deal means.",
    sections: [
      {
        title: "Compare specials without losing the normal rent",
        text: "Renters can see both normal rent and estimated effective rent so a special feels clear instead of confusing.",
      },
      {
        title: "Built for concessions like weeks free and rent credits",
        text: "Use this page when you want apartments offering concessions such as four weeks free, six weeks free, eight weeks free, or rent-credit specials.",
      },
    ],
    relatedLinks: [
      { label: "All Dallas apartments", to: "/apartments/dallas-tx" },
      { label: "8 weeks free apartments", to: "/apartments/dallas-tx/8-weeks-free" },
    ],
  },
  "8-weeks-free": {
    title: "Dallas Apartments With 8 Weeks Free",
    eyebrow: "8 weeks free apartments",
    description:
      "Browse Dallas apartments advertising 8 weeks free and compare the estimated effective rent, normal rent, and available bedroom types.",
    searchLabel: "Search 8 weeks free",
    searchUrl: "/properties?search=8%20weeks%20free",
    primaryKeyword: "8 weeks free apartments Dallas",
    highlight: "Properties with 8+ weeks free are highlighted with gold deal signals across the search experience.",
    sections: [
      {
        title: "Understand what 8 weeks free really means",
        text: "The monthly amount due may still be based on normal rent plus required fees. Below Market Apartments shows the estimated effective value so renters know what to ask before applying.",
      },
      {
        title: "Filter by bedrooms and budget",
        text: "Search cards adjust to the renter's selected bedroom and price filters, helping you compare the units that actually match your budget.",
      },
    ],
    relatedLinks: [
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
      { label: "All Dallas apartments", to: "/apartments/dallas-tx" },
    ],
  },
};

export default function DallasSeoLandingPage() {
  const { pageType = "dallas-tx" } = useParams();
  const page = DALLAS_LANDING_PAGES[pageType];

  useEffect(() => {
    if (!page) return;

    const previousTitle = document.title;
    const descriptionMeta = document.querySelector("meta[name='description']");
    const canonicalLink = document.querySelector("link[rel='canonical']");
    const ogTitleMeta = document.querySelector("meta[property='og:title']");
    const ogDescriptionMeta = document.querySelector("meta[property='og:description']");
    const ogUrlMeta = document.querySelector("meta[property='og:url']");
    const twitterTitleMeta = document.querySelector("meta[name='twitter:title']");
    const twitterDescriptionMeta = document.querySelector(
      "meta[name='twitter:description']"
    );
    const previousDescription = descriptionMeta?.getAttribute("content") || "";
    const previousCanonical = canonicalLink?.getAttribute("href") || "";
    const previousOgTitle = ogTitleMeta?.getAttribute("content") || "";
    const previousOgDescription = ogDescriptionMeta?.getAttribute("content") || "";
    const previousOgUrl = ogUrlMeta?.getAttribute("content") || "";
    const previousTwitterTitle = twitterTitleMeta?.getAttribute("content") || "";
    const previousTwitterDescription =
      twitterDescriptionMeta?.getAttribute("content") || "";
    const pageTitle = `${page.title} | Below Market Apartments`;
    const canonicalUrl = `https://belowmarketapartments.com${window.location.pathname}`;

    document.title = pageTitle;
    descriptionMeta?.setAttribute("content", page.description);
    canonicalLink?.setAttribute("href", canonicalUrl);
    ogTitleMeta?.setAttribute("content", pageTitle);
    ogDescriptionMeta?.setAttribute("content", page.description);
    ogUrlMeta?.setAttribute("content", canonicalUrl);
    twitterTitleMeta?.setAttribute("content", pageTitle);
    twitterDescriptionMeta?.setAttribute("content", page.description);

    return () => {
      document.title = previousTitle;
      descriptionMeta?.setAttribute("content", previousDescription);
      canonicalLink?.setAttribute("href", previousCanonical);
      ogTitleMeta?.setAttribute("content", previousOgTitle);
      ogDescriptionMeta?.setAttribute("content", previousOgDescription);
      ogUrlMeta?.setAttribute("content", previousOgUrl);
      twitterTitleMeta?.setAttribute("content", previousTwitterTitle);
      twitterDescriptionMeta?.setAttribute("content", previousTwitterDescription);
    };
  }, [page]);

  if (!page) {
    return <Navigate to="/apartments/dallas-tx" replace />;
  }

  return (
    <main className="min-h-screen bg-[#f5f8f1] text-[#102426]">
      <header className="border-b border-[#d7e6df] bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#173f3f] text-xs font-black text-[#f2b84b]">
              BMA
            </span>
            <span className="font-black text-[#102426]">Below Market Apartments</span>
          </Link>
          <Link
            to="/properties?search=Dallas%2C%20TX"
            className="rounded-2xl bg-[#f2b84b] px-4 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
          >
            Search Dallas
          </Link>
        </div>
      </header>

      <section className="bma-brand-panel border-b-[6px] border-[#f2b84b] px-4 py-12 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="w-fit rounded-full bg-[#f2b84b]/15 px-4 py-2 text-sm font-black text-[#f9d783]">
              {page.eyebrow}
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black text-[#fff7df] md:text-6xl">
              {page.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-[#d7ece6]">
              {page.description}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to={page.searchUrl}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f2b84b] px-5 py-4 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
              >
                <Search className="h-4 w-4" />
                {page.searchLabel}
              </Link>
              <Link
                to="/start"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/25 hover:bg-white/15"
              >
                Get matched
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl shadow-[#102426]/20 backdrop-blur">
            <div className="bma-value-stripe h-2 rounded-full" />
            <div className="mt-5 space-y-4">
              <LandingSignal
                icon={Tag}
                title="Current specials"
                text="Search by weeks free, rent credit, property name, city, ZIP, or address."
              />
              <LandingSignal
                icon={ShieldCheck}
                title="Transparent comparison"
                text="Normal rent and estimated effective rent stay visible while renters compare."
              />
              <LandingSignal
                icon={MapPin}
                title="Dallas map search"
                text="Use map pins, filters, and area selection to narrow the apartment search."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-4 lg:grid-cols-3">
          <InfoCard
            title={page.primaryKeyword}
            text={page.highlight}
            isFeatured
          />
          {page.sections.map((section) => (
            <InfoCard key={section.title} title={section.title} text={section.text} />
          ))}
        </div>

        <div className="mt-8 grid gap-5 rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-sm font-black text-[#1f6f63]">How renters use this page</p>
            <h2 className="mt-2 text-3xl font-black text-[#102426]">
              Start broad, then narrow by real unit details.
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#526260]">
              Search results can be filtered by rent, beds, specials, and map area. The property cards update their pricing to match the selected bedroom and price filters so renters are not comparing the wrong unit type.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              "Search Dallas listings and current specials.",
              "Use bedroom and price filters to narrow matching units.",
              "Check normal rent, effective rent, fees, and special details.",
              "Request help from a locator when a deal looks worth touring.",
            ].map((step) => (
              <div key={step} className="flex gap-3 rounded-2xl bg-[#f5f8f1] p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1f6f63]" />
                <p className="text-sm font-bold leading-6 text-[#102426]">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-4 rounded-3xl bg-[#173f3f] p-6 text-white md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black text-[#f2b84b]">Related searches</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {page.relatedLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/15 hover:bg-white/15"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <Link
            to={page.searchUrl}
            className="inline-flex w-fit items-center gap-2 rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
          >
            Browse matching properties
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function LandingSignal({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-[#102426]">
      <Icon className="h-5 w-5 text-[#1f6f63]" />
      <p className="mt-3 text-sm font-black">{title}</p>
      <p className="mt-1 text-xs font-bold leading-5 text-[#526260]">{text}</p>
    </div>
  );
}

function InfoCard({ title, text, isFeatured = false }) {
  return (
    <article
      className={`rounded-3xl border p-6 shadow-sm ${
        isFeatured
          ? "border-[#f2d08a] bg-[#fff8e6]"
          : "border-[#d7e6df] bg-white"
      }`}
    >
      <p className="text-sm font-black text-[#1f6f63]">{title}</p>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#526260]">{text}</p>
    </article>
  );
}
