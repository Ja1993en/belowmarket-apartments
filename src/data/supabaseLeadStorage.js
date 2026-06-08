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
    priority: lead.priority,
    source: lead.source,
    sourcePropertyId: lead.source_property_id,
    sourcePropertyName: lead.source_property_name,
    assignedTo: lead.assigned_to,
    lastTouch: lead.last_touch,
    notes: lead.notes,
    recommendedPropertyIds: lead.recommended_property_ids || [],
    token: lead.token,
    contactMethod: lead.contact_method,
    createdAt: lead.created_at,
  };
}

export async function saveSupabaseLead(lead) {
  const { data, error } = await supabase
    .from("leads")
    .insert({
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
    })
    .select("*")
    .single();
   
  if (error) {
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


  export async function updateSupabaseLeadRecommendations(leadId, propertyIds) {
    const { error } = await supabase
      .from("leads")
      .update({
        recommended_property_ids: propertyIds,
        status: propertyIds.length > 0 ? "Recommendation Sent" : "New Lead",
        last_touch: "Just now",
      })
      .eq("id", leadId);
  
    if (error) {
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
    const { error } = await supabase
      .from("leads")
      .update({
        status: updates.status,
        priority: updates.priority,
        assigned_to: updates.assignedTo,
        last_touch: updates.lastTouch,
        notes: updates.notes,
      })
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
