import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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

export default function StartPage() {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get("property");
  const sourceProperty = propertyId ? getAnyPropertyById(propertyId) : null;
  const [submitted, setSubmitted] = useState(false);
  const [createdLeadId, setCreatedLeadId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      priority: "Medium",
      source: "Start page",
      sourcePropertyId: sourceProperty?.id || null,
      sourcePropertyName: sourceProperty?.name || null,

      assignedTo: "Unassigned",
      lastTouch: "Just now",
      notes: form.notes || "No notes added yet.",
      recommendedPropertyIds: [],
      token: `lead-${Date.now()}`,
      contactMethod: form.contactMethod || "Not selected",
      createdAt: new Date().toISOString(),
    };

    try {
      setIsSubmitting(true);

      const savedLead = await saveSupabaseLead(leadPayload);

      setCreatedLeadId(savedLead.id);
      setSubmitted(true);
    } catch (error) {
      console.error(error);

      if (isLocalFallbackEnabled) {
        saveLocalLead(leadPayload);
        setCreatedLeadId(leadPayload.id);
        setSubmitted(true);
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
    <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Link>

        <section className="mt-6 rounded-3xl bg-slate-950 p-6 text-white shadow-sm md:p-8">
          <p className="text-sm font-bold text-slate-300">
            Apartment Search Intake
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Tell us what you are looking for.
          </h1>

          <p className="mt-4 max-w-2xl text-slate-300">
            Share your apartment preferences and a locator can help match you with current below-market deals.
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {submitted ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-700" />
              </div>

              <h2 className="mt-5 text-3xl font-black text-slate-900">
                Request received
              </h2>

              <p className="mx-auto mt-2 max-w-xl text-slate-500">
                Your renter profile has been captured locally for now. Later this will save directly into Supabase.
              </p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                {createdLeadId && (
                  <Link
                    to={`/admin/leads/${createdLeadId}`}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                  >
                    View Lead Profile
                  </Link>
                )}

                <Link
                  to="/admin/leads"
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                >
                  View Admin Leads
                </Link>
                <button
                  onClick={resetForm}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  Start Another Search
                </button>

                <Link
                  to="/"
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  Browse Properties
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {sourceProperty && (
                <div className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                  Interested in {sourceProperty.name}
                </div>
              )}
              {formError && (
                <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
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
                <label className="text-sm font-bold text-slate-700">
                  Notes
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) => handleChange("notes", event.target.value)}
                  rows={5}
                  placeholder="Tell us about must-haves, pets, parking, work location, or timing..."
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
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
      <span className="text-sm font-bold text-slate-700">{label}</span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, required = false }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
      >
        <option value="">Select one</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
