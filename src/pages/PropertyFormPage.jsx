import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, ImagePlus, Plus, Save, Star, X } from "lucide-react";
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
  floorPlans: [createBlankFloorPlan()],
  bedrooms: "",
};

const MAX_UPLOAD_COUNT = 8;
const MAX_UPLOAD_SIZE = 1.5 * 1024 * 1024;
const LEASING_WEEKS_PER_MONTH = 4;
const WEEKS_FREE_OPTIONS = Array.from({ length: 25 }, (_, index) => index * 0.5);
const LEASE_TERM_OPTIONS = ["6", "9", "12", "13", "14", "15", "18"];

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

  const updateFloorPlan = (floorPlanId, field, value) => {
    setPropertyDraft((currentDraft) => ({
      ...currentDraft,
      floorPlans: currentDraft.floorPlans.map((floorPlan) =>
        floorPlan.id === floorPlanId
          ? {
              ...floorPlan,
              [field]: value,
            }
          : floorPlan
      ),
    }));
  };

  const updateFloorPlanAvailability = (floorPlanId, availabilityId, field, value) => {
    setPropertyDraft((currentDraft) => ({
      ...currentDraft,
      floorPlans: currentDraft.floorPlans.map((floorPlan) =>
        floorPlan.id === floorPlanId
          ? {
              ...floorPlan,
              availableUnits: floorPlan.availableUnits.map((availableUnit) =>
                availableUnit.id === availabilityId
                  ? {
                      ...availableUnit,
                      [field]: value,
                    }
                  : availableUnit
              ),
            }
          : floorPlan
      ),
    }));
  };

  const addFloorPlanAvailability = (floorPlanId) => {
    setPropertyDraft((currentDraft) => ({
      ...currentDraft,
      floorPlans: currentDraft.floorPlans.map((floorPlan) =>
        floorPlan.id === floorPlanId
          ? {
              ...floorPlan,
              availableUnits: [
                ...floorPlan.availableUnits,
                createBlankAvailableUnit(),
              ],
            }
          : floorPlan
      ),
    }));
  };

  const removeFloorPlanAvailability = (floorPlanId, availabilityId) => {
    setPropertyDraft((currentDraft) => ({
      ...currentDraft,
      floorPlans: currentDraft.floorPlans.map((floorPlan) =>
        floorPlan.id === floorPlanId
          ? {
              ...floorPlan,
              availableUnits:
                floorPlan.availableUnits.length > 1
                  ? floorPlan.availableUnits.filter(
                      (availableUnit) => availableUnit.id !== availabilityId
                    )
                  : floorPlan.availableUnits,
            }
          : floorPlan
      ),
    }));
  };

  const addFloorPlan = () => {
    setPropertyDraft((currentDraft) => ({
      ...currentDraft,
      floorPlans: [...currentDraft.floorPlans, createBlankFloorPlan()],
    }));
  };

  const removeFloorPlan = (floorPlanId) => {
    setPropertyDraft((currentDraft) => ({
      ...currentDraft,
      floorPlans:
        currentDraft.floorPlans.length > 1
          ? currentDraft.floorPlans.filter((floorPlan) => floorPlan.id !== floorPlanId)
          : currentDraft.floorPlans,
    }));
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

    const floorPlans = propertyDraft.floorPlans
      .map(normalizeFloorPlanForStorage)
      .filter((floorPlan) => floorPlan.name && floorPlan.rent);

    if (floorPlans.length === 0) {
      setSaveError("Add at least one floor plan with a name and starting rent.");
      return;
    }

    const primaryFloorPlan = floorPlans[0];

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
      rent: primaryFloorPlan.rent || "Contact for pricing",
      marketRent: primaryFloorPlan.marketRent,
      effectiveRent: primaryFloorPlan.effectiveRent || primaryFloorPlan.rent,
      savings: primaryFloorPlan.savings,
      belowMarketPercent: primaryFloorPlan.belowMarketPercent,
      special: primaryFloorPlan.currentSpecial,
      image: propertyDraft.image.trim() || propertyDraft.photos[0]?.url || "",
      photos: propertyDraft.photos,
      floorPlans,
      bedrooms: [
        ...new Set(floorPlans.map((floorPlan) => floorPlan.beds).filter(Boolean)),
      ],
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
              label="Image URL"
              value={propertyDraft.image}
              onChange={(value) => updateDraft("image", value)}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Floor Plans
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {propertyDraft.floorPlans.length} floor plan
                {propertyDraft.floorPlans.length === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={addFloorPlan}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add Floor Plan
            </button>
          </div>

          <div className="mt-5 space-y-5">
            {propertyDraft.floorPlans.map((floorPlan, index) => (
              <FloorPlanEditor
                key={floorPlan.id}
                floorPlan={floorPlan}
                index={index}
                canRemove={propertyDraft.floorPlans.length > 1}
                onChange={updateFloorPlan}
                onRemove={removeFloorPlan}
                onAvailabilityChange={updateFloorPlanAvailability}
                onAvailabilityAdd={addFloorPlanAvailability}
                onAvailabilityRemove={removeFloorPlanAvailability}
              />
            ))}
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

function FloorPlanEditor({
  floorPlan,
  index,
  canRemove,
  onChange,
  onRemove,
  onAvailabilityChange,
  onAvailabilityAdd,
  onAvailabilityRemove,
}) {
  const calculatedValues = calculateFloorPlanValues(floorPlan);

  return (
    <div
      key={floorPlan.id}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h3 className="text-lg font-black text-slate-900">
          Floor Plan {index + 1}
        </h3>

        <button
          type="button"
          onClick={() => onRemove(floorPlan.id)}
          disabled={!canRemove}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-100 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          <X className="h-4 w-4" />
          Remove
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FormField
          label="Floor Plan Name"
          value={floorPlan.name}
          onChange={(value) => onChange(floorPlan.id, "name", value)}
        />
        <FormField
          label="Bedrooms"
          value={floorPlan.bedrooms}
          onChange={(value) => onChange(floorPlan.id, "bedrooms", value)}
        />
        <FormField
          label="Bathrooms"
          value={floorPlan.bathrooms}
          onChange={(value) => onChange(floorPlan.id, "bathrooms", value)}
        />
        <FormField
          label="Square Feet"
          value={floorPlan.squareFeet}
          onChange={(value) => onChange(floorPlan.id, "squareFeet", value)}
        />
        <FormField
          label="Starting Rent"
          value={floorPlan.startingRent}
          onChange={(value) => onChange(floorPlan.id, "startingRent", value)}
        />
        <FormField
          label="Market Rent"
          value={floorPlan.marketRent}
          onChange={(value) => onChange(floorPlan.id, "marketRent", value)}
        />
        <label className="rounded-2xl bg-white p-4">
          <span className="text-sm font-semibold text-slate-500">
            Current Special
          </span>
          <select
            value={String(floorPlan.freeWeeks)}
            onChange={(event) => onChange(floorPlan.id, "freeWeeks", event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-black text-slate-900 outline-none focus:border-slate-400"
          >
            {WEEKS_FREE_OPTIONS.map((weeks) => (
              <option key={weeks} value={String(weeks)}>
                {weeks === 0 ? "No free weeks" : `${weeks} weeks free`}
              </option>
            ))}
          </select>
        </label>
        <label className="rounded-2xl bg-white p-4">
          <span className="text-sm font-semibold text-slate-500">
            Lease Term
          </span>
          <select
            value={String(floorPlan.leaseTermMonths)}
            onChange={(event) =>
              onChange(floorPlan.id, "leaseTermMonths", event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-black text-slate-900 outline-none focus:border-slate-400"
          >
            {LEASE_TERM_OPTIONS.map((months) => (
              <option key={months} value={months}>
                {months} months
              </option>
            ))}
          </select>
        </label>
        <CalculatedField label="Effective Rent" value={calculatedValues.effectiveRent} />
        <CalculatedField label="Savings" value={calculatedValues.savings} />
        <CalculatedField
          label="Below Market Percent"
          value={calculatedValues.belowMarketPercent}
        />
        <label className="rounded-2xl bg-white p-4">
          <span className="text-sm font-semibold text-slate-500">
            Status
          </span>
          <select
            value={floorPlan.status}
            onChange={(event) => onChange(floorPlan.id, "status", event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-black text-slate-900 outline-none focus:border-slate-400"
          >
            <option value="available">Available</option>
            <option value="limited">Limited</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>
        <label className="rounded-2xl bg-white p-4 md:col-span-2 xl:col-span-3">
          <span className="text-sm font-semibold text-slate-500">
            Notes
          </span>
          <input
            type="text"
            value={floorPlan.notes}
            onChange={(event) => onChange(floorPlan.id, "notes", event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-black text-slate-900 outline-none focus:border-slate-400"
          />
        </label>
      </div>

      <div className="mt-5 rounded-2xl bg-white p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h4 className="text-base font-black text-slate-900">
              Available Dates
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {floorPlan.availableUnits.length} availability row
              {floorPlan.availableUnits.length === 1 ? "" : "s"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onAvailabilityAdd(floorPlan.id)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add Date
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {floorPlan.availableUnits.map((availableUnit, availabilityIndex) => (
            <div
              key={availableUnit.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <p className="text-sm font-black text-slate-900">
                  Availability {availabilityIndex + 1}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onAvailabilityRemove(floorPlan.id, availableUnit.id)
                  }
                  disabled={floorPlan.availableUnits.length === 1}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <FormField
                  label="Unit"
                  value={availableUnit.unit}
                  onChange={(value) =>
                    onAvailabilityChange(floorPlan.id, availableUnit.id, "unit", value)
                  }
                />
                <FormField
                  label="Available Date"
                  type="date"
                  value={availableUnit.availableDate}
                  onChange={(value) =>
                    onAvailabilityChange(
                      floorPlan.id,
                      availableUnit.id,
                      "availableDate",
                      value
                    )
                  }
                />
                <FormField
                  label="Unit Rent"
                  value={availableUnit.rent}
                  onChange={(value) =>
                    onAvailabilityChange(floorPlan.id, availableUnit.id, "rent", value)
                  }
                />
                <label className="rounded-2xl bg-white p-4">
                  <span className="text-sm font-semibold text-slate-500">
                    Unit Status
                  </span>
                  <select
                    value={availableUnit.status}
                    onChange={(event) =>
                      onAvailabilityChange(
                        floorPlan.id,
                        availableUnit.id,
                        "status",
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-black text-slate-900 outline-none focus:border-slate-400"
                  >
                    <option value="available">Available</option>
                    <option value="pending">Pending</option>
                    <option value="leased">Leased</option>
                  </select>
                </label>
                <FormField
                  label="Note"
                  value={availableUnit.notes}
                  onChange={(value) =>
                    onAvailabilityChange(floorPlan.id, availableUnit.id, "notes", value)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, required = false, type = "text" }) {
  return (
    <label className="rounded-2xl bg-slate-50 p-4">
      <span className="text-sm font-semibold text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-black text-slate-900 outline-none focus:border-slate-400"
      />
    </label>
  );
}

function CalculatedField({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <span className="text-sm font-semibold text-slate-500">
        {label}
      </span>
      <p className="mt-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 font-black text-slate-900">
        {value || "Calculated"}
      </p>
    </div>
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
    floorPlans: normalizeFloorPlansForDraft(property),
    bedrooms: (property.bedrooms || []).join(", "),
  };
}

function createBlankFloorPlan() {
  return {
    id: `floor-plan-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    startingRent: "",
    effectiveRent: "",
    marketRent: "",
    savings: "",
    belowMarketPercent: "",
    currentSpecial: "",
    freeWeeks: "0",
    leaseTermMonths: "12",
    availability: "",
    availableUnits: [createBlankAvailableUnit()],
    status: "available",
    notes: "",
  };
}

function createBlankAvailableUnit() {
  return {
    id: `availability-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    unit: "",
    availableDate: "",
    rent: "",
    status: "available",
    notes: "",
  };
}

function normalizeFloorPlansForDraft(property) {
  if (property.floorPlans?.length > 0) {
    return property.floorPlans.map((floorPlan, index) => {
      if (typeof floorPlan === "string") {
        return {
          ...createBlankFloorPlan(),
          id: `${property.id}-floor-plan-${index}`,
          name: floorPlan,
          bedrooms: property.bedrooms?.[0] || "",
          startingRent: property.rent || "",
          effectiveRent: property.effectiveRent || "",
          marketRent: property.marketRent || "",
          freeWeeks: "0",
          leaseTermMonths: "12",
          availableUnits: normalizeAvailableUnitsForDraft([], property.rent || ""),
          };
      }

      const currentSpecialLabel = floorPlan.currentSpecial || floorPlan.special?.label || "";
      const parsedFreeWeeks = floorPlan.freeWeeks ?? floorPlan.special?.freeWeeks ?? getWeeksFromSpecialLabel(currentSpecialLabel);

      return {
        ...createBlankFloorPlan(),
        id: floorPlan.id || `${property.id}-floor-plan-${index}`,
        name: floorPlan.name || "",
        bedrooms: floorPlan.bedrooms || floorPlan.beds || "",
        bathrooms: floorPlan.bathrooms || floorPlan.baths || "",
        squareFeet: floorPlan.squareFeet || floorPlan.sqft || "",
        startingRent: floorPlan.startingRent || floorPlan.rent || "",
        marketRent: floorPlan.marketRent || "",
        freeWeeks: String(parsedFreeWeeks || 0),
        leaseTermMonths: String(floorPlan.leaseTermMonths || floorPlan.special?.leaseTermMonths || 12),
        availability: floorPlan.availability || floorPlan.available || "",
        availableUnits: normalizeAvailableUnitsForDraft(
          floorPlan.availableUnits,
          floorPlan.startingRent || floorPlan.rent || ""
        ),
        status: floorPlan.status || "available",
        notes: floorPlan.notes || "",
      };
    });
  }

  return [createBlankFloorPlan()];
}

function normalizeFloorPlanForStorage(floorPlan) {
  const name = floorPlan.name.trim();
  const startingRent = floorPlan.startingRent.trim();
  const calculatedValues = calculateFloorPlanValues(floorPlan);
  const freeWeeks = Number(floorPlan.freeWeeks || 0);
  const leaseTermMonths = Number(floorPlan.leaseTermMonths || 12);
  const currentSpecial = getSpecialLabel(freeWeeks);
  const availableUnits = floorPlan.availableUnits
    .map((availableUnit, index) =>
      normalizeAvailableUnitForStorage(
        availableUnit,
        index,
        floorPlan.startingRent
      )
    )
    .filter((availableUnit) =>
      [availableUnit.unit, availableUnit.availableDate, availableUnit.rent].some(Boolean)
    );

  return {
    id: floorPlan.id,
    name,
    bedrooms: floorPlan.bedrooms.trim(),
    beds: floorPlan.bedrooms.trim(),
    bathrooms: floorPlan.bathrooms.trim(),
    baths: floorPlan.bathrooms.trim(),
    squareFeet: floorPlan.squareFeet.trim(),
    sqft: floorPlan.squareFeet.trim(),
    startingRent,
    rent: startingRent,
    effectiveRent: calculatedValues.effectiveRent,
    marketRent: floorPlan.marketRent.trim(),
    savings: calculatedValues.savings,
    belowMarketPercent: calculatedValues.belowMarketPercent,
    currentSpecial,
    freeWeeks,
    leaseTermMonths,
    special: freeWeeks > 0
      ? {
          type: "weeks_free",
          freeWeeks,
          leaseTermMonths,
          label: currentSpecial,
        }
      : null,
    availability: getFloorPlanAvailabilityLabel(availableUnits),
    available: getFloorPlanAvailabilityLabel(availableUnits),
    status: floorPlan.status,
    notes: floorPlan.notes.trim(),
    availableUnits,
  };
}

function normalizeAvailableUnitsForDraft(availableUnits = [], defaultRent = "") {
  if (availableUnits.length === 0) {
    return [createBlankAvailableUnit()];
  }

  return availableUnits.map((availableUnit, index) => ({
    ...createBlankAvailableUnit(),
    id: availableUnit.id || `availability-${index}`,
    unit: availableUnit.unit || "",
    availableDate: availableUnit.availableDate || getDateFromAvailabilityLabel(availableUnit.available),
    rent: availableUnit.rent || defaultRent,
    status: availableUnit.status || "available",
    notes: availableUnit.notes || "",
  }));
}

function normalizeAvailableUnitForStorage(availableUnit, index, defaultRent) {
  const unitLabel = availableUnit.unit.trim() || `Option ${index + 1}`;
  const availableDate = availableUnit.availableDate;

  return {
    id: availableUnit.id,
    unit: unitLabel,
    availableDate,
    available: formatAvailableDate(availableDate),
    rent: availableUnit.rent.trim() || defaultRent.trim(),
    status: availableUnit.status,
    notes: availableUnit.notes.trim(),
    requestCount: 0,
  };
}

function getFloorPlanAvailabilityLabel(availableUnits) {
  if (availableUnits.length === 0) return "";
  return `${availableUnits.length} available`;
}

function formatAvailableDate(value) {
  if (!value) return "Available Now";

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;

  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return `Available ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function getDateFromAvailabilityLabel(label) {
  const value = String(label || "");
  if (!value || value === "Available Now") return "";

  const parsedDate = new Date(value.replace(/^Available\s+/i, ""));
  if (Number.isNaN(parsedDate.getTime())) return "";

  return [
    parsedDate.getFullYear(),
    String(parsedDate.getMonth() + 1).padStart(2, "0"),
    String(parsedDate.getDate()).padStart(2, "0"),
  ].join("-");
}

function calculateFloorPlanValues(floorPlan) {
  const startingRentNumber = parseCurrency(floorPlan.startingRent);
  const marketRentNumber = parseCurrency(floorPlan.marketRent);
  const freeWeeks = Number(floorPlan.freeWeeks || 0);
  const leaseTermMonths = Number(floorPlan.leaseTermMonths || 12);

  if (!startingRentNumber || !leaseTermMonths) {
    return {
      effectiveRent: "",
      savings: "",
      belowMarketPercent: "",
    };
  }

  const freeMonths = freeWeeks / LEASING_WEEKS_PER_MONTH;
  const monthlyConcession = (startingRentNumber * freeMonths) / leaseTermMonths;
  const effectiveRentNumber = Math.max(startingRentNumber - monthlyConcession, 0);
  const comparisonRent = marketRentNumber || startingRentNumber;
  const savingsNumber = Math.max(comparisonRent - effectiveRentNumber, 0);
  const belowMarketPercentNumber = comparisonRent
    ? Math.round((savingsNumber / comparisonRent) * 100)
    : 0;

  return {
    effectiveRent: formatCurrency(effectiveRentNumber),
    savings: savingsNumber ? `${formatCurrency(savingsNumber)}/mo` : "$0/mo",
    belowMarketPercent: `${belowMarketPercentNumber}%`,
  };
}

function parseCurrency(value) {
  const parsedValue = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatCurrency(value) {
  return `$${Math.round(value).toLocaleString()}`;
}

function getSpecialLabel(freeWeeks) {
  if (!freeWeeks) return "";
  return `${freeWeeks} ${freeWeeks === 1 ? "week" : "weeks"} free`;
}

function getWeeksFromSpecialLabel(label) {
  const match = String(label || "").match(/(\d+(?:\.\d+)?)\s*weeks?/i);
  return match ? Number(match[1]) : 0;
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
