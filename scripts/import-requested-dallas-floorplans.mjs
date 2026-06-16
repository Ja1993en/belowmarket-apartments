import fs from "node:fs";

const WEEKS_PER_MONTH = 4;
const LEASE_TERM_MONTHS = 12;

const env = readEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.");
}

const requestedProperties = [
  buildMaaCathedralArts(),
  buildCortlandOnMckinney(),
  buildDraftProperty({
    id: "cedar-at-the-branch",
    name: "Cedar at the Branch",
    address: "4606 Amesbury Dr",
    city: "Dallas",
    state: "TX",
    zipcode: "75206",
    special: "6 weeks free",
    area: "East Dallas",
    sourceNote:
      "Draft placeholder added from the requested address and special. Publish after verified floor-plan pricing is available.",
  }),
  buildDraftProperty({
    id: "miro-dallas",
    name: "Miro",
    address: "2225 N Harwood St",
    city: "Dallas",
    state: "TX",
    zipcode: "75201",
    special: "3 weeks free",
    area: "Harwood District",
    managementCompany: "Harwood International",
    sourceNote:
      "Draft placeholder added from the requested address and special. Publish after verified Dallas Miro floor-plan pricing is available.",
  }),
];

for (const property of requestedProperties) {
  await upsertManagementCompany(property);
  const existing = await getExistingProperty(property.id);
  const mergedProperty = mergeProperty(existing, property);

  await upsertProperty(mergedProperty);
  console.log(
    `${mergedProperty.status}: ${mergedProperty.name} (${mergedProperty.floorPlans.length} floor plans)`
  );
}

function buildMaaCathedralArts() {
  const photos = createMaaCathedralArtsPhotos([
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-hero/maa-cathedral-arts-resort-style-pool-close-up-main.jpg?h=628&iar=0&w=493", "Pool at MAA Cathedral Arts"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-hero/maa-cathedral-arts-clubhouse-wide-angle---main.jpg?h=628&iar=0&w=493", "Clubhouse at MAA Cathedral Arts"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-hero/maa-cathedral-arts-fitness-center-main.jpg?h=628&iar=0&w=493", "Fitness center at MAA Cathedral Arts"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-hero/maa-cathedral-arts---living-room-main.jpg?h=628&iar=0&w=493", "Living room at MAA Cathedral Arts"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-hero/maa-cathedral-arts-luxury-kitchen-main.jpg?h=628&iar=0&w=493", "Kitchen at MAA Cathedral Arts"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-hero/maa-cathedral-arts---bathroom-resized.jpg?h=4024&iar=0&w=3158", "Bathroom at MAA Cathedral Arts"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-resort-style-pool-aeriel.jpg?h=2467&iar=0&w=3840", "Pool at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-resort-style-pool-building-2-close-up.jpg?h=2467&iar=0&w=3840", "Pool at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-pool-building-2.jpg?h=2467&iar=0&w=3840", "Pool at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-resort-style-pool-close-up-(1).jpg?h=2467&iar=0&w=3840", "Pool at MAA Cathedral Arts Luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-luxury-pool.jpg?h=1365&iar=0&w=2048", "Pool at MAA Cathedral Arts Luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-luxury-pool-wide-angle.jpg?h=1365&iar=0&w=2048", "Pool at MAA Cathedral Arts Luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-coworking-spaces.jpg?h=2467&iar=0&w=3840", "Cowork space at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-clubhouse-coworking-spaces-wide-angle.jpg?h=2467&iar=0&w=3840", "Cowork space at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-clubhouse-coworking-spaces.jpg?h=2467&iar=0&w=3840", "Cowork space at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-rooftop-lounge-indoor.jpg?h=2467&iar=0&w=3840", "Rooftop lounge at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-rooftop-lounge-close-up-angle.jpg?h=2467&iar=0&w=3840", "Rooftop lounge at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-rooftop-lounge-angle.jpg?h=2467&iar=0&w=3840", "Rooftop lounge at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-rooftop-lounge.jpg?h=2467&iar=0&w=3840", "Rooftop lounge at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-two-bedroom-luxury-apartment.jpg?h=2467&iar=0&w=3840", "Kitchen at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/_dsc7461.jpg?h=4024&iar=0&w=6024", "Living room at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/_dsc0809.jpg?h=4024&iar=0&w=6024", "Living room at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/_dsc0845.jpg?h=4024&iar=0&w=6024", "Bedroom at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/_dsc0830.jpg?h=4024&iar=0&w=6024", "Bathroom at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/_dsc0851.jpg?h=4024&iar=0&w=6024", "Bathroom at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-one-bedroom-kitchen.jpg?h=2467&iar=0&w=3840", "Kitchen at MAA Cathedral Arts Luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-one-bedroom-kitchen-living-room.jpg?h=2467&iar=0&w=3840", "Kitchen at MAA Cathedral Arts Luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/_dsc0770.jpg?h=4024&iar=0&w=6024", "Living room at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-clubhouse.jpg?h=2467&iar=0&w=3840", "Clubhouse at MAA Cathedral Arts Luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-clubhouse-billiards.jpg?h=2467&iar=0&w=3840", "Clubhouse at MAA Cathedral Arts Luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-clubhouse-wide-angle-(1).jpg?h=2467&iar=0&w=3840", "Clubhouse at MAA Cathedral Arts Luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/_dsc7611.jpg?h=4024&iar=0&w=6024", "Fitness at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/_dsc7629.jpg?h=4024&iar=0&w=6024", "Fitness at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/_dsc7674.jpg?h=4024&iar=0&w=6024", "Fitness at MAA Cathedral Arts luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-rideshare-waiting-lounge-(2).jpg?h=2467&iar=0&w=3840", "Lounge at MAA Cathedral Arts Luxury apartment homes in Dallas, TX"],
    ["https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-leasing-office.jpg?h=2467&iar=0&w=3840", "Leasing office at MAA Cathedral Arts Luxury apartment homes in Dallas, TX"],
  ]);

  const floorPlans = createMaaCathedralArtsFloorPlans();

  return propertyRecord({
    id: "maa-cathedral-arts",
    name: "MAA Cathedral Arts",
    area: "Lower Greenville",
    manager: "MAA",
    managementCompany: "MAA",
    address: "5088 Ross Avenue",
    city: "Dallas",
    state: "TX",
    zipcode: "75206",
    latitude: 32.8077,
    longitude: -96.7728,
    yearBuilt: "2024",
    propertyClass: "newConstruction",
    benchmarkClass: "newConstruction",
    special: "Up to 8 weeks free",
    status: "Live",
    photos,
    floorPlans,
    amenities: [
      "Clubhouse",
      "24/hr Fitness Center",
      "In unit laundry",
      "Two sparkling pools with sun deck",
      "Sky lounge with city views",
      "Two pet spas",
      "Controlled access buildings",
      "EV charging station",
      "Coworking spaces",
      "Yoga studio",
    ],
    sourceUrl: "https://www.maac.com/texas/dallas/maa-cathedral-arts/",
  });
}

