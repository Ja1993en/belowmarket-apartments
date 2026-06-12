import { Link } from "react-router-dom";

const updatedDate = "June 12, 2026";

export function PrivacyPolicyPage() {
  return (
    <LegalShell
      eyebrow="Privacy Policy"
      title="Below Market Apartments Privacy Policy"
      intro="This policy explains what information Below Market Apartments collects, how it is used, and how renters can control text message communication."
    >
      <LegalSection title="Information We Collect">
        <p>
          We may collect your name, phone number, apartment preferences, budget,
          desired location, bedroom count, tour interest, and messages you send
          through Below Market Apartments.
        </p>
        <p>
          If you use the website as an admin or property contact, we may collect
          property information, floor plan details, specials, photos, and related
          listing data you submit.
        </p>
      </LegalSection>

      <LegalSection title="How We Use Information">
        <p>
          We use renter information to send requested apartment recommendations,
          listing links, tour follow-ups, and related service messages. We use
          property information to display apartment listings, specials, pricing,
          photos, and availability details on the website.
        </p>
      </LegalSection>

      <LegalSection title="Text Messages">
        <p>
          If you submit your phone number, Below Market Apartments may text you
          apartment recommendations and follow-up messages related to your
          request. Message frequency varies based on your apartment search and
          communication with us. Message and data rates may apply.
        </p>
        <p>
          You can reply <strong>STOP</strong> to opt out of text messages or
          reply <strong>HELP</strong> for help.
        </p>
      </LegalSection>

      <LegalSection title="No Selling or Third-Party Marketing Sharing">
        <p>
          We do not sell your personal information. We do not share your phone
          number or SMS consent with third parties for their own marketing
          purposes.
        </p>
      </LegalSection>

      <LegalSection title="Service Providers">
        <p>
          We may use service providers, including hosting, database, messaging,
          analytics, and communication tools, to operate Below Market Apartments.
          These providers are used to help deliver the requested service.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          For help with Below Market Apartments messages, reply{" "}
          <strong>HELP</strong> to a text message or visit the renter request
          page.
        </p>
      </LegalSection>
    </LegalShell>
  );
}

export function TermsAndConditionsPage() {
  return (
    <LegalShell
      eyebrow="Terms and Conditions"
      title="Below Market Apartments Terms and Conditions"
      intro="These terms explain how the Below Market Apartments website and text message program work."
    >
      <LegalSection title="Program Description">
        <p>
          Below Market Apartments helps renters receive apartment
          recommendations, property links, special information, pricing context,
          and tour follow-up messages based on the renter's request.
        </p>
      </LegalSection>

      <LegalSection title="SMS Terms">
        <p>
          By submitting your phone number through Below Market Apartments, you
          agree to receive text messages from Below Market Apartments related to
          your apartment search, recommendations, property links, specials, and
          tour assistance.
        </p>
        <p>
          Message frequency varies. Message and data rates may apply. Consent is
          not a condition of purchasing or renting an apartment.
        </p>
      </LegalSection>

      <LegalSection title="Opt Out and Help">
        <p>
          You can reply <strong>STOP</strong> to opt out at any time. You can
          reply <strong>HELP</strong> for help.
        </p>
      </LegalSection>

      <LegalSection title="Apartment Information">
        <p>
          Apartment pricing, specials, fees, availability, school information,
          and market details may change. Renters should confirm all information
          directly with the property before applying, touring, or signing a
          lease.
        </p>
      </LegalSection>

      <LegalSection title="Privacy">
        <p>
          Please review our{" "}
          <Link className="font-black text-[#1f6f63] underline" to="/privacy-policy">
            Privacy Policy
          </Link>{" "}
          to understand how information is collected and used.
        </p>
      </LegalSection>
    </LegalShell>
  );
}

function LegalShell({ eyebrow, title, intro, children }) {
  return (
    <main className="min-h-screen bg-[#f5f8f1] text-left text-[#102426]">
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
                Transparent apartment recommendations
              </span>
            </span>
          </Link>

          <Link
            to="/"
            className="rounded-2xl bg-[#f2b84b] px-4 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
          >
            Home
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

function LegalSection({ title, children }) {
  return (
    <section className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-[#102426]">{title}</h2>
      <div className="mt-3 grid gap-3 text-sm font-semibold leading-6 text-[#526260]">
        {children}
      </div>
    </section>
  );
}
