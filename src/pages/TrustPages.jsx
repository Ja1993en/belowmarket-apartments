import { useEffect } from "react";
import { Link } from "react-router-dom";

const updatedDate = "June 15, 2026";

export function AboutPage() {
  useTrustPageSeo({
    title: "About Below Market Apartments | Dallas Apartment Specials",
    description:
      "Learn how Below Market Apartments helps Dallas-area renters compare apartment specials, normal rent, effective rent, floor plans, and move-in details.",
    path: "/about",
  });

  return (
    <TrustShell
      eyebrow="About"
      title="Apartment specials should be easier to compare."
      intro="Below Market Apartments helps renters shop Dallas-area apartments by current specials, normal rent, estimated effective rent, floor plans, photos, and local context."
    >
      <TrustSection title="Who We Help">
        <p>
          Below Market Apartments is built for renters searching Dallas,
          Farmers Branch, Irving, Las Colinas, Oak Lawn, Uptown, Turtle Creek,
          West Dallas, Deep Ellum, North Dallas, and nearby areas.
        </p>
        <p>
          The goal is simple: make it easier to compare move-in specials
          without losing sight of the normal rent, required fees, exact floor
          plan, and lease details that matter before applying.
        </p>
      </TrustSection>

      <TrustSection title="What Makes The Site Different">
        <TrustList
          items={[
            "Specials are shown beside normal rent instead of replacing it.",
            "Effective rent estimates explain the value of weeks-free and rent-credit offers.",
            "Property pages include floor plans, photos, map context, and renter questions to confirm before touring.",
            "Search pages focus on high-intent renter searches like 8 weeks free, no deposit, waived admin fee, and Dallas-area neighborhood specials.",
          ]}
        />
      </TrustSection>

      <TrustSection title="Important Apartment Disclaimer">
        <p>
          Apartment pricing, specials, fees, availability, photos, school
          information, and policies can change quickly. Renters should confirm
          details directly with the property before applying, touring, or
          signing a lease.
        </p>
      </TrustSection>
    </TrustShell>
  );
}

export function ContactPage() {
  useTrustPageSeo({
    title: "Contact Below Market Apartments | Dallas Apartment Help",
    description:
      "Contact Below Market Apartments for help comparing Dallas apartment specials, effective rent, floor plans, and move-in offers.",
    path: "/contact",
  });

  return (
    <TrustShell
      eyebrow="Contact"
      title="Need help comparing apartment specials?"
      intro="Send your apartment preferences and we can help you compare current Dallas-area specials, floor plans, and renter questions to confirm before touring."
    >
      <TrustSection title="Contact Information">
        <div className="grid gap-3 md:grid-cols-2">
          <ContactCard label="Phone or text" value="945-269-3768" />
          <ContactCard label="Service area" value="Dallas, Farmers Branch, Irving, Las Colinas, and nearby areas" />
        </div>
      </TrustSection>

      <TrustSection title="Start An Apartment Search">
        <p>
          The fastest way to request help is to submit your preferred area,
          budget, bedroom count, move-in timing, and must-haves.
        </p>
        <Link
          to="/start"
          className="mt-4 inline-flex w-fit rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
        >
          Start Apartment Search
        </Link>
      </TrustSection>

      <TrustSection title="What To Include">
        <TrustList
          items={[
            "Preferred Dallas-area neighborhood or city",
            "Budget and bedroom count",
            "Move-in date or timing window",
            "Pets, parking, commute needs, or must-have amenities",
            "Whether you care most about lowest upfront cost, best special, or best monthly value",
          ]}
        />
      </TrustSection>
    </TrustShell>
  );
}

export function MethodologyPage() {
  useTrustPageSeo({
    title: "How Effective Rent Is Calculated | Below Market Apartments",
    description:
      "See how Below Market Apartments estimates effective rent, compares weeks-free specials, rent credits, waived fees, and normal rent for Dallas apartment listings.",
    path: "/methodology",
  });

  return (
    <TrustShell
      eyebrow="Methodology"
      title="How we compare apartment specials."
      intro="Specials can be confusing. This page explains how Below Market Apartments thinks about normal rent, effective rent, weeks free, rent credits, and move-in fee specials."
    >
      <TrustSection title="Normal Rent">
        <p>
          Normal rent is the listed base rent or monthly rent basis before a
          concession is spread across the lease. It is important because many
          properties still bill monthly rent from the normal rent amount, even
          when a special is active.
        </p>
      </TrustSection>

      <TrustSection title="Estimated Effective Rent">
        <p>
          Estimated effective rent spreads the advertised value of a special
          across the lease term to help renters compare one offer against
          another. It is a comparison estimate, not always the exact monthly
          amount due.
        </p>
        <div className="mt-4 rounded-2xl bg-[#f5f8f1] p-4 text-sm font-black text-[#102426]">
          Estimated effective rent = normal rent minus estimated monthly value
          of the concession
        </div>
      </TrustSection>

      <TrustSection title="How Weeks-Free Specials Are Estimated">
        <p>
          For weeks-free specials, the estimated concession value is usually
          based on the listed rent multiplied by the free-rent period, then
          spread across the lease term. For example, 8 weeks free is treated as
          roughly 2 months of rent value over a 12-month lease unless better
          property-specific details are available.
        </p>
      </TrustSection>

      <TrustSection title="Fee And Deposit Specials">
        <p>
          Waived admin fees, waived application fees, deposit specials, and
          move-in credits can reduce upfront cost, but they are not the same as
          lowering monthly rent. Renters should confirm exactly which fees are
          waived and whether any deposit alternative or qualification rule
          applies.
        </p>
      </TrustSection>

      <TrustSection title="What Renters Should Confirm">
        <TrustList
          items={[
            "Whether the special is still active for the exact unit",
            "Whether the special applies to base rent only",
            "How and when the credit is applied",
            "Required monthly fees, parking, utilities, trash, package, and amenity charges",
            "Application fee, admin fee, deposit, deposit alternative, and pet fees",
            "The lease term required to receive the advertised special",
          ]}
        />
      </TrustSection>
    </TrustShell>
  );
}

