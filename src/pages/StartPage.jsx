import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { saveLocalLead } from "../data/leadStorage";
import { saveSupabaseLead } from "../data/supabaseLeadStorage";
import { isLocalFallbackEnabled } from "../data/supabaseClient";
import { getAnyPropertyById } from "../data/propertyStorage";
const emptyForm = {
  name: "",
  phone: "",
  email: "",
  area: "",
  bedrooms: "",
  budget: "",
  moveIn: "",
  contactMethod: "",
  notes: "",
};

function getTrackingValue(searchParams, key) {
  return searchParams.get(key)?.trim() || "";
}

function getAdTracking(searchParams) {
  const utmSource = getTrackingValue(searchParams, "utm_source");
  const utmMedium = getTrackingValue(searchParams, "utm_medium");
  const utmCampaign = getTrackingValue(searchParams, "utm_campaign");
  const utmTerm = getTrackingValue(searchParams, "utm_term");
  const utmContent = getTrackingValue(searchParams, "utm_content");
  const gclid = getTrackingValue(searchParams, "gclid");

  return {
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    gclid,
    landingPage: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || "",
    hasPaidTracking:
      Boolean(gclid) ||
      utmSource.toLowerCase() === "google" ||
      utmMedium.toLowerCase().includes("paid") ||
      utmMedium.toLowerCase().includes("cpc"),
  };
}

async function sendLeadNotification(lead) {
  try {
    const response = await fetch("/api/send-lead-email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...lead,
        adminUrl: `${window.location.origin}/admin/leads/${lead.id}`,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      console.warn(body.error || "Lead email notification was not sent.");
    }
  } catch (error) {
    console.warn("Lead email notification was not sent.", error);
  }
}

