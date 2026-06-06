import { supabase } from "./supabaseClient";

export async function saveSupabaseTourRequest(tourRequest) {
  const { error } = await supabase.from("tour_requests").insert({
    lead_id: tourRequest.leadId,
    lead_name: tourRequest.leadName,
    property_id: tourRequest.propertyId,
    property_name: tourRequest.propertyName,
    preferred_date: tourRequest.preferredDate,
    preferred_time: tourRequest.preferredTime,
    message: tourRequest.message,
    status: tourRequest.status || "New",
    event_type: tourRequest.eventType || "tour_request",
  });

  if (error) {
    throw error;
  }
}

export async function getSupabaseTourRequestsForLead(leadId) {
  const { data, error } = await supabase
    .from("tour_requests")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((request) => ({
    id: request.id,
    leadId: request.lead_id,
    leadName: request.lead_name,
    propertyId: request.property_id,
    propertyName: request.property_name,
    preferredDate: request.preferred_date,
    preferredTime: request.preferred_time,
    message: request.message,
    status: request.status,
    eventType: request.event_type,
    createdAt: request.created_at,
    followedUpAt: request.followed_up_at,
  }));
}

export async function updateSupabaseTourRequestStatus(requestId, status) {
  const { error } = await supabase
    .from("tour_requests")
    .update({
      status,
      followed_up_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    throw error;
  }
}


export async function deleteSupabaseTourRequest(requestId) {
  const { error } = await supabase
    .from("tour_requests")
    .delete()
    .eq("id", requestId);

  if (error) {
    throw error;
  }
}