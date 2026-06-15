import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, MapPin, Search, ShieldCheck, Tag } from "lucide-react";
import { getAllProperties } from "../data/propertyStorage";

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
  uptown: {
    title: "Uptown Dallas Apartments With Specials",
    eyebrow: "Uptown Dallas apartments",
    description:
      "Search Uptown Dallas apartments with current specials, effective rent estimates, bedroom filters, and map-based apartment search.",
    searchLabel: "Search Uptown Dallas",
    searchUrl: "/properties?search=Uptown%20Dallas",
    primaryKeyword: "Uptown Dallas apartment specials",
    highlight:
      "Compare Uptown Dallas listings by normal rent, estimated effective rent, bedroom type, and current concessions.",
    sections: [
      {
        title: "Find Uptown Dallas apartments with clearer pricing",
        text: "Uptown renters often compare multiple luxury and mid-rise options. Below Market Apartments keeps specials and effective rent visible so the deal is easier to understand.",
      },
      {
        title: "Narrow by floor plan and budget",
        text: "Use price and bedroom filters to focus on the Uptown units that match your actual search instead of scanning every floor plan at every property.",
      },
    ],
    relatedLinks: [
      { label: "Oak Lawn apartments", to: "/apartments/dallas-tx/oak-lawn" },
      { label: "Downtown Dallas apartments", to: "/apartments/dallas-tx/downtown" },
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
    ],
  },
  "oak-lawn": {
    title: "Oak Lawn Dallas Apartments With Specials",
    eyebrow: "Oak Lawn apartment deals",
    description:
      "Browse Oak Lawn Dallas apartments with active specials, estimated effective rent, bedroom filters, and transparent deal details.",
    searchLabel: "Search Oak Lawn",
    searchUrl: "/properties?search=Oak%20Lawn%20Dallas",
    primaryKeyword: "Oak Lawn Dallas apartments",
    highlight:
      "See Oak Lawn apartment specials beside normal rent so renters can compare the real value before touring.",
    sections: [
      {
        title: "Compare Oak Lawn apartment deals",
        text: "Use the search page to compare available Oak Lawn properties by rent, specials, beds, and map location.",
      },
      {
        title: "Ask better questions before applying",
        text: "The listing experience keeps fees, special timing, and normal rent in view so renters know what to confirm with the property.",
      },
    ],
    relatedLinks: [
      { label: "Uptown Dallas apartments", to: "/apartments/dallas-tx/uptown" },
      { label: "Victory Park apartments", to: "/apartments/dallas-tx/victory-park" },
      { label: "8 weeks free apartments", to: "/apartments/dallas-tx/8-weeks-free" },
    ],
  },
  "bishop-arts": {
    title: "Bishop Arts Dallas Apartments With Specials",
    eyebrow: "Bishop Arts apartment search",
    description:
      "Find Bishop Arts Dallas apartments and nearby rent specials with transparent pricing, bedroom filters, and map search.",
    searchLabel: "Search Bishop Arts",
    searchUrl: "/properties?search=Bishop%20Arts%20Dallas",
    primaryKeyword: "Bishop Arts Dallas apartments",
    highlight:
      "Search Bishop Arts and nearby Dallas apartment options by specials, rent range, and available bedroom type.",
    sections: [
      {
        title: "Look beyond the headline rent",
        text: "Compare normal rent, estimated effective rent, and active specials so you can understand what the listing is really offering.",
      },
      {
        title: "Use the map to stay near the area you want",
        text: "The property search map helps renters narrow results around Bishop Arts and nearby neighborhoods without losing deal transparency.",
      },
    ],
    relatedLinks: [
      { label: "Downtown Dallas apartments", to: "/apartments/dallas-tx/downtown" },
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
      { label: "All Dallas apartments", to: "/apartments/dallas-tx" },
    ],
  },
  "victory-park": {
    title: "Victory Park Dallas Apartments With Specials",
    eyebrow: "Victory Park apartment deals",
    description:
      "Search Victory Park Dallas apartments with current rent specials, effective rent estimates, and renter-friendly comparison tools.",
    searchLabel: "Search Victory Park",
    searchUrl: "/properties?search=Victory%20Park%20Dallas",
    primaryKeyword: "Victory Park Dallas apartments",
    highlight:
      "Compare Victory Park apartments by current specials, effective rent, normal rent, and available bedroom ranges.",
    sections: [
      {
        title: "Compare apartments near Victory Park",
        text: "Use filtered results to focus on the floor plans and specials that match your budget before scheduling tours.",
      },
      {
        title: "Keep specials transparent",
        text: "Below Market Apartments highlights specials without hiding the normal rent renters may still owe monthly.",
      },
    ],
    relatedLinks: [
      { label: "Uptown Dallas apartments", to: "/apartments/dallas-tx/uptown" },
      { label: "Oak Lawn apartments", to: "/apartments/dallas-tx/oak-lawn" },
      { label: "Downtown Dallas apartments", to: "/apartments/dallas-tx/downtown" },
    ],
  },
  downtown: {
    title: "Downtown Dallas Apartments With Specials",
    eyebrow: "Downtown Dallas apartment search",
    description:
      "Browse Downtown Dallas apartments with rent specials, effective rent estimates, map search, and bedroom-based filters.",
    searchLabel: "Search Downtown Dallas",
    searchUrl: "/properties?search=Downtown%20Dallas",
    primaryKeyword: "Downtown Dallas apartments",
    highlight:
      "Find Downtown Dallas listings and compare specials with the normal rent, effective rent, and floor-plan details side by side.",
    sections: [
      {
        title: "Search Downtown Dallas by value",
        text: "Use the search experience to compare available apartment deals by price, beds, specials, and map area.",
      },
      {
        title: "Know what to confirm before touring",
        text: "Renters can review estimated effective rent, active specials, and fee questions before deciding which properties are worth a tour.",
      },
    ],
    relatedLinks: [
      { label: "Victory Park apartments", to: "/apartments/dallas-tx/victory-park" },
      { label: "Uptown Dallas apartments", to: "/apartments/dallas-tx/uptown" },
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
    ],
  },
};
const DALLAS_INTERNAL_LINKS = [
  { label: "Dallas apartments", to: "/apartments/dallas-tx" },
  { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
  { label: "8 weeks free apartments", to: "/apartments/dallas-tx/8-weeks-free" },
  { label: "Uptown Dallas", to: "/apartments/dallas-tx/uptown" },
  { label: "Oak Lawn", to: "/apartments/dallas-tx/oak-lawn" },
  { label: "Bishop Arts", to: "/apartments/dallas-tx/bishop-arts" },
  { label: "Victory Park", to: "/apartments/dallas-tx/victory-park" },
  { label: "Downtown Dallas", to: "/apartments/dallas-tx/downtown" },
];

export default function DallasSeoLandingPage() {
  const { pageType = "dallas-tx" } = useParams();
  const page = DALLAS_LANDING_PAGES[pageType];
  const [properties, setProperties] = useState([]);

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

  useEffect(() => {
    let isMounted = true;

    getAllProperties()
      .then((savedProperties) => {
        if (isMounted) setProperties(savedProperties);
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) setProperties([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!page) {
    return <Navigate to="/apartments/dallas-tx" replace />;
  }

  const pageFaqs = getPageFaqs(page);
  const featuredProperties = getSeoLandingProperties(properties, pageType);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pageFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-[#f5f8f1] text-[#102426]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
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

        <section className="mt-8 rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black text-[#1f6f63]">
                Live Dallas listings
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#102426]">
                Apartments currently matching this search
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#526260]">
                These live property pages give renters direct access to floor plans, specials, photos, location details, and effective-rent estimates.
              </p>
            </div>

            <Link
              to={page.searchUrl}
              className="inline-flex w-fit items-center gap-2 rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-black text-white hover:bg-[#102426]"
            >
              View all matches
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {featuredProperties.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredProperties.map((property) => (
                <LandingPropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-[#f5f8f1] p-5">
              <p className="text-sm font-bold text-[#526260]">
                Live matches are being refreshed. Use the search page to view all available Dallas properties and current specials.
              </p>
            </div>
          )}
        </section>

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

        <section className="mt-8 border-t border-[#d7e6df] pt-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-black text-[#1f6f63]">
                Renter deal guide
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#102426]">
                What to know before comparing {page.primaryKeyword}.
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#526260]">
                Quick answers about specials, normal rent, effective value, and fees before a renter chooses which properties are worth touring.
              </p>
            </div>

            <div className="flex max-w-3xl flex-wrap gap-2">
              {DALLAS_INTERNAL_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#edf4ef]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {pageFaqs.map((faq) => (
              <SeoFaqCard
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
              />
            ))}
          </div>
        </section>

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

function getPageFaqs(page) {
  return [
    {
      question: `How should renters compare ${page.primaryKeyword}?`,
      answer:
        "Compare normal rent, estimated effective rent, bedroom type, active special, and required fees together. A lower effective value is helpful, but renters should confirm the actual monthly amount due before applying.",
    },
    {
      question: "Do weeks-free specials lower the monthly payment?",
      answer:
        "Not always. Many properties apply the special as an account credit, upfront credit, or concession across the lease. The renter may still owe normal rent plus required monthly fees each month.",
    },
    {
      question: "Why does the listing show both normal rent and effective rent?",
      answer:
        "Normal rent shows the rent basis before the special. Effective rent estimates the value of the special across the lease so renters can compare deals without confusing it with the actual monthly bill.",
    },
    {
      question: "What should renters ask before touring?",
      answer:
        "Ask if the special is active for the exact unit, whether it applies to base rent only, how the credit is applied, what fees are required, and whether the unit is still available.",
    },
  ];
}

function SeoFaqCard({ question, answer }) {
  return (
    <article className="rounded-2xl border border-[#d7e6df] bg-white p-4 shadow-sm">
      <h3 className="text-sm font-black leading-5 text-[#102426]">{question}</h3>
      <p className="mt-2 text-xs font-semibold leading-5 text-[#526260]">
        {answer}
      </p>
    </article>
  );
}

function LandingPropertyCard({ property }) {
  const address = [property.address, property.city, property.state, property.zipcode]
    .filter(Boolean)
    .join(", ");
  const special = getPropertySpecialLabel(property);
  const price = property.effectiveRent || property.startingRent || property.rent || "Contact for pricing";
  const bedroomLabel = Array.isArray(property.bedrooms) && property.bedrooms.length > 0
    ? property.bedrooms.join(" - ")
    : getFloorPlanBedroomSummary(property);

  return (
    <article className="rounded-2xl border border-[#d7e6df] bg-[#f5f8f1] p-5">
      <p className="text-xs font-black uppercase text-[#1f6f63]">
        {special ? "Current special" : "Live listing"}
      </p>
      <h3 className="mt-2 text-lg font-black text-[#102426]">
        {property.name}
      </h3>
      <p className="mt-2 text-sm font-semibold leading-5 text-[#526260]">
        {address || "Dallas, TX"}
      </p>
      <div className="mt-4 grid gap-2">
        <SeoPropertyMetric label="Price" value={price} />
        <SeoPropertyMetric label="Bedrooms" value={bedroomLabel || "Floor plans listed"} />
        <SeoPropertyMetric label="Special" value={special || "Ask about current specials"} />
      </div>
      <Link
        to={`/properties/${property.id}`}
        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#edf4ef]"
      >
        View property
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

function SeoPropertyMetric({ label, value }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <p className="text-[11px] font-black uppercase text-[#526260]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#102426]">{value}</p>
    </div>
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

function getSeoLandingProperties(properties, pageType) {
  return properties
    .filter((property) => property.status === "Live")
    .filter((property) => matchesLandingPage(property, pageType))
    .sort((firstProperty, secondProperty) => {
      const firstHasSpecial = getPropertySpecialLabel(firstProperty) ? 1 : 0;
      const secondHasSpecial = getPropertySpecialLabel(secondProperty) ? 1 : 0;

      return secondHasSpecial - firstHasSpecial;
    })
    .slice(0, 6);
}

function matchesLandingPage(property, pageType) {
  const haystack = [
    property.name,
    property.address,
    property.city,
    property.neighborhood,
    property.area,
    property.special,
    property.description,
    ...(property.floorPlans || []).flatMap((floorPlan) => [
      floorPlan.name,
      floorPlan.beds,
      floorPlan.bedrooms,
      floorPlan.special?.label,
      floorPlan.currentSpecial,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (pageType === "8-weeks-free") {
    return /8\s*weeks|eight\s*weeks/.test(haystack);
  }

  if (pageType === "specials") {
    return Boolean(getPropertySpecialLabel(property));
  }

  const areaKeywords = {
    uptown: ["uptown"],
    "oak-lawn": ["oak lawn", "turtle creek"],
    "bishop-arts": ["bishop arts", "oak cliff"],
    "victory-park": ["victory park"],
    downtown: ["downtown"],
  };
  const keywords = areaKeywords[pageType];

  if (keywords) {
    return keywords.some((keyword) => haystack.includes(keyword));
  }

  return haystack.includes("dallas") || property.state === "TX";
}

function getPropertySpecialLabel(property) {
  return (
    property.special ||
    (property.floorPlans || [])
      .map((floorPlan) => floorPlan.special?.label || floorPlan.currentSpecial)
      .find(Boolean) ||
    ""
  );
}

function getFloorPlanBedroomSummary(property) {
  const bedrooms = [
    ...new Set(
      (property.floorPlans || [])
        .map((floorPlan) => floorPlan.beds || floorPlan.bedrooms)
        .filter(Boolean)
    ),
  ];

  if (bedrooms.length === 0) return "";
  if (bedrooms.length === 1) return bedrooms[0];

  return `${bedrooms[0]} - ${bedrooms[bedrooms.length - 1]}`;
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
