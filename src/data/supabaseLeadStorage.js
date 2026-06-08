import { getAnyLeadByToken } from "./leadStorage";
import { supabase } from "./supabaseClient";

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
   
  if (error) {
    throw error;
  }

  return lead;
}

export async function getSupabaseLeads() {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
  
    if (error) {
      throw error;
    }
  
    return data.map((lead) => ({
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
    }));
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
  
    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      preference: data.preference,
      bedrooms: data.bedrooms,
      budget: data.budget,
      moveIn: data.move_in,
      status: data.status,
      priority: data.priority,
      source: data.source,
      sourcePropertyId: data.source_property_id,
      sourcePropertyName: data.source_property_name,
      assignedTo: data.assigned_to,
      lastTouch: data.last_touch,
      notes: data.notes,
      recommendedPropertyIds: data.recommended_property_ids || [],
      token: data.token,
      contactMethod: data.contact_method,
      createdAt: data.created_at,
    };
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
      .single();
  
    if (error) {
      throw error;
    }
  
    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      preference: data.preference,
      bedrooms: data.bedrooms,
      budget: data.budget,
      moveIn: data.move_in,
      status: data.status,
      priority: data.priority,
      source: data.source,
      sourcePropertyId: data.source_property_id,
      sourcePropertyName: data.source_property_name,
      assignedTo: data.assigned_to,
      lastTouch: data.last_touch,
      notes: data.notes,
      recommendedPropertyIds: data.recommended_property_ids || [],
      token: data.token,
      contactMethod: data.contact_method,
      createdAt: data.created_at,
    };
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