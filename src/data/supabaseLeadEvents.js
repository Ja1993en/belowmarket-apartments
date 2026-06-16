import { supabase } from "./supabaseClient";

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
