import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, ExternalLink, Mail, MessageSquare, Phone } from "lucide-react";
import { getAnyPropertyById } from "../data/propertyStorage";
import { getSupabaseLeadById } from "../data/supabaseLeadStorage";
import {
  getAnyLeadById,
  getTourRequestsForLead,
  saveLeadActivity,
  updateTourRequestStatus,
} from "../data/leadStorage";

export default function LeadMessagePage() {
  const { leadId } = useParams();
  const initialLead = getAnyLeadById(leadId);
  const [lead, setLead] = useState(initialLead);
  const [, setIsLoadingLead] = useState(!initialLead);
  const recommendedProperties = useMemo(
    () =>
      lead
        ? lead.recommendedPropertyIds
          .map((propertyId) => getAnyPropertyById(propertyId))
          .filter(Boolean)
        : [],
    [lead]
  );
  const [tourRequests, setTourRequests] = useState(() =>
      [...getTourRequestsForLead(leadId)].sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
      )
    );
  const latestTourRequest =
    tourRequests.find((request) => (request.status || "New") !== "Followed Up") ||
    tourRequests[0]; const notFollowedUpCount = tourRequests.filter(
      (request) => (request.status || "New") !== "Followed Up"
    ).length;
  const [channel, setChannel] = useState("text");
  const [copiedType, setCopiedType] = useState("");
  useEffect(() => {
    const loadSupabaseLead = async () => {
      if (initialLead) return;

      try {
        setIsLoadingLead(true);

        const supabaseLead = await getSupabaseLeadById(leadId);

        setLead(supabaseLead);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingLead(false);
      }
    };

    loadSupabaseLead();
  }, [leadId, initialLead]);
  const recommendationUrl = lead
    ? `${window.location.origin}/r/${lead.token}`
    : "";

  const messageText = useMemo(() => {
    if (!lead) return "";

    const propertyNames = recommendedProperties
      .map((property) => property.name)
      .join(", ");

    if (channel === "email") {
      if (latestTourRequest) {
        return `Hi ${lead.name},
    
    I saw your tour request${latestTourRequest.preferredDate ? ` for ${latestTourRequest.preferredDate}` : ""}${latestTourRequest.preferredTime ? ` at ${latestTourRequest.preferredTime}` : ""}.
    
    I can help confirm availability and get that tour scheduled. Here is your apartment recommendation list again:
    ${recommendationUrl}
    
    Recommended options:
    ${propertyNames}
    
    Do you want me to confirm this tour time for you?`;
      }

      return `Hi ${lead.name},
    
    I put together a few below-market apartment options that match your search: ${propertyNames}.
    
    You can view the full recommendation list here:
    ${recommendationUrl}
    
    These options include current specials, effective rent estimates, and savings compared to similar apartments nearby.
    
    Let me know which ones you like and I can help schedule tours.`;
    }

    if (latestTourRequest) {
      return `Hi ${lead.name}, I saw your tour request${latestTourRequest.preferredDate ? ` for ${latestTourRequest.preferredDate}` : ""}${latestTourRequest.preferredTime ? ` at ${latestTourRequest.preferredTime}` : ""}. I can help confirm availability and get that tour scheduled. Here is your apartment list again: ${recommendationUrl}`;
    }

    return `Hi ${lead.name}, I found a few below-market apartment options that match your search: ${propertyNames}. You can view them here: ${recommendationUrl}. Let me know which ones you like and I can help schedule tours.`;
  }, [channel, lead, recommendationUrl, recommendedProperties, latestTourRequest]);

  const copyMessage = async () => {
    await navigator.clipboard.writeText(messageText);
    setCopiedType("message");

    setTimeout(() => {
      setCopiedType("");
    }, 2000);
  };

  const copyRenterLink = async () => {
    await navigator.clipboard.writeText(recommendationUrl);
    setCopiedType("link");

    setTimeout(() => {
      setCopiedType("");
    }, 2000);
  };

  const markTourFollowedUp = () => {
    if (!latestTourRequest) return;

    const updatedTourRequests = updateTourRequestStatus(
      leadId,
      latestTourRequest.id,
      "Followed Up"
    );


    saveLeadActivity({
      leadId,
      title: "Tour followed up",
      description: `${latestTourRequest.propertyName || "A property"} follow-up completed.`,
    });

    setTourRequests(
      updatedTourRequests
        .filter((request) => request.leadId === String(leadId))
        .sort((a, b) =>
          String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
        )
    );
  };

  if (!lead) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900">Lead not found</h1>

        <p className="mt-2 text-slate-500">
          This lead ID does not match any lead in your current data.
        </p>

        <Link
          to="/admin/leads"
          className="mt-6 inline-block rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
        >
          Back to Leads
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/admin/leads"
        className="inline-block rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
      >
        Back to Leads
      </Link>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <section>
          <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
            <p className="text-sm font-bold text-slate-300">
              Lead Message
            </p>

            <h1 className="mt-2 text-4xl font-black">
              {lead.name}
            </h1>

            <p className="mt-2 text-slate-300">
              Build a renter-ready message with their recommendation link.
            </p>

            {tourRequests.length > 0 && (
              <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-slate-200">
                {tourRequests.length} tour {tourRequests.length === 1 ? "request" : "requests"}
              </p>
            )}

            {notFollowedUpCount > 0 && (
              <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                {notFollowedUpCount} need follow-up
              </p>
            )}
          </div>

          {latestTourRequest && (
            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
                {(latestTourRequest.status || "New") !== "Followed Up"
                  ? "Next Follow-Up"
                  : "Latest Tour Request"}
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-900">
                Follow-up needed
              </h2>

              <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                <p>
                  <span className="font-bold text-slate-900">Preferred date:</span>{" "}
                  {latestTourRequest.preferredDate || "Not provided"}
                </p>

                <p>
                  <span className="font-bold text-slate-900">Preferred time:</span>{" "}
                  {latestTourRequest.preferredTime || "Not provided"}
                </p>

                <p>
                  <span className="font-bold text-slate-900">Property:</span>{" "}
                  {latestTourRequest.propertyName || "Not provided"}
                </p>

                <p>
                  <span className="font-bold text-slate-900">Request status:</span>{" "}
                  {latestTourRequest.status || "New"}
                </p>
                {latestTourRequest.followedUpAt && (
                  <p>
                    <span className="font-bold text-slate-900">Followed up:</span>{" "}
                    {new Date(latestTourRequest.followedUpAt).toLocaleString()}
                  </p>
                )}
              </div>

              {tourRequests.length > 1 && (
                <div className="mt-5 rounded-2xl bg-white p-4">
                  <p className="text-sm font-black text-slate-900">
                    All tour requests
                  </p>

                  <div className="mt-3 space-y-3">
                    {tourRequests.map((request) => (
                      <div
                        key={request.id || `${request.propertyId}-${request.createdAt}`}
                        className="rounded-xl bg-emerald-50 p-3 text-sm text-slate-700"
                      >
                        <p className="font-bold text-slate-900">
                          {request.propertyName}
                        </p>

                        <p className="mt-1">
                          {request.preferredDate || "No date"} · {request.preferredTime || "No time"}
                        </p>

                        <p className="mt-1 font-bold text-emerald-700">
                          {request.status || "New"}
                        </p>

                        {request.message && (
                          <p className="mt-2 rounded-xl bg-white p-3 font-semibold text-slate-700">
                            {request.message}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {latestTourRequest.message && (
                <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-700">
                  {latestTourRequest.message}
                </p>
              )}

              {latestTourRequest.status !== "Followed Up" && (
                <button
                  type="button"
                  onClick={markTourFollowedUp}
                  className="mt-4 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  Mark Tour Followed Up
                </button>
              )}

              {latestTourRequest.status === "Followed Up" && (
                <p className="mt-4 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600">
                  Latest tour request has been followed up.
                </p>
              )}


              <Link
                to={`/admin/leads/${lead.id}`}
                className="mt-4 inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
              >
                Back to Lead Details
              </Link>
            </div>
          )}


          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Message Draft
                </h2>

                <p className="mt-1 text-slate-500">
                  Choose a channel and copy the message when ready.
                </p>

                {latestTourRequest && (
                  <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    Tour Follow-Up Mode
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-bold text-slate-500">
                  Message Type
                </p>
                <div className="flex rounded-2xl bg-slate-100 p-1">
                  <button
                    onClick={() => setChannel("text")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${channel === "text"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500"
                      }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Text
                  </button>

                  <button
                    onClick={() => setChannel("email")}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${channel === "email"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500"
                      }`}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </button>
                </div>
              </div>

            </div>

            <textarea
              value={messageText}
              readOnly
              rows={channel === "email" ? 12 : 7}
              className="mt-6 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700 outline-none"
            />
            <p className="mt-4 text-sm font-bold text-slate-500">
              Contact Actions
            </p>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={copyMessage}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
                {copiedType === "message" ? "Copied Message!" : "Copy Message"}              </button>

              <button
                onClick={copyRenterLink}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                <Copy className="h-4 w-4" />
                Copy Renter Link
              </button>

              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                <Phone className="h-4 w-4" />
                Call Lead
              </a>
              <a
                href={`mailto:${lead.email}?subject=${encodeURIComponent(
                  "Your apartment recommendations"
                )}&body=${encodeURIComponent(messageText)}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                <Mail className="h-4 w-4" />
                Email Lead
              </a>

              <a
                href={`sms:${lead.phone}?&body=${encodeURIComponent(messageText)}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                <MessageSquare className="h-4 w-4" />
                Text Lead
              </a>

              <Link
                to={`/r/${lead.token}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                <ExternalLink className="h-4 w-4" />
                Preview Renter Page
              </Link>

              <Link
                to={`/admin/leads/${lead.id}/send-properties`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-100 px-5 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-200"
              >
                Edit Property List
              </Link>
              <Link
                to={`/admin/leads/${lead.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                View Lead Details
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">
              Included Properties
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {recommendedProperties.map((property) => (
                <div
                  key={property.id}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <p className="font-black text-slate-900">{property.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {property.area} - {property.special}
                  </p>
                  <p className="mt-2 text-sm font-bold text-emerald-700">
                    Save {property.savings}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">
              Contact Info
            </h2>

            <div className="mt-5 space-y-3">
              <ContactRow icon={Phone} label="Phone" value={lead.phone} />
              <ContactRow icon={Mail} label="Email" value={lead.email} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">
              Lead Details
            </h2>

            <div className="mt-5 space-y-3">
              <InfoRow label="Preference" value={lead.preference} />
              <InfoRow label="Budget" value={lead.budget} />
              <InfoRow label="Move-in" value={lead.moveIn} />
              <InfoRow label="Assigned" value={lead.assignedTo} />
              <InfoRow label="Status" value={lead.status} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">
              Recommendation Link
            </h2>

            <div className="mt-4 break-all rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700">
              {recommendationUrl}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ContactRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
        <Icon className="h-5 w-5 text-slate-700" />
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-900">{value}</p>
    </div>
  );
}