function createMaaCathedralArtsPhotos(photoSources) {
  return photoSources.map(([url, alt], index) => {
    const category = getMaaPhotoCategory(url, alt);

    return {
      id: `maa-cathedral-arts-photo-${String(index + 1).padStart(2, "0")}`,
      name: alt || `MAA Cathedral Arts photo ${index + 1}`,
      category,
      url,
      alt,
    };
  });
}

function getMaaPhotoCategory(url, alt = "") {
  const text = `${url} ${alt}`.toLowerCase();

  if (text.includes("pool")) return "Pool";
  if (text.includes("rooftop")) return "Rooftop";
  if (text.includes("fitness")) return "Fitness";
  if (text.includes("clubhouse") || text.includes("cowork") || text.includes("billiards")) {
    return "Clubhouse";
  }
  if (text.includes("kitchen") || text.includes("living") || text.includes("bedroom") || text.includes("bathroom")) {
    return "Interior";
  }
  if (text.includes("leasing")) return "Leasing";
  if (text.includes("lounge")) return "Lounge";

  return "Property";
}

function createCortlandOnMckinneyPhotos(photoSources) {
  return photoSources.map(([url, alt, category], index) => ({
    id: `cortland-on-mckinney-photo-${String(index + 1).padStart(2, "0")}`,
    name: alt || `Cortland on McKinney photo ${index + 1}`,
    category: category || getCortlandPhotoCategory(url, alt),
    url,
    alt,
  }));
}

function getCortlandPhotoCategory(url, alt = "") {
  const text = `${url} ${alt}`.toLowerCase();

  if (text.includes("pool")) return "Pool";
  if (text.includes("fitness") || text.includes("workout")) return "Fitness";
  if (text.includes("dog") || text.includes("bark")) return "Pet Friendly";
  if (text.includes("grill") || text.includes("outdoor")) return "Outdoor";
  if (text.includes("lounge") || text.includes("clubhouse") || text.includes("workspace") || text.includes("coffee")) {
    return "Lounge";
  }
  if (text.includes("kitchen") || text.includes("bedroom") || text.includes("living") || text.includes("bathroom") || text.includes("closet") || text.includes("dining")) {
    return "Interior";
  }

  return "Property";
}