export default function StartPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const propertyId = searchParams.get("property");
  const [sourceProperty, setSourceProperty] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [createdLeadId, setCreatedLeadId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    let isMounted = true;

    if (!propertyId) {
      const clearTimer = window.setTimeout(() => {
        if (isMounted) setSourceProperty(null);
      }, 0);

      return () => {
        isMounted = false;
        window.clearTimeout(clearTimer);
      };
    }

    getAnyPropertyById(propertyId)
      .then((savedProperty) => {
        if (isMounted) setSourceProperty(savedProperty);
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) setSourceProperty(null);
      });

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  const handleChange = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name || !form.phone || !form.email || !form.area || !form.bedrooms || !form.budget || !form.moveIn) {
      setFormError("Please complete all required fields before submitting.");
      return;
    }

    setFormError("");
    const adTracking = getAdTracking(searchParams);

    const leadPayload = {
      id: `local-${Date.now()}`,
      name: form.name,
      phone: form.phone,
      email: form.email,
      preference: `${form.bedrooms} - ${form.area} - ${form.budget} budget`,
      bedrooms: form.bedrooms,
      budget: form.budget,
      moveIn: form.moveIn,
      status: "New Lead",
      quality: "New",
      priority: "Medium",
      source: adTracking.hasPaidTracking ? "Google Ads" : "Start page",
      sourcePropertyId: sourceProperty?.id || null,
      sourcePropertyName: sourceProperty?.name || null,

      assignedTo: "Unassigned",
      lastTouch: "Just now",
      notes: form.notes || "No notes added yet.",
      recommendedPropertyIds: [],
      token: `lead-${Date.now()}`,
      contactMethod: form.contactMethod || "Not selected",
      createdAt: new Date().toISOString(),
      utmSource: adTracking.utmSource,
      utmMedium: adTracking.utmMedium,
      utmCampaign: adTracking.utmCampaign,
      utmTerm: adTracking.utmTerm,
      utmContent: adTracking.utmContent,
      gclid: adTracking.gclid,
      landingPage: adTracking.landingPage,
      referrer: adTracking.referrer,
    };

    try {
      setIsSubmitting(true);

      const savedLead = await saveSupabaseLead(leadPayload);

      setCreatedLeadId(savedLead.id);
      setSubmitted(true);
      await sendLeadNotification({
        ...leadPayload,
        ...savedLead,
      });
      navigate("/thank-you");
    } catch (error) {
      console.error(error);

      if (isLocalFallbackEnabled) {
        saveLocalLead(leadPayload);
        setCreatedLeadId(leadPayload.id);
        setSubmitted(true);
        await sendLeadNotification(leadPayload);
        navigate("/thank-you");
        return;
      }

      setFormError("Something went wrong while saving your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setCreatedLeadId(null);
    setSubmitted(false);
  };

  return (
    <main className="min-h-screen bg-[#f5f8f1] p-6 text-[#102426]">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#173f3f] shadow-sm ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Link>

        <section className="mt-6 rounded-3xl bg-[#102426] p-6 text-white shadow-sm md:p-8">
          <p className="text-sm font-black text-[#f2b84b]">
            Apartment Search Intake
          </p>

          <h1 className="mt-3 text-4xl font-black text-[#fff7df] md:text-5xl">
            Tell us what you are looking for.
          </h1>

          <p className="mt-4 max-w-2xl font-semibold leading-7 text-[#d7ece6]">
            Share your apartment preferences and a locator can help match you with current below-market deals.
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
          {submitted ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#d8efe6]">
                <CheckCircle2 className="h-8 w-8 text-[#1f6f63]" />
              </div>

              <h2 className="mt-5 text-3xl font-black text-[#102426]">
                Request received
              </h2>

              <p className="mx-auto mt-2 max-w-xl font-semibold text-[#526260]">
                Your renter profile has been saved to the database.
              </p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                {createdLeadId && (
                  <Link
                    to={`/admin/leads/${createdLeadId}`}
                    className="rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
                  >
                    View Lead Profile
                  </Link>
                )}

                <Link
                  to="/admin/leads"
                  className="rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426]"
                >
                  View Admin Leads
                </Link>
                <button
                  onClick={resetForm}
                  className="rounded-2xl bg-[#e7f3ee] px-5 py-3 text-sm font-bold text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#d7e6df]"
                >
                  Start Another Search
                </button>

                <Link
                  to="/"
                  className="rounded-2xl bg-[#e7f3ee] px-5 py-3 text-sm font-bold text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#d7e6df]"
                >
                  Browse Properties
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {sourceProperty && (
                <div className="mb-5 rounded-2xl bg-[#d8efe6] p-4 text-sm font-bold text-[#1f6f63] ring-1 ring-[#a9cfc2]">
                  Interested in {sourceProperty.name}
                </div>
              )}
              {formError && (
                <div className="mb-5 rounded-2xl bg-[#fde8df] p-4 text-sm font-bold text-[#b33818] ring-1 ring-[#f4b39f]">
                  {formError}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Full Name"
                  value={form.name}
                  onChange={(value) => handleChange("name", value)}
                  placeholder="Ashley Brown"
                  required
                />

                <Field
                  label="Phone"
                  value={form.phone}
                  onChange={(value) => handleChange("phone", value)}
                  placeholder="(214) 555-0144"
                  required
                />

                <Field
                  label="Email"
                  value={form.email}
                  onChange={(value) => handleChange("email", value)}
                  placeholder="ashley@example.com"
                  type="email"
                  required
                />

                <Field
                  label="Preferred Area"
                  value={form.area}
                  onChange={(value) => handleChange("area", value)}
                  placeholder="Uptown Dallas"
                  required
                />

                <SelectField
                  label="Bedrooms"
                  value={form.bedrooms}
                  onChange={(value) => handleChange("bedrooms", value)}
                  options={["Studio", "1 Bed", "2 Bed", "3 Bed"]}
                  required
                />

                <Field
                  label="Budget"
                  value={form.budget}
                  onChange={(value) => handleChange("budget", value)}
                  placeholder="$1,600"
                  required
                />

                <Field
                  label="Move-in Date"
                  value={form.moveIn}
                  onChange={(value) => handleChange("moveIn", value)}
                  type="date"
                  required
                />

                <SelectField
                  label="Preferred Contact"
                  value={form.contactMethod}
                  onChange={(value) => handleChange("contactMethod", value)}
                  options={["Text", "Call", "Email"]}
                />
              </div>

              <div className="mt-4">
                <label className="text-sm font-bold text-[#526260]">
                  Notes
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) => handleChange("notes", event.target.value)}
                  rows={5}
                  placeholder="Tell us about must-haves, pets, parking, work location, or timing..."
                  className="mt-2 w-full resize-none rounded-2xl border border-[#b8d9d0] bg-white p-4 font-semibold text-[#102426] outline-none placeholder:text-[#78908a] focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-2xl bg-[#f2b84b] px-5 py-4 text-sm font-black text-[#102426] hover:bg-[#f9d783] disabled:cursor-not-allowed disabled:bg-[#d7e6df] disabled:text-[#78908a]"
              >
                {isSubmitting ? "Submitting..." : "Submit Apartment Search"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#526260]">{label}</span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full rounded-2xl border border-[#b8d9d0] bg-white px-4 py-3 font-semibold text-[#102426] outline-none placeholder:text-[#78908a] focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, required = false }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#526260]">{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 w-full rounded-2xl border border-[#b8d9d0] bg-white px-4 py-3 font-semibold text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
      >
        <option value="">Select one</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