function useTrustPageSeo({ description, path, title }) {
  useEffect(() => {
    const previousTitle = document.title;
    const descriptionMeta = document.querySelector("meta[name='description']");
    const canonicalLink = document.querySelector("link[rel='canonical']");
    const ogTitleMeta = document.querySelector("meta[property='og:title']");
    const ogDescriptionMeta = document.querySelector("meta[property='og:description']");
    const ogUrlMeta = document.querySelector("meta[property='og:url']");
    const twitterTitleMeta = document.querySelector("meta[name='twitter:title']");
    const twitterDescriptionMeta = document.querySelector("meta[name='twitter:description']");
    const previousDescription = descriptionMeta?.getAttribute("content") || "";
    const previousCanonical = canonicalLink?.getAttribute("href") || "";
    const previousOgTitle = ogTitleMeta?.getAttribute("content") || "";
    const previousOgDescription = ogDescriptionMeta?.getAttribute("content") || "";
    const previousOgUrl = ogUrlMeta?.getAttribute("content") || "";
    const previousTwitterTitle = twitterTitleMeta?.getAttribute("content") || "";
    const previousTwitterDescription = twitterDescriptionMeta?.getAttribute("content") || "";
    const canonicalUrl = `https://belowmarketapartments.com${path}`;

    document.title = title;
    descriptionMeta?.setAttribute("content", description);
    canonicalLink?.setAttribute("href", canonicalUrl);
    ogTitleMeta?.setAttribute("content", title);
    ogDescriptionMeta?.setAttribute("content", description);
    ogUrlMeta?.setAttribute("content", canonicalUrl);
    twitterTitleMeta?.setAttribute("content", title);
    twitterDescriptionMeta?.setAttribute("content", description);

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
  }, [description, path, title]);
}

function TrustShell({ eyebrow, title, intro, children }) {
  return (
    <main className="min-h-screen bg-[#f5f8f1] text-[#102426]">
      <header className="border-b border-[#d7e6df] bg-white/95 px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#173f3f] text-sm font-black text-[#f2b84b]">
              BMA
            </span>
            <span>
              <span className="block text-lg font-black leading-5">
                Below Market Apartments
              </span>
              <span className="text-xs font-bold text-[#526260]">
                Dallas apartment specials
              </span>
            </span>
          </Link>

          <Link
            to="/properties"
            className="rounded-2xl bg-[#f2b84b] px-4 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
          >
            Search
          </Link>
        </div>
      </header>

      <section className="border-b-[6px] border-[#f2b84b] bg-[#173f3f] px-4 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="w-fit rounded-full bg-[#f2b84b]/15 px-4 py-2 text-sm font-black text-[#f9d783]">
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black text-[#fff7df] md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[#d7ece6]">
            {intro}
          </p>
          <p className="mt-3 text-sm font-bold text-[#f9d783]">
            Last updated: {updatedDate}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-8">
        {children}
      </section>
    </main>
  );
}

function TrustSection({ title, children }) {
  return (
    <section className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-[#102426]">{title}</h2>
      <div className="mt-3 grid gap-3 text-sm font-semibold leading-6 text-[#526260]">
        {children}
      </div>
    </section>
  );
}

function TrustList({ items }) {
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item} className="rounded-2xl bg-[#f5f8f1] p-4 text-sm font-bold text-[#102426]">
          {item}
        </li>
      ))}
    </ul>
  );
}

function ContactCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#f5f8f1] p-4">
      <p className="text-xs font-black uppercase text-[#526260]">{label}</p>
      <p className="mt-2 text-base font-black text-[#102426]">{value}</p>
    </div>
  );
}