function createMaaCathedralArtsFloorPlans() {
  const floorPlanImages = {
    S1: "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/S1 Light.png",
    S1A: "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/S1A Light.png",
    S2: "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/S2 Light.png",
    A2: "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/A2 Light.png",
    A3: "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/A3 Light.png",
    A5: "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/A5 Light.png",
    A6: "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/A6 Light.png",
    A8: "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/A8 Light.png",
    B1: "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/B1 Light.png",
    B1A: "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/B1A Light.png",
    B3: "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/B3 Light.png",
    B4: "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/B4 Light.png",
  };

  return groupUnitsByFloorPlan([
    maaUnit("1163", "S1A", 0, 1, 507, 1218, "06/15 - 06/18", 0, "", "", "Light"),
    maaUnit("1117", "S1", 0, 1, 507, 1288, "08/12 - 08/15", 0, "", "Built In Bluetooth Speakers", "Light"),
    maaUnit("1105", "S2", 0, 1, 542, 1338, "08/05 - 08/08", 0, "", "Mud Room Entry Direct Entry", "Light"),
    maaUnit("1367", "A2", 1, 1, 674, 1653, "06/15 - 06/18", 6, "Lease Now for six weeks free! Certain exclusions may apply.", "", "Light"),
    maaUnit("2108", "A2", 1, 1, 674, 1698, "07/10 - 07/13", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "Pool View Balcony Built In Bluetooth Speakers", "Light"),
    maaUnit("2115", "A2", 1, 1, 674, 1708, "07/17 - 07/20", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "Large Balcony", "Light"),
    maaUnit("1559", "A2", 1, 1, 674, 1813, "08/04 - 08/07", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "Balcony City View", "Light"),
    maaUnit("2531", "A2", 1, 1, 674, 1753, "08/14 - 08/17", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "Balcony", "Light"),
    maaUnit("1467", "A2", 1, 1, 674, 1783, "08/26 - 08/29", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "Balcony City View", "Dark"),
    maaUnit("1169", "A2", 1, 1, 674, 1848, "09/11 - 09/14", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "Balcony Direct Entry", "Light"),
    maaUnit("1473", "A3", 1, 1, 701, 1783, "06/23 - 06/26", 6, "Lease Now for six weeks free! Certain exclusions may apply.", "Balcony City View", "Dark"),
    maaUnit("1273", "A3", 1, 1, 701, 1683, "07/10 - 07/13", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "", "Dark"),
    maaUnit("2521", "A3", 1, 1, 701, 1753, "07/15 - 07/18", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "Balcony", "Dark"),
    maaUnit("1527", "A3", 1, 1, 701, 1723, "07/17 - 07/20", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "", "Dark"),
    maaUnit("1433", "A3", 1, 1, 701, 1728, "07/31 - 08/03", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "", "Dark"),
    maaUnit("1231", "A3", 1, 1, 701, 1718, "07/31 - 08/03", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "", "Dark"),
    maaUnit("2223", "A3", 1, 1, 701, 1748, "08/05 - 08/08", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "Balcony", "Dark"),
    maaUnit("1537", "A5", 1, 1, 801, 1878, "06/15 - 06/18", 6, "Lease Now for six weeks free! Certain exclusions may apply.", "Mud Room Entry Kitchen Island", "Light"),
    maaUnit("1249", "A5", 1, 1, 801, 1838, "07/17 - 07/20", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "Mud Room Entry Kitchen Island", "Dark"),
    maaUnit("1449", "A5", 1, 1, 801, 1923, "08/14 - 08/17", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "Mud Room Entry Kitchen Island City View", "Dark"),
    maaUnit("1276", "A6", 1, 1, 902, 2063, "08/26 - 08/29", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "Pool View Kitchen Island Dual Vanities Medium Balcony", "Dark"),
    maaUnit("1511", "A8", 1, 1, 1046, 2178, "07/15 - 07/18", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "Mud Room Entry Dual Vanities Den/Study", "Light"),
    maaUnit("1570", "B1A", 2, 2, 1011, 2203, "06/15 - 06/18", 8, "Lease Now for 8 weeks free! Certain exclusions may apply.", "Pool View Kitchen Island Dual Vanities Balcony", "Light"),
    maaUnit("1135", "B1A", 2, 2, 1011, 2158, "07/01 - 07/04", 4, "Lease Now for 4 weeks free! Certain exclusions may apply.", "Kitchen Island Dual Vanities Balcony", "Light"),
    maaUnit("2502", "B1", 2, 2, 1011, 2273, "07/13 - 07/16", 8, "Lease Now for 8 weeks free! Certain exclusions may apply.", "Pool View Kitchen Island Dual Vanities Balcony Built In Bluetooth Speakers", "Light"),
    maaUnit("1529", "B1", 2, 2, 1011, 2258, "08/03 - 08/06", 6, "Lease Now for six weeks free! Certain exclusions may apply.", "Kitchen Island Dual Vanities", "Light"),
    maaUnit("1223", "B1A", 2, 2, 1011, 2218, "08/12 - 08/15", 6, "Lease Now for six weeks free! Certain exclusions may apply.", "Kitchen Island Dual Vanities", "Dark"),
    maaUnit("1168", "B3", 2, 2, 1209, 2293, "06/15 - 06/18", 8, "Lease Now for 8 weeks free! Certain exclusions may apply.", "Pool View Mud Room Entry Kitchen Island Dual Vanities Medium Balcony Built In Bluetooth Speakers", "Light"),
    maaUnit("1406", "B3", 2, 2, 1209, 2478, "06/15 - 06/18", 8, "Lease Now for 8 weeks free! Certain exclusions may apply.", "Pool View Mud Room Entry Kitchen Island Dual Vanities Medium Balcony", "Dark"),
    maaUnit("1506", "B3", 2, 2, 1209, 2543, "07/03 - 07/06", 6, "Lease Now for six weeks free! Certain exclusions may apply.", "Pool View Mud Room Entry Kitchen Island Dual Vanities Medium Balcony", "Light"),
    maaUnit("1368", "B3", 2, 2, 1209, 2598, "08/05 - 08/08", 6, "Lease Now for six weeks free! Certain exclusions may apply.", "Pool View Mud Room Entry Kitchen Island Dual Vanities Medium Balcony", "Light"),
    maaUnit("1206", "B3", 2, 2, 1209, 2593, "08/14 - 08/17", 6, "Lease Now for six weeks free! Certain exclusions may apply.", "Pool View Mud Room Entry Kitchen Island Dual Vanities Medium Balcony", "Dark"),
    maaUnit("2505", "B4", 2, 2, 1388, 2608, "06/26 - 06/29", 8, "Lease Now for 8 weeks free! Certain exclusions may apply.", "Mud Room Entry Kitchen Island Dual Vanities Built In Bluetooth Speakers", "Light"),
  ], floorPlanImages);
}

