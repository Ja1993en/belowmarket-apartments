import { supabase } from "./supabaseClient";

function mapLeadEvent(row) {
  return {
    id: row.id,
    leadId: row.lead_id,
    eventType: row.event_type,
    propertyId: row.property_id,
    propertyName: row.property_name,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

export async function getSupabaseLeadEvents({ limit = 50 } = {}) {
  const { data, error } = await supabase
    .from("lead_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []).map(mapLeadEvent);
}

export async function getSupabaseLeadEventsForLead(leadId, { limit = 50 } = {}) {
  if (!leadId) return [];

  const { data, error } = await supabase
    .from("lead_events")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []).map(mapLeadEvent);
}

export async function saveLeadEvent({
  leadId,
  eventType,
  propertyId = null,
  propertyName = null,
  metadata = {},
}) {
  if (!leadId || !eventType) return;

  const { error } = await supabase.from("lead_events").insert({
    lead_id: leadId,
    event_type: eventType,
    property_id: propertyId,
    property_name: propertyName,
    metadata,
  });

  if (error) {
    throw error;
  }
}

export function saveLeadEventInBackground(event) {
  saveLeadEvent(event).catch((error) => {
    console.warn("Lead event was not saved.", error);
  });
}
