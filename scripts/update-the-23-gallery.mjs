import fs from "node:fs";

const PROPERTY_ID = "the-23";
const PROPERTY_NAME = "The 23";
const SOURCE_URL = "https://www.the23dallas.com/apartments/tx/dallas/photos";
const MEDIA_PATH = "/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/";

const env = readEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.");
}

const photoSources = [
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606899/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/The_23_Exterior_Pool_and_Night_Shot_tesrzp.png",
    "Infinity pool at The 23 in Dallas, Texas",
    "Pool",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606889/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/Pool-1_prseje.jpg",
    "High-rise swimming pool at The 23 in Dallas, Texas",
    "Pool",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606892/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/Sky_Deck_xvdttz.jpg",
    "Sky deck fire pit with city views at The 23 in Dallas, Texas",
    "Outdoor",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606897/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/The_23_Exterior_Patio_and_Partial_Fire_Pit_fkjqss.png",
    "Patio and fire pit at The 23 in Dallas, Texas",
    "Outdoor",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606896/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/The_23_Exterior_Grill_and_Patio_Shot_tuvh5n.png",
    "Rooftop grill and patio at The 23 in Dallas, Texas",
    "Outdoor",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717528162/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/zygmpahhwgmyej5prviw.jpg",
    "Common seating area at The 23 in Dallas, Texas",
    "Amenity",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606888/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/Fitness_Center_cvcy38.jpg",
    "Fitness center with cardio machines at The 23 in Dallas, Texas",
    "Fitness",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606888/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/Fitness_Center_-_1_p3vlmp.jpg",
    "Fitness center overlooking the pool at The 23 in Dallas, Texas",
    "Fitness",
  ],
  [
    "https://res.cloudinary.com/g5-assets-cld/image/upload/x_637,y_342,h_1597,w_2394,c_crop/q_auto,f_auto,fl_lossy,g_center,h_667,w_1000/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/ebevpwuey3ikwdoqu0dv.jpg",
    "Modern fitness center at The 23 in Dallas, Texas",
    "Fitness",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717528162/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/wlenigfbgwjl8r7i1ajy.jpg",
    "Fitness center with free weights at The 23 in Dallas, Texas",
    "Fitness",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717528161/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/rkl1dpcttbcdcglixr6t.jpg",
    "Resident lounge at The 23 in Dallas, Texas",
    "Lounge",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606886/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/Catering_Kitchen_-_1_s6szzb.jpg",
    "Catering kitchen and seating area at The 23 in Dallas, Texas",
    "Amenity",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606886/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/Catering_Kitchen_vdk0vl.jpg",
    "Common seating area near catering kitchen at The 23 in Dallas, Texas",
    "Amenity",
  ],
  [
    "https://res.cloudinary.com/g5-assets-cld/image/upload/x_426,y_433,h_2012,w_3016,c_crop/q_auto,f_auto,fl_lossy,g_center,h_667,w_1000/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/gmftgvk2knue53qmfqiu.jpg",
    "Game room at The 23 in Dallas, Texas",
    "Amenity",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717528161/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/nnztg4lguf0da72ofarc.jpg",
    "Lounge seating area at The 23 in Dallas, Texas",
    "Lounge",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717528160/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/ga4y21cmdp3ej74fwdsw.jpg",
    "Lobby seating area at The 23 in Dallas, Texas",
    "Lobby",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717528160/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/qlv4fucvqmxfbwf7huou.jpg",
    "Leasing office at The 23 in Dallas, Texas",
    "Lobby",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717528160/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/gkeiln429xcpahzup8hh.jpg",
    "Indoor seating area at The 23 in Dallas, Texas",
    "Amenity",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717528160/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/oslsfqjlzysumzxmtwzn.jpg",
    "Resident mailbox area at The 23 in Dallas, Texas",
    "Amenity",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606884/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/9927_yac6qm.jpg",
    "City view from The 23 in Dallas, Texas",
    "View",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606881/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/9669_sdings.jpg",
    "Modern kitchen at The 23 in Dallas, Texas",
    "Kitchen",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606892/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/The_23_4_znlnj5.jpg",
    "Kitchen with counter space at The 23 in Dallas, Texas",
    "Kitchen",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606876/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/23_New_LR_EDT_vflm96.jpg",
    "Kitchen with island at The 23 in Dallas, Texas",
    "Kitchen",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606872/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/1_BR_Kitchen_jh1qke.jpg",
    "Kitchen and living room at The 23 in Dallas, Texas",
    "Kitchen",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717528164/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/wpzrb77k32xfvzasrr07.jpg",
    "Spacious living room at The 23 in Dallas, Texas",
    "Interior",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606876/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/1_BR_Living_Room_-_1_stflyb.jpg",
    "Stylish living room at The 23 in Dallas, Texas",
    "Interior",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606876/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/1_BR_Living_Room_wltwgt.jpg",
    "Living room with balcony access at The 23 in Dallas, Texas",
    "Interior",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606893/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/The_23_5_bxqdcx.jpg",
    "Bedroom at The 23 in Dallas, Texas",
    "Bedroom",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606883/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/9709_kuc2m5.jpg",
    "Bathroom with shower attached to bedroom at The 23 in Dallas, Texas",
    "Bathroom",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606895/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/The_23_11_ewrrhb.jpg",
    "Bedroom with natural light at The 23 in Dallas, Texas",
    "Bedroom",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606893/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/The_23_10_u2wys4.jpg",
    "Bathroom with dual vanity at The 23 in Dallas, Texas",
    "Bathroom",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606877/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/23_New_LR_EDT-36_cca4zx.jpg",
    "Bathroom with walk-in shower at The 23 in Dallas, Texas",
    "Bathroom",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606883/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/9737_jllvwn.jpg",
    "Bedroom with ample lighting at The 23 in Dallas, Texas",
    "Bedroom",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717528164/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/mtlogdlnhpdad5n8fnf4.jpg",
    "In-unit washer and dryer at The 23 in Dallas, Texas",
    "Interior",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606881/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/9692_tqnbfd.jpg",
    "Spacious patio at The 23 in Dallas, Texas",
    "Outdoor",
  ],
  [
    "https://g5-assets-cld-res.cloudinary.com/image/upload/q_auto,f_auto,c_fill,g_center,h_667,w_1000/v1717606895/g5/g5-c-i9pvh23w-carter-haston-holdings/g5-cl-1ovq5rize2-carter-haston-holdings-dallas-tx/uploads/The_23_13_cz9nck.jpg",
    "Patio with city views at The 23 in Dallas, Texas",
    "Outdoor",
  ],
];

