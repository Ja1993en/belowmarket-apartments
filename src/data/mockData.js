export const properties = [
    {
      id: "the-monroe",
      name: "The Monroe",
      area: "Uptown Dallas",
      manager: "Greystar",
      rent: "$1,425+",
      marketRent: "$1,650",
      effectiveRent: "$1,425",
      savings: "$225/mo",
      belowMarketPercent: "14%",
      status: "Live",
      special: "6 weeks free",
      updated: "Today",
      image:
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80",
        floorPlans: ["A1", "S1"],
        bedrooms: ["Studio", "1 Bed"],
    },
    {
      id: "lakeview-lofts",
      name: "Lakeview Lofts",
      area: "Las Colinas",
      manager: "RPM Living",
      rent: "$1,299+",
      marketRent: "$1,520",
      effectiveRent: "$1,299",
      savings: "$221/mo",
      belowMarketPercent: "15%",
      status: "Pending Review",
      special: "$750 look-and-lease",
      updated: "Yesterday",
      image:
        "https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&w=900&q=80",
        floorPlans: ["S1", "A2"],
        bedrooms: ["Studio", "1 Bed"],
    },
    {
      id: "cedar-district",
      name: "Cedar District",
      area: "Bishop Arts",
      manager: "Willow Bridge",
      rent: "$1,780+",
      marketRent: "$2,050",
      effectiveRent: "$1,780",
      savings: "$270/mo",
      belowMarketPercent: "13%",
      status: "Draft",
      special: "Reduced rates",
      updated: "3 days ago",
      image:
        "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=900&q=80",
        floorPlans: ["B2"],
        bedrooms: ["2 Bed"],
    },
  ];

export const leads = [
    {
      id: "1",
      name: "Ashley Brown",
      phone: "(214) 555-0144",
      email: "ashley@example.com",
      preference: "1 Bed - Uptown Dallas - $1,600 budget",
      bedrooms: "1 Bed",
      budget: "$1,600",
      moveIn: "June 15",
      status: "New Lead",
      priority: "High",
      source: "Public listing",
      assignedTo: "Jalen McNeal",
      lastTouch: "Today",
      notes: "Wants below-market specials and prefers an evening tour after work.",
      recommendedPropertyIds: ["the-monroe", "lakeview-lofts"],
      token: "ashley-brown-uptown",
    },
    {
      id: "2",
      name: "Marcus Hill",
      phone: "(972) 555-0188",
      email: "marcus@example.com",
      preference: "2 Bed - Las Colinas - $2,100 budget",
      bedrooms: "2 Bed",
      budget: "$2,100",
      moveIn: "July 1",
      status: "Tour Needed",
      priority: "Medium",
      source: "Locator referral",
      assignedTo: "Sarah Smith",
      lastTouch: "Yesterday",
      notes: "Needs garage parking and wants properties near DART access.",
      recommendedPropertyIds: ["lakeview-lofts", "cedar-district"],
      token: "marcus-hill-las-colinas",
    },
    {
      id: "3",
      name: "Tierra Lane",
      phone: "(469) 555-0191",
      email: "tierra@example.com",
      preference: "Studio - Downtown Dallas - ASAP move-in",
      bedrooms: "Studio",
      budget: "$1,450",
      moveIn: "ASAP",
      status: "Recommendation Sent",
      priority: "High",
      source: "Lead form",
      assignedTo: "Jalen McNeal",
      lastTouch: "2 days ago",
      notes: "Open to Uptown or Bishop Arts if the effective rent beats market.",
      recommendedPropertyIds: ["the-monroe", "cedar-district"],
      token: "tierra-lane-asap",
    },
  ];
   
  export const dataHistory = [
    {
      id: "evt-1",
      type: "Property updated",
      subject: "The Monroe",
      description:
        "Starting rent changed to $1,425+ and 6 weeks free was confirmed.",
      actor: "Admin",
      time: "Today",
      status: "Published",
    },
    {
      id: "evt-2",
      type: "Lead created",
      subject: "Ashley Brown",
      description: "New renter lead submitted from the public property listing.",
      actor: "Public form",
      time: "Today",
      status: "Queued",
    },
    {
      id: "evt-3",
      type: "Recommendations sent",
      subject: "Tierra Lane",
      description: "Two below-market properties were sent through a renter link.",
      actor: "Jalen McNeal",
      time: "2 days ago",
      status: "Sent",
    },
    {
      id: "evt-4",
      type: "Special added",
      subject: "Lakeview Lofts",
      description: "$750 look-and-lease concession added for review.",
      actor: "Sarah Smith",
      time: "3 days ago",
      status: "Needs Review",
    },
  ];


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