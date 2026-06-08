import { leads as mockLeads } from "./mockData";

export function getStoredLeads() {
  return JSON.parse(localStorage.getItem("belowMarketLeads") || "[]");
}

export function getAllLeads() {
  return [...getStoredLeads(), ...mockLeads];
}

export function getAnyLeadById(leadId) {
  return getAllLeads().find((lead) => lead.id === String(leadId));
}

export function saveLocalLead(lead) {
  const savedLeads = getStoredLeads();

  localStorage.setItem(
    "belowMarketLeads",
    JSON.stringify([lead, ...savedLeads])
  );
}

export function updateLocalLead(leadId, updates) {
  const savedLeads = getStoredLeads();

  const updatedLeads = savedLeads.map((lead) =>
    lead.id === String(leadId)
      ? {
        ...lead,
        ...updates,
      }
      : lead
  );

  localStorage.setItem("belowMarketLeads", JSON.stringify(updatedLeads));
}

export function archiveLocalTestLeads() {
  const savedLeads = getStoredLeads();

  const updatedLeads = savedLeads.map((lead) =>
    lead.source === "Test Data" && lead.status !== "Archived"
      ? {
        ...lead,
        status: "Archived",
        lastTouch: "Archived test data",
      }
      : lead
  );

  localStorage.setItem("belowMarketLeads", JSON.stringify(updatedLeads));
}

export function getAnyLeadByToken(token) {
  return getAllLeads().find((lead) => lead.token === token);
}

export function clearStoredLeads() {
  localStorage.removeItem("belowMarketLeads");
}

export function deleteLocalLead(leadId) {
  const savedLeads = getStoredLeads();

  const updatedLeads = savedLeads.filter(
    (lead) => lead.id !== String(leadId)
  );

  localStorage.setItem("belowMarketLeads", JSON.stringify(updatedLeads));
}

export function getStoredTourRequests() {
  return JSON.parse(localStorage.getItem("belowMarketTourRequests") || "[]");
}

export function saveTourRequest(tourRequest) {
  const savedRequests = getStoredTourRequests();

  localStorage.setItem(
    "belowMarketTourRequests",
    JSON.stringify([tourRequest, ...savedRequests])
  );
}

export function getTourRequestsForLead(leadId) {
  return getStoredTourRequests().filter(
    (request) => request.leadId === String(leadId)
  );
}

export function updateTourRequestStatus(leadId, requestId, status) {
  const tourRequests = getStoredTourRequests();

  const updatedTourRequests = tourRequests.map((request) => {
    if (request.leadId === String(leadId) && request.id === requestId) {
      return {
        ...request,
        status,
        followedUpAt: new Date().toISOString(),
      };
    }

    return request;
  });

  localStorage.setItem("belowMarketTourRequests", JSON.stringify(updatedTourRequests));

  return updatedTourRequests;
}

export function deleteTourRequest(requestId) {
  const tourRequests = getStoredTourRequests();

  const updatedTourRequests = tourRequests.filter(
    (request) => request.id !== requestId
  );

  localStorage.setItem(
    "belowMarketTourRequests",
    JSON.stringify(updatedTourRequests)
  );

  return updatedTourRequests;
}

export function getStoredLeadActivities() {
  return JSON.parse(localStorage.getItem("belowMarketLeadActivities") || "[]");
}

export function getLeadActivitiesForLead(leadId) {
  return getStoredLeadActivities().filter(
    (activity) => activity.leadId === String(leadId)
  );
}

export function saveLeadActivity(activity) {
  const savedActivities = getStoredLeadActivities();

  localStorage.setItem(
    "belowMarketLeadActivities",
    JSON.stringify([
      {
        id: `activity-${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...activity,
      },
      ...savedActivities,
    ])
  );
}

export function clearLeadActivities(leadId) {
  const savedActivities = getStoredLeadActivities();

  const updatedActivities = savedActivities.filter(
    (activity) => activity.leadId !== String(leadId)
  );

  localStorage.setItem(
    "belowMarketLeadActivities",
    JSON.stringify(updatedActivities)
  );

  return updatedActivities;
}