const photos = await verifyPhotos(
  photoSources.map(([url, alt, category], index) => ({
    id: `${PROPERTY_ID}-gallery-${String(index + 1).padStart(2, "0")}`,
    name: alt,
    category,
    url,
    alt,
  }))
);

const existing = await getExistingProperty();
const previousPhotoCount = existing.data.photos?.length || 0;
const updatedData = {
  ...existing.data,
  photos,
  image: photos[0].url,
  sourceUrl: SOURCE_URL,
  updated: "The 23 gallery replaced with verified official property photos",
};

await updateProperty(existing.id, updatedData);

console.log(
  JSON.stringify(
    {
      id: existing.id,
      previousPhotoCount,
      photoCount: photos.length,
      image: updatedData.image,
      categories: [...new Set(photos.map((photo) => photo.category))],
    },
    null,
    2
  )
);

async function verifyPhotos(photosToVerify) {
  const seenUrls = new Set();

  for (const photo of photosToVerify) {
    if (!photo.url.includes(MEDIA_PATH) || !/\.(jpe?g|png|webp)$/i.test(photo.url)) {
      throw new Error(`Invalid The 23 gallery URL: ${photo.url}`);
    }

    if (seenUrls.has(photo.url)) {
      throw new Error(`Duplicate The 23 gallery URL: ${photo.url}`);
    }

    seenUrls.add(photo.url);

    const response = await fetch(photo.url, { method: "HEAD" });
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok || !contentType.startsWith("image/")) {
      throw new Error(`The 23 photo failed verification (${response.status} ${contentType}): ${photo.url}`);
    }
  }

  return photosToVerify;
}

async function getExistingProperty() {
  const response = await supabaseFetch(
    `/rest/v1/properties?id=eq.${encodeURIComponent(PROPERTY_ID)}&select=id,data`
  );
  const rows = await response.json();
  const [property] = rows;

  if (!property) {
    throw new Error(`Could not find ${PROPERTY_NAME} (${PROPERTY_ID}) in Supabase.`);
  }

  return property;
}

async function updateProperty(id, data) {
  await supabaseFetch(`/rest/v1/properties?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ data }),
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

function readEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(".env", "utf8")
      .split(/\n/)
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        return [key, value];
      })
  );
}
