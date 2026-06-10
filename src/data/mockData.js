export const properties = [];

export const leads = [];

export const dataHistory = [];


export function getLeadById(leadId) {
  return leads.find((lead) => lead.id === String(leadId));
}

export function getPropertyById(propertyId) {
  return properties.find((property) => property.id === propertyId);
}

export function getRecommendationsForLead(lead) {
  if (!lead) return [];

  return lead.recommendedPropertyIds
    .map((propertyId) => getPropertyById(propertyId))
    .filter(Boolean);
}

export function getLeadByToken(token) {
    return leads.find((lead) => lead.token === token);
  }