function maaUnit(unit, planId, bedrooms, bathrooms, sqft, rent, available, freeWeeks, special, amenities, finishPackage) {
  const imageFinish = finishPackage || "Light";

  return {
    unit,
    planId,
    bedrooms,
    bathrooms,
    sqft,
    rent,
    available,
    freeWeeks,
    special,
    amenities,
    finishPackage,
    image: `https://cdn.rentcafe.com/dmslivecafe/3/1839724/p1807538_unit${unit}_${planId}_${imageFinish}_3D_unitimage.png`,
    isRenovated: false,
  };
}

function groupUnitsByFloorPlan(units, floorPlanImages) {
  const groups = new Map();

  units.forEach((unit) => {
    if (!groups.has(unit.planId)) groups.set(unit.planId, []);
    groups.get(unit.planId).push(unit);
  });

  return [...groups.entries()].map(([planId, planUnits]) => {
    const [firstUnit] = planUnits;
    const rents = planUnits.map((unit) => unit.rent);
    const freeWeeksValues = planUnits.map((unit) => unit.freeWeeks || 0);
    const minRent = Math.min(...rents);
    const maxRent = Math.max(...rents);
    const maxFreeWeeks = Math.max(...freeWeeksValues);

    return floorPlanRecord({
      id: planId.toLowerCase(),
      name: planId,
      bedrooms: firstUnit.bedrooms,
      bathrooms: firstUnit.bathrooms,
      sqft: firstUnit.sqft,
      startingRent: minRent,
      maxRent,
      availableCount: planUnits.length,
      freeWeeks: maxFreeWeeks,
      specialLabel: summarizeUnitSpecials(freeWeeksValues),
      availableDate: getEarliestAvailability(planUnits),
      image: floorPlanImages[planId] || firstUnit.image,
      units: planUnits.map(createMaaAvailableUnit),
    });
  });
}

function createMaaAvailableUnit(unit) {
  const deal = calculateDeal(unit.rent, unit.freeWeeks);

  return {
    id: `${unit.planId.toLowerCase()}-unit-${unit.unit}`,
    unit: unit.unit,
    rent: formatCurrency(unit.rent),
    available: unit.available,
    status: "available",
    currentSpecial: unit.special,
    special: unit.special
      ? {
          label: unit.special,
          freeWeeks: unit.freeWeeks,
          leaseTermMonths: LEASE_TERM_MONTHS,
        }
      : null,
    freeWeeks: unit.freeWeeks,
    leaseTermMonths: LEASE_TERM_MONTHS,
    effectiveRent: deal.effectiveRent,
    effectiveRentNumber: deal.effectiveRentNumber,
    monthlyConcession: deal.monthlyConcession,
    savings: deal.savings,
    amenities: unit.amenities,
    finishPackage: unit.finishPackage,
    image: unit.image,
    isRenovated: Boolean(unit.isRenovated),
  };
}

function summarizeUnitSpecials(freeWeeksValues) {
  const uniqueWeeks = [...new Set(freeWeeksValues.filter(Boolean))].sort((a, b) => a - b);
  if (uniqueWeeks.length === 0) return "";

  const [minWeeks] = uniqueWeeks;
  const maxWeeks = uniqueWeeks[uniqueWeeks.length - 1];

  if (minWeeks === maxWeeks) return `Lease Now for ${maxWeeks} weeks free`;
  return `Up to ${maxWeeks} weeks free`;
}

function getEarliestAvailability(units) {
  return units
    .map((unit) => unit.available)
    .filter(Boolean)
    .sort()[0] || "";
}

