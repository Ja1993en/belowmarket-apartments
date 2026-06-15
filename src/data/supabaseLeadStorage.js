import { supabase } from "./supabaseClient";

function mapSupabaseLead(lead) {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    preference: lead.preference,
    bedrooms: lead.bedrooms,
    budget: lead.budget,
    moveIn: lead.move_in,
    status: lead.status,
    quality: lead.lead_quality || lead.quality || "New",
    priority: lead.priority,
    source: lead.source,
    sourcePropertyId: lead.source_property_id,
    sourcePropertyName: lead.source_property_name,
    assignedTo: lead.assigned_to,
    lastTouch: lead.last_touch,
    notes: lead.notes,
    recommendedPropertyIds: lead.recommended_property_ids || [],
    recommendedFloorPlanItems: lead.recommended_floor_plan_items || [],
    token: lead.token,
    contactMethod: lead.contact_method,
    createdAt: lead.created_at,
    utmSource: lead.utm_source || "",
    utmMedium: lead.utm_medium || "",
    utmCampaign: lead.utm_campaign || "",
    utmTerm: lead.utm_term || "",
    utmContent: lead.utm_content || "",
    gclid: lead.gclid || "",
    landingPage: lead.landing_page || "",
    referrer: lead.referrer || "",
  };
}

function isMissingTrackingColumnError(error) {
  const message = `${error?.message || ""} ${error?.details || ""}`;

  return (
    error?.code === "PGRST204" ||
    message.includes("utm_source") ||
    message.includes("utm_medium") ||
    message.includes("utm_campaign") ||
    message.includes("utm_term") ||
    message.includes("utm_content") ||
    message.includes("gclid") ||
    message.includes("landing_page") ||
    message.includes("referrer") ||
    message.includes("lead_quality")
  );
}

function isMissingRecommendedFloorPlanColumnError(error) {
  const message = `${error?.message || ""} ${error?.details || ""}`;

  return (
    error?.code === "PGRST204" ||
    message.includes("recommended_floor_plan_items")
  );
}

export async function saveSupabaseLead(lead) {
  const baseLeadPayload = {
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    preference: lead.preference,
    bedrooms: lead.bedrooms,
    budget: lead.budget,
    move_in: lead.moveIn,
    status: lead.status,
    priority: lead.priority,
    source: lead.source,
    source_property_id: lead.sourcePropertyId,
    source_property_name: lead.sourcePropertyName,
    assigned_to: lead.assignedTo,
    last_touch: lead.lastTouch,
    notes: lead.notes,
    recommended_property_ids: lead.recommendedPropertyIds,
    token: lead.token,
    contact_method: lead.contactMethod,
  };

  const trackingPayload = {
    lead_quality: lead.quality || "New",
    utm_source: lead.utmSource || null,
    utm_medium: lead.utmMedium || null,
    utm_campaign: lead.utmCampaign || null,
    utm_term: lead.utmTerm || null,
    utm_content: lead.utmContent || null,
    gclid: lead.gclid || null,
    landing_page: lead.landingPage || null,
    referrer: lead.referrer || null,
  };

  const { data, error } = await supabase
    .from("leads")
    .insert({
      ...baseLeadPayload,
      ...trackingPayload,
    })
    .select("*")
    .single();
   
  if (error) {
    if (isMissingTrackingColumnError(error)) {
      const fallbackResult = await supabase
        .from("leads")
        .insert(baseLeadPayload)
        .select("*")
        .single();

      if (fallbackResult.error) {
        throw fallbackResult.error;
      }

      return {
        ...mapSupabaseLead(fallbackResult.data),
        quality: lead.quality || "New",
        utmSource: lead.utmSource || "",
        utmMedium: lead.utmMedium || "",
        utmCampaign: lead.utmCampaign || "",
        utmTerm: lead.utmTerm || "",
        utmContent: lead.utmContent || "",
        gclid: lead.gclid || "",
        landingPage: lead.landingPage || "",
        referrer: lead.referrer || "",
      };
    }

    throw error;
  }

  return mapSupabaseLead(data);
}

export async function getSupabaseLeads() {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
  
    if (error) {
      throw error;
    }
  
    return data.map(mapSupabaseLead);
  }

  export async function getSupabaseLeadById(leadId) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();
  
    if (error) {
      throw error;
    }
  
    return mapSupabaseLead(data);
  }


  export async function updateSupabaseLeadRecommendations(
    leadId,
    propertyIds,
    floorPlanItems = []
  ) {
    const updatePayload = {
      recommended_property_ids: propertyIds,
      recommended_floor_plan_items: floorPlanItems,
      status: propertyIds.length > 0 ? "Recommendation Sent" : "New Lead",
      last_touch: "Just now",
    };
    const { error } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", leadId);
  
    if (error) {
      if (isMissingRecommendedFloorPlanColumnError(error)) {
        const fallbackResult = await supabase
          .from("leads")
          .update({
            recommended_property_ids: propertyIds,
            status: propertyIds.length > 0 ? "Recommendation Sent" : "New Lead",
            last_touch: "Just now",
          })
          .eq("id", leadId);

        if (fallbackResult.error) {
          throw fallbackResult.error;
        }

        return;
      }

      throw error;
    }
  }


  export async function getSupabaseLeadByToken(token) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("token", token)
      .maybeSingle();
  
    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }
  
    return mapSupabaseLead(data);
  }

  export async function updateSupabaseLead(leadId, updates) {
    const updatePayload = {};

    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.quality !== undefined) updatePayload.lead_quality = updates.quality;
    if (updates.priority !== undefined) updatePayload.priority = updates.priority;
    if (updates.assignedTo !== undefined) updatePayload.assigned_to = updates.assignedTo;
    if (updates.lastTouch !== undefined) updatePayload.last_touch = updates.lastTouch;
    if (updates.notes !== undefined) updatePayload.notes = updates.notes;

    const { error } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", leadId);
  
    if (error) {
      throw error;
    }
  }

export async function archiveSupabaseTestLeads() {
  const { error } = await supabase
    .from("leads")
    .update({
      status: "Archived",
      last_touch: "Archived test data",
    })
    .eq("source", "Test Data")
    .neq("status", "Archived");

  if (error) {
    throw error;
  }
}
