import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, ImagePlus, Save, Star, X } from "lucide-react";
import {
  createStoredProperty,
  getAnyPropertyById,
  updateStoredProperty,
} from "../data/propertyStorage";

const emptyPropertyDraft = {
  name: "",
  area: "",
  manager: "",
  managementCompany: "",
  address: "",
  city: "",
  state: "",
  zipcode: "",
  rent: "",
  marketRent: "",
  effectiveRent: "",
  savings: "",
  belowMarketPercent: "",
  status: "Draft",
  special: "",
  image: "",
  photos: [],
  floorPlans: "",
  bedrooms: "",
};

const MAX_UPLOAD_COUNT = 8;
const MAX_UPLOAD_SIZE = 1.5 * 1024 * 1024;

export default function PropertyFormPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const existingProperty = propertyId ? getAnyPropertyById(propertyId) : null;
  const isEditing = Boolean(propertyId);
  const [saveError, setSaveError] = useState("");
  const [propertyDraft, setPropertyDraft] = useState(() =>
    existingProperty ? createDraftFromProperty(existingProperty) : emptyPropertyDraft
  );

  const updateDraft = (field, value) => {
    setPropertyDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const uploadPhotos = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (files.length === 0) return;

    const remainingSlots = MAX_UPLOAD_COUNT - propertyDraft.photos.length;
    const acceptedFiles = files.slice(0, remainingSlots);
    const oversizedFile = acceptedFiles.find((file) => file.size > MAX_UPLOAD_SIZE);

    if (remainingSlots <= 0) {
      setSaveError(`You can upload up to ${MAX_UPLOAD_COUNT} property photos.`);
      return;
    }

    if (oversizedFile) {
      setSaveError("Each uploaded photo must be 1.5 MB or smaller.");
      return;
    }

    try {
      const uploadedPhotos = await Promise.all(acceptedFiles.map(readPhotoFile));

      setPropertyDraft((currentDraft) => ({
        ...currentDraft,
        image: currentDraft.image || uploadedPhotos[0]?.url || "",
        photos: [...currentDraft.photos, ...uploadedPhotos],
      }));
      setSaveError("");
    } catch (error) {
      console.error(error);
      setSaveError("Could not upload photos. Please try smaller image files.");
    }
  };

  const removePhoto = (photoId) => {
    setPropertyDraft((currentDraft) => {
      const nextPhotos = currentDraft.photos.filter((photo) => photo.id !== photoId);
      const removedPrimary = currentDraft.photos.find((photo) => photo.id === photoId)
        ?.url === currentDraft.image;

      return {
        ...currentDraft,
        image: removedPrimary ? nextPhotos[0]?.url || "" : currentDraft.image,
        photos: nextPhotos,
      };
    });
  };

  const setPrimaryPhoto = (photoId) => {
    setPropertyDraft((currentDraft) => {
      const photo = currentDraft.photos.find((item) => item.id === photoId);

      return {
        ...currentDraft,
        image: photo?.url || currentDraft.image,
        photos: photo
          ? [photo, ...currentDraft.photos.filter((item) => item.id !== photoId)]
          : currentDraft.photos,
      };
    });
  };

  const saveProperty = (event) => {
    event.preventDefault();
    setSaveError("");

    if (!propertyDraft.name.trim()) {
      setSaveError("Property name is required.");
      return;
    }

    if (!propertyDraft.area.trim() && !propertyDraft.city.trim()) {
      setSaveError("Add a market area or city.");
      return;
    }

    const propertyPayload = {
      ...propertyDraft,
      name: propertyDraft.name.trim(),
      area: propertyDraft.area.trim(),
      manager: propertyDraft.manager.trim() || "Not assigned",
      managementCompany:
        propertyDraft.managementCompany.trim() ||
        propertyDraft.manager.trim() ||
        "Not assigned",
      address: propertyDraft.address.trim(),
      city: propertyDraft.city.trim(),
      state: propertyDraft.state.trim(),
      zipcode: propertyDraft.zipcode.trim(),
      rent: propertyDraft.rent.trim() || "Contact for pricing",
      marketRent: propertyDraft.marketRent.trim(),
      effectiveRent: propertyDraft.effectiveRent.trim() || propertyDraft.rent.trim(),
      savings: propertyDraft.savings.trim(),
      belowMarketPercent: propertyDraft.belowMarketPercent.trim(),
      special: propertyDraft.special.trim(),
      image: propertyDraft.image.trim() || propertyDraft.photos[0]?.url || "",
      photos: propertyDraft.photos,
      floorPlans: splitList(propertyDraft.floorPlans),
      bedrooms: splitList(propertyDraft.bedrooms),
    };

    try {
      const savedProperty = isEditing
        ? updateStoredProperty(propertyId, propertyPayload)
        : createStoredProperty(propertyPayload);

      navigate(`/admin/properties/${savedProperty.id}`);
    } catch (error) {
      console.error(error);
      setSaveError("Could not save this property. Try fewer or smaller photos.");
    }
  };

  if (isEditing && !existingProperty) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900">Property not found</h1>
        <p className="mt-2 text-slate-500">
          This property ID does not match any property in your current data.
        </p>
        <Link
          to="/admin/properties"
          className="mt-6 inline-block rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
        >
          Back to Properties
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/admin/properties"
        className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Properties
      </Link>

      <div className="mt-6 rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-300">
              {isEditing ? "Edit Property" : "Add Property"}
            </p>
            <h1 className="mt-1 text-4xl font-black">
              {propertyDraft.name || "New Property"}
            </h1>
          </div>
        </div>
      </div>

      <form onSubmit={saveProperty} className="mt-6 space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Property Name"
              value={propertyDraft.name}
              onChange={(value) => updateDraft("name", value)}
              required
            />
            <FormField
              label="Property Manager"
              value={propertyDraft.manager}
              onChange={(value) => updateDraft("manager", value)}
            />
            <FormField
              label="Management Company"
              value={propertyDraft.managementCompany}
              onChange={(value) => updateDraft("managementCompany", value)}
            />
            <FormField
              label="Market Area"
              value={propertyDraft.area}
              onChange={(value) => updateDraft("area", value)}
            />
            <FormField
              label="Address"
              value={propertyDraft.address}
              onChange={(value) => updateDraft("address", value)}
            />
            <FormField
              label="City"
              value={propertyDraft.city}
              onChange={(value) => updateDraft("city", value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="State"
                value={propertyDraft.state}
                onChange={(value) => updateDraft("state", value)}
              />
              <FormField
                label="ZIP"
                value={propertyDraft.zipcode}
                onChange={(value) => updateDraft("zipcode", value)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Starting Rent"
              value={propertyDraft.rent}
              onChange={(value) => updateDraft("rent", value)}
            />
            <FormField
              label="Effective Rent"
              value={propertyDraft.effectiveRent}
              onChange={(value) => updateDraft("effectiveRent", value)}
            />
            <FormField
              label="Market Rent"
              value={propertyDraft.marketRent}
              onChange={(value) => updateDraft("marketRent", value)}
            />
            <FormField
              label="Savings"
              value={propertyDraft.savings}
              onChange={(value) => updateDraft("savings", value)}
            />
            <FormField
              label="Below Market Percent"
              value={propertyDraft.belowMarketPercent}
              onChange={(value) => updateDraft("belowMarketPercent", value)}
            />
            <label className="rounded-2xl bg-slate-50 p-4">
              <span className="text-sm font-semibold text-slate-500">
                Listing Status
              </span>
              <select
                value={propertyDraft.status}
                onChange={(event) => updateDraft("status", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-black text-slate-900 outline-none focus:border-slate-400"
              >
                <option>Live</option>
                <option>Pending Review</option>
                <option>Draft</option>
              </select>
            </label>
            <FormField
              label="Current Special"
              value={propertyDraft.special}
              onChange={(value) => updateDraft("special", value)}
            />
            <FormField
              label="Image URL"
              value={propertyDraft.image}
              onChange={(value) => updateDraft("image", value)}
            />
            <FormField
              label="Floor Plans"
              value={propertyDraft.floorPlans}
              onChange={(value) => updateDraft("floorPlans", value)}
            />
            <FormField
              label="Bedrooms"
              value={propertyDraft.bedrooms}
              onChange={(value) => updateDraft("bedrooms", value)}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Property Photos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {propertyDraft.photos.length} of {MAX_UPLOAD_COUNT} uploaded
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
              <ImagePlus className="h-4 w-4" />
              Upload Photos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={uploadPhotos}
                className="sr-only"
              />
            </label>
          </div>

          {propertyDraft.photos.length > 0 && (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {propertyDraft.photos.map((photo) => {
                const isPrimaryPhoto = photo.url === propertyDraft.image;

                return (
                  <div
                    key={photo.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="h-36 w-full object-cover"
                    />

                    <div className="space-y-3 p-3">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {photo.name}
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPrimaryPhoto(photo.id)}
                          className={`inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold ${isPrimaryPhoto
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                        >
                          <Star className="h-3.5 w-3.5" />
                          Primary
                        </button>

                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="inline-flex items-center justify-center rounded-xl bg-red-100 px-3 py-2 text-red-700 hover:bg-red-200"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {saveError && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {saveError}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            <Save className="h-4 w-4" />
            {isEditing ? "Save Property" : "Create Property"}
          </button>

          <Link
            to="/admin/properties"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, value, onChange, required = false }) {
  return (
    <label className="rounded-2xl bg-slate-50 p-4">
      <span className="text-sm font-semibold text-slate-500">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-black text-slate-900 outline-none focus:border-slate-400"
      />
    </label>
  );
}

function createDraftFromProperty(property) {
  return {
    name: property.name || "",
    area: property.area || "",
    manager: property.manager || "",
    managementCompany: property.managementCompany || property.manager || "",
    address: property.address || "",
    city: property.city || "",
    state: property.state || "",
    zipcode: property.zipcode || property.zip || "",
    rent: property.rent || "",
    marketRent: property.marketRent || "",
    effectiveRent: property.effectiveRent || "",
    savings: property.savings || "",
    belowMarketPercent: property.belowMarketPercent || "",
    status: property.status || "Draft",
    special: property.special || "",
    image: property.image || "",
    photos: normalizePropertyPhotos(property),
    floorPlans: (property.floorPlans || []).join(", "),
    bedrooms: (property.bedrooms || []).join(", "),
  };
}

function normalizePropertyPhotos(property) {
  if (property.photos?.length > 0) {
    return property.photos.map((photo, index) => ({
      id: photo.id || `${property.id}-photo-${index}`,
      name: photo.name || `Photo ${index + 1}`,
      url: photo.url,
      category: photo.category || "Property",
    }));
  }

  if (property.image) {
    return [
      {
        id: `${property.id}-primary-photo`,
        name: `${property.name} primary photo`,
        url: property.image,
        category: "Property",
      },
    ];
  }

  return [];
}

function readPhotoFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        id: `${file.name}-${file.lastModified}-${Date.now()}`,
        name: file.name,
        url: reader.result,
        category: "Property",
      });
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