function buildCortlandOnMckinney() {
  const photos = createCortlandOnMckinneyPhotos([
    ["https://cortland.com/assets/images/cache/DSC_2061-1-b58b2f1956452e32f04224b80269b3e5.jpg", "Kitchen with sleek countertops at Cortland on McKinney", "Interior"],
    ["https://cortland.com/assets/images/cache/DSC_2056-1-bf33ebad79108e4b0456817e42c75dbb.jpg", "Kitchen and dining area at Cortland on McKinney", "Interior"],
    ["https://cortland.com/assets/images/cache/DSC_2069-1-86c57dc205f60e98b069f1942ff388ea.jpg", "Kitchen with breakfast bar at Cortland on McKinney", "Interior"],
    ["https://cortland.com/assets/images/cache/DSC_2095-1-2-4f1b6b0c2aeee3c9cef2addacdef7485.jpg", "Living and dining area at Cortland on McKinney", "Interior"],
    ["https://cortland.com/assets/images/cache/DSC_2104-12-43ce2a6ff4cf51af512017ce6b9289d4.jpg", "Spacious living room at Cortland on McKinney", "Interior"],
    ["https://cortland.com/assets/images/cache/DSC_2100-2-9dc5e9e307e59cca0988d0d7b39bc655.jpg", "Living room with floor-to-ceiling windows at Cortland on McKinney", "Interior"],
    ["https://cortland.com/assets/images/cache/DSC_2109-3-1-06b137e1ae12d9f532ac596fe5bf26dc.jpg", "Open apartment layout with modern lighting at Cortland on McKinney", "Interior"],
    ["https://cortland.com/assets/images/cache/003_imgp1288-1290_496-1-1-4991fe24a8a51eb5a541658927cc4a8c.jpg", "Spacious bedroom at Cortland on McKinney", "Interior"],
    ["https://cortland.com/assets/images/cache/DSC_2004-2-1-4b30c1d7fdc9037fb637d90ef7831ed1.jpg", "Bathroom with framed mirror at Cortland on McKinney", "Interior"],
    ["https://cortland.com/assets/images/cache/DSC_2016-1-1a87d3e8de53b61a713d200018f7a12f.jpg", "Deep soaking bathtub at Cortland on McKinney", "Interior"],
    ["https://cortland.com/assets/images/cache/DSC_2021-1-d03d172e260d2ecf5321b500420e668f.jpg", "Spacious walk-in closet at Cortland on McKinney", "Interior"],
    ["https://cortland.com/assets/images/cache/005_Penthosue-1-final-min-be9cd457fb52bc257ec503d5171275ea.jpg", "Penthouse wine fridge at Cortland on McKinney", "Penthouse"],
    ["https://cortland.com/assets/images/cache/006_penthouse-1-final-min-d881feb354e7e0f8e75a323079fb6386.jpg", "Penthouse kitchen layout at Cortland on McKinney", "Penthouse"],
    ["https://cortland.com/assets/images/cache/007_Penthouse-1-final-min-1dabfefe740b6a8dd979830287728420.jpg", "Penthouse kitchen with stainless steel appliances at Cortland on McKinney", "Penthouse"],
    ["https://cortland.com/assets/images/cache/008_Penthouse-1-final-min-c7ecfdc3642a76bb2e11725a495641a0.jpg", "Penthouse dining room at Cortland on McKinney", "Penthouse"],
    ["https://cortland.com/assets/images/cache/012_Penthouse-1-final-min-5b315fbf40118e2b529ce884dc9f1fcb.jpg", "Penthouse living room at Cortland on McKinney", "Penthouse"],
    ["https://cortland.com/assets/images/cache/015-Penthouse-1-final-min-7b5c04f1820df50172550930ccd24ceb.jpg", "Penthouse bedroom with floor-to-ceiling windows at Cortland on McKinney", "Penthouse"],
    ["https://cortland.com/assets/images/cache/018_Penthouse-1-final-min-f493bb1ba10bf9c678ab68d573e2553e.jpg", "Penthouse bathroom at Cortland on McKinney", "Penthouse"],
    ["https://cortland.com/assets/images/cache/029_Penthouse-2-final-min-da5be5126815278836fa5d41acc15696.jpg", "Penthouse kitchen with city views at Cortland on McKinney", "Penthouse"],
    ["https://cortland.com/assets/images/cache/030_Penthouse-2-final-min-f6d90dae3c4cca3791742ac9187f584d.jpg", "Penthouse kitchen and dining space at Cortland on McKinney", "Penthouse"],
    ["https://cortland.com/assets/images/cache/034_Penthouse-2-final-min-dd72b2c929316982933d3392ad805d31.jpg", "Penthouse living room with floor-to-ceiling windows at Cortland on McKinney", "Penthouse"],
    ["https://cortland.com/assets/images/cache/036_Penthouse-2-final-min-f748cef019216f61b5b42ad62f223f85.jpg", "Open-concept penthouse living space at Cortland on McKinney", "Penthouse"],
    ["https://cortland.com/assets/images/cache/028_Penthouse-2-final-min-36f632ccc166136c61517df975c841e7.jpg", "Penthouse bedroom at Cortland on McKinney", "Penthouse"],
    ["https://cortland.com/assets/images/cache/023_Penthouse-2-final-min-66506fec78d07f7176196b3a5075ee51.jpg", "Penthouse bathroom with double vanity at Cortland on McKinney", "Penthouse"],
    ["https://cortland.com/assets/images/cache/025_Penthouse-2-final-min-5994bcb6d5e01cfaac3b269f7015227d.jpg", "Penthouse bathroom with soaking tub and walk-in shower at Cortland on McKinney", "Penthouse"],
    ["https://cortland.com/assets/images/cache/DSC_2143-4ebc3e6baff51e028e7a91928cd52b53.jpg", "Fitness center weight equipment at Cortland on McKinney", "Fitness"],
    ["https://cortland.com/assets/images/cache/DSC_2134-833cf1e6d5c41775040b2f5d39e00fa5.jpg", "Spacious fitness center at Cortland on McKinney", "Fitness"],
    ["https://cortland.com/assets/images/cache/DSC_2149-f7932c35093787f2093712a840986d6d.jpg", "Fitness center cardio equipment at Cortland on McKinney", "Fitness"],
    ["https://cortland.com/assets/images/cache/DSC_2159-7b35d9e140469825a631ed2cf1d9bdb1.jpg", "24 hour fitness center at Cortland on McKinney", "Fitness"],
    ["https://cortland.com/assets/images/cache/DSC_6766-083de42fc6de5427d39c73509c9c8363.jpg", "Resort-style pool with cabanas at Cortland on McKinney", "Pool"],
    ["https://cortland.com/assets/images/cache/DSC_6772-6718ff73bceb02e5e35fa95fccf9cab3.jpg", "Resort-style pool and sun deck at Cortland on McKinney", "Pool"],
    ["https://cortland.com/assets/images/cache/DSC_6793-1fda053f76b5ca48ab54a85ac7d64e15.jpg", "Pool and sun deck at Cortland on McKinney", "Pool"],
    ["https://cortland.com/assets/images/cache/DSC_67781-944ef6eb67ce25d1aae5eb0d7a7c3f0e.jpg", "Outdoor grill station at Cortland on McKinney", "Outdoor"],
    ["https://cortland.com/assets/images/cache/DSC_6805-ad413a96ccd94074f79a708ca9afa53a.jpg", "Leash-free bark park at Cortland on McKinney", "Pet Friendly"],
    ["https://cortland.com/assets/images/cache/004_imgp9040-9042_58-2-dd689aa86326cce062f7268d6069c9bd.jpg", "Resident lounge at Cortland on McKinney", "Lounge"],
    ["https://cortland.com/assets/images/cache/003_imgp8986-8988_810-2-33585f83ada23ab1310b9893921fb962.jpg", "Resident lounge with floor-to-ceiling windows at Cortland on McKinney", "Lounge"],
    ["https://cortland.com/assets/images/cache/013_imgp8983-8985_855-3-8237fc56185ceefd763c8e746c9589a1.jpg", "Resident workspace at Cortland on McKinney", "Lounge"],
    ["https://cortland.com/assets/images/cache/010_imgp9019-9021_720-2-61c6515ac3c737c3fea0b47ce3d3c33e.jpg", "Meeting room at Cortland on McKinney", "Lounge"],
    ["https://cortland.com/assets/images/cache/006_imgp9061-9063_368-2-942ca500477e2c4568fb7223dca917d3.jpg", "Coffee bar at Cortland on McKinney", "Lounge"],
    ["https://cortland.com/assets/images/cache/DSC_6373-dcb5e5412d436ecb46d27e85460a22ea.jpg", "Resident clubhouse at Cortland on McKinney", "Lounge"],
    ["https://cortland.com/assets/images/cache/DSC_6415-2390bbcee5d45232455f1f357a170b55.jpg", "Community kitchen at Cortland on McKinney", "Lounge"],
    ["https://cortland.com/assets/images/cache/DSC_64241-7db31654237aa34127e7ce52d4176d3e.jpg", "Party-ready community kitchen at Cortland on McKinney", "Lounge"],
    ["https://cortland.com/assets/images/cache/DSC_6397-6d24357a0fe9a44c447e1a26059501c6.jpg", "Resident clubhouse with community kitchen at Cortland on McKinney", "Lounge"],
    ["https://cortland.com/assets/images/cache/DSC_6436-67afff4756705947157a7985a0ebbc74.jpg", "Resident lounge seating at Cortland on McKinney", "Lounge"],
  ]);

  const floorPlans = [
    cortlandFloorPlan("7803", "The Akard", 1, 1, 1065, 2880, "Available Now", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_1x1-A1-Akard-Copy-ca56b696073d0894f438bba5705b6e8c.jpg"),
    cortlandFloorPlan("7864", "The Caroline", 1, 1, 1119, 3155, "Available Now", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_1x1-A2-Caroline-Copy-866a7fffa2d907b9d3efbbcef89c0f14.jpg"),
    cortlandFloorPlan("7816", "The Cedar Springs", 1, 1, 1196, 3190, "Available Now", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_1x1-A3-Cedar-Springs-Copy-880e58b0b94b3ec41714bc009e6a3c99.jpg"),
    cortlandFloorPlan("7806", "The Harwood", 1, 1, 1253, 0, "Currently Unavailable", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_1x1-A4-Harwood-Copy-e7a90fa16267854a25785d4703147f90.jpg"),
    cortlandFloorPlan("7810", "The Olive", 1, 1, 2616, 0, "Currently Unavailable", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_1x1-A8-Olive-Copy-5c2bc3e74451f7eb8648bb8c7da8ab46.jpg"),
    cortlandFloorPlan("7811", "The Pearl", 2, 2, 1487, 3674, "Available starting 7/27", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_2x2-B1-Pearl-Copy-55579a23df6b118e4631e55184b7a5c6.jpg"),
    cortlandFloorPlan("7812", "The Ross", 2, 2, 1673, 4099, "Available Now", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_2x2-B2-Ross-Copy-26c1fad0928983b9f9d7632645a6a17c.jpg"),
    cortlandFloorPlan("7813", "The St. Paul", 2, 2, 1911, 0, "Currently Unavailable", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_2x2-B3-St.-Paul-Copy-36fbaab784464e45af7ae6dd614c529f.jpg"),
  ];

  return propertyRecord({
    id: "cortland-on-mckinney",
    name: "Cortland on McKinney",
    area: "Uptown Dallas",
    manager: "Cortland",
    managementCompany: "Cortland",
    address: "1900 McKinney Ave",
    city: "Dallas",
    state: "TX",
    zipcode: "75201",
    latitude: 32.789599,
    longitude: -96.803578,
    special: "6 weeks free",
    status: "Live",
    photos,
    floorPlans,
    sourceUrl: "https://cortland.com/apartments/cortland-on-mckinney/floorplans/",
  });
}

function buildDraftProperty({
  id,
  name,
  address,
  city,
  state,
  zipcode,
  area,
  special,
  managementCompany = "",
  sourceNote,
}) {
  return propertyRecord({
    id,
    name,
    area,
    manager: managementCompany,
    managementCompany,
    address,
    city,
    state,
    zipcode,
    special,
    status: "Draft",
    floorPlans: [],
    sourceNote,
  });
}

function propertyRecord({
  id,
  name,
  area,
  manager,
  managementCompany,
  address,
  city,
  state,
  zipcode,
  latitude,
  longitude,
  yearBuilt = "",
  propertyClass = "",
  benchmarkClass = "",
  special,
  status,
  photos = [],
  floorPlans,
  amenities = [],
  sourceUrl = "",
  sourceNote = "",
}) {
  const liveFloorPlans = floorPlans.filter((floorPlan) => floorPlan.status !== "unavailable");
  const availableRents = liveFloorPlans
    .map((floorPlan) => Number(floorPlan.startingRent || 0))
    .filter(Boolean);
  const bestFloorPlan = liveFloorPlans
    .filter((floorPlan) => Number(floorPlan.effectiveRentNumber || floorPlan.startingRent || 0))
    .sort(
      (first, second) =>
      Number(first.effectiveRentNumber || first.startingRent || 0) -
      Number(second.effectiveRentNumber || second.startingRent || 0)
    )[0];
  const bedroomCounts = floorPlans.map((floorPlan) => Number(floorPlan.bedrooms || 0));
  const hasStudio = bedroomCounts.includes(0) && floorPlans.length > 0;
  const maxBedrooms = bedroomCounts.length ? Math.max(...bedroomCounts, 0) : 0;

  return {
    id,
    name,
    area,
    manager,
    managementCompany,
    managementCompanyId: managementCompany ? slugify(managementCompany) : "",
    address,
    city,
    state,
    zipcode,
    latitude,
    longitude,
    yearBuilt,
    propertyClass,
    benchmarkClass,
    rent: availableRents.length ? `$${Math.min(...availableRents).toLocaleString()}+` : "",
    startingRent: availableRents.length ? `$${Math.min(...availableRents).toLocaleString()}` : "",
    effectiveRent: bestFloorPlan?.effectiveRent || "",
    monthlyConcession: bestFloorPlan?.monthlyConcession || "",
    savings: bestFloorPlan?.savings || "",
    belowMarketPercent: bestFloorPlan?.belowMarketPercent || "",
    bedrooms: maxBedrooms || hasStudio ? bedroomRange(maxBedrooms, hasStudio) : [],
    status,
    special,
    image: photos[0]?.url || bestFloorPlan?.image || "",
    photos,
    floorPlans,
    amenities,
    schoolDistrict: "Dallas ISD",
    schoolGrade: "Verify",
    sourceUrl,
    sourceNote,
    updated: "Imported from requested floor-plan update",
  };
}

function maaFloorPlan(id, name, bedrooms, bathrooms, sqft, minRent, maxRent, availableCount, freeWeeks, label, availableDate, image) {
  const units = Array.from({ length: availableCount }).map((_, index) => ({
    id: `${id.toLowerCase()}-unit-${index + 1}`,
    unit: availableCount === 1 ? "Available unit" : `Available unit ${index + 1}`,
    rent: formatCurrency(minRent),
    available: availableDate,
    status: "available",
    currentSpecial: label,
    freeWeeks,
    leaseTermMonths: LEASE_TERM_MONTHS,
  }));

  return floorPlanRecord({
    id: id.toLowerCase(),
    name,
    bedrooms,
    bathrooms,
    sqft,
    startingRent: minRent,
    maxRent,
    availableCount,
    freeWeeks,
    specialLabel: label,
    availableDate,
    image,
    units,
  });
}

function cortlandFloorPlan(id, name, bedrooms, bathrooms, sqft, startingRent, availability, image) {
  const isUnavailable = !startingRent || /unavailable/i.test(availability);
  const availableDate = /starting/i.test(availability)
    ? availability.replace(/^Available starting\s*/i, "")
    : availability || "";

  return floorPlanRecord({
    id: slugify(name) || id,
    name,
    bedrooms,
    bathrooms,
    sqft,
    startingRent,
    maxRent: startingRent,
    availableCount: isUnavailable ? 0 : 1,
    freeWeeks: isUnavailable ? 0 : 6,
    specialLabel: isUnavailable ? "" : "6 weeks free",
    availableDate,
    image,
    status: isUnavailable ? "unavailable" : "available",
    units: isUnavailable
      ? [
          {
            id: `${slugify(name)}-unavailable-unit`,
            unit: "Unavailable unit",
            rent: "Contact for pricing",
            available: "Currently Unavailable",
            status: "unavailable",
            currentSpecial: "",
            freeWeeks: 0,
            leaseTermMonths: LEASE_TERM_MONTHS,
          },
        ]
      : [
          {
            id: `${slugify(name)}-available-unit`,
            unit: "Available unit",
            rent: formatCurrency(startingRent),
            available: availableDate || "Now",
            status: "available",
            currentSpecial: "6 weeks free",
            freeWeeks: 6,
            leaseTermMonths: LEASE_TERM_MONTHS,
          },
        ],
  });
}

function floorPlanRecord({
  id,
  name,
  bedrooms,
  bathrooms,
  sqft,
  startingRent,
  maxRent,
  availableCount,
  freeWeeks,
  specialLabel,
  availableDate,
  image,
  units,
  status = "available",
}) {
  const deal = getBestUnitDeal(units) || calculateDeal(startingRent, freeWeeks);

  return {
    id,
    name,
    bedrooms,
    beds: bedrooms,
    bedroomLabel: bedrooms === 0 ? "Studio" : `${bedrooms} bd`,
    bathrooms,
    baths: bathrooms,
    squareFeet: sqft,
    sqft,
    startingRent: startingRent ? formatCurrency(startingRent) : "",
    rent: startingRent && maxRent && maxRent !== startingRent
      ? `${formatCurrency(startingRent)} - ${formatCurrency(maxRent)}`
      : startingRent
        ? formatCurrency(startingRent)
        : "Contact for pricing",
    totalMonthlyRent: startingRent ? formatCurrency(startingRent) : "",
    effectiveRent: deal.effectiveRent,
    effectiveRentNumber: deal.effectiveRentNumber,
    monthlyConcession: deal.monthlyConcession,
    savings: deal.savings,
    belowMarketPercent: deal.belowMarketPercent,
    currentSpecial: specialLabel,
    special: specialLabel
      ? {
          label: specialLabel,
          freeWeeks,
          leaseTermMonths: LEASE_TERM_MONTHS,
        }
      : null,
    freeWeeks,
    leaseTermMonths: LEASE_TERM_MONTHS,
    availability: availableCount > 0 ? `${availableCount} available` : "Unavailable",
    available: availableCount > 0 ? `${availableCount} available` : "Unavailable",
    availableDate,
    status,
    image,
    photos: image ? [{ id: `${id}-image`, name: `${name} floor plan`, category: "Floor plan", url: image }] : [],
    availableUnits: units,
  };
}

function getBestUnitDeal(units = []) {
  const unitDeals = units
    .map((unit) => {
      const rent = parseCurrency(unit.rent);
      if (!rent) return null;

      return {
        ...calculateDeal(rent, unit.freeWeeks || 0),
        normalRentNumber: rent,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.effectiveRentNumber - b.effectiveRentNumber);

  return unitDeals[0] || null;
}

function parseCurrency(value) {
  return Number(String(value || "").replace(/[^0-9.]/g, "")) || 0;
}

function calculateDeal(startingRent, freeWeeks) {
  if (!startingRent || !freeWeeks) {
    return {
      effectiveRent: startingRent ? formatCurrency(startingRent) : "",
      effectiveRentNumber: startingRent || 0,
      monthlyConcession: "",
      savings: "",
      belowMarketPercent: "",
    };
  }

  const freeMonths = Number(freeWeeks || 0) / WEEKS_PER_MONTH;
  const monthlyConcessionNumber = (startingRent * freeMonths) / LEASE_TERM_MONTHS;
  const effectiveRentNumber = Math.max(startingRent - monthlyConcessionNumber, 0);
  const belowMarketPercentNumber = Math.round((monthlyConcessionNumber / startingRent) * 100);

  return {
    effectiveRent: formatCurrency(effectiveRentNumber),
    effectiveRentNumber: Math.round(effectiveRentNumber),
    monthlyConcession: `${formatCurrency(monthlyConcessionNumber)}/mo`,
    savings: `${formatCurrency(monthlyConcessionNumber)}/mo`,
    belowMarketPercent: `${belowMarketPercentNumber}%`,
  };
}

function mergeProperty(existing, imported) {
  if (!existing) return imported;

  return {
    ...existing,
    ...imported,
    photos: imported.photos.length ? imported.photos : existing.photos || [],
    image: imported.image || existing.image || "",
    amenities: imported.amenities.length ? imported.amenities : existing.amenities || [],
    updated: imported.updated,
  };
}

async function getExistingProperty(propertyId) {
  const response = await supabaseFetch(`/rest/v1/properties?id=eq.${encodeURIComponent(propertyId)}&select=data`);
  const rows = await response.json();

  return rows[0]?.data || null;
}

async function upsertManagementCompany(property) {
  if (!property.managementCompanyId) return;

  await supabaseFetch("/rest/v1/management_companies?on_conflict=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: property.managementCompanyId,
      name: property.managementCompany,
      contact_name: "",
      phone: "",
      email: "",
      data: {
        id: property.managementCompanyId,
        name: property.managementCompany,
      },
      updated_at: new Date().toISOString(),
    }),
  });
}

async function upsertProperty(property) {
  await supabaseFetch("/rest/v1/properties?on_conflict=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: property.id,
      name: property.name,
      status: property.status,
      city: property.city,
      state: property.state,
      zipcode: property.zipcode,
      management_company_id: property.managementCompanyId || null,
      data: property,
      updated_at: new Date().toISOString(),
    }),
  });
}

async function supabaseFetch(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return response;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value || 0)));
}

function bedroomRange(maxBedrooms, hasStudio) {
  const bedrooms = [];

  if (hasStudio) bedrooms.push("Studio");
  for (let bedroom = 1; bedroom <= maxBedrooms; bedroom += 1) {
    bedrooms.push(`${bedroom} bd`);
  }

  return bedrooms;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(".env", "utf8")
      .split(/\n/)
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex).trim();
        const value = line
          .slice(separatorIndex + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");

        return [key, value];
      })
  );
}
