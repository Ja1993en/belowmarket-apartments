import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, ImagePlus, Plus, Save, Star, X } from "lucide-react";
import {
  createStoredProperty,
  getAnyPropertyById,
  updateStoredProperty,
} from "../data/propertyStorage";
import {
  createStoredManagementCompany,
  getAllManagementCompanies,
  getManagementCompanyById,
  getManagementCompanyIdByName,
} from "../data/managementCompanyStorage";
import { getPhotoImageUrl } from "../data/propertySearchData";

const emptyPropertyDraft = {
  name: "",
  area: "",
  manager: "",
  managementCompanyId: "",
  managementCompany: "",
  newManagementCompanyName: "",
  address: "",
  city: "",
  state: "",
  zipcode: "",
  yearBuilt: "",
  yearRenovated: "",
  propertyClass: "",
  benchmarkClass: "",
  assetClass: "",
  realPage: null,
  amenities: [],
  communityAmenities: [],
  apartmentAmenities: [],
  unitFeatures: [],
  rent: "",
  marketRent: "",
  requiredMonthlyFees: "",
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
const MAX_FLOOR_PLAN_UPLOAD_COUNT = 4;
const MAX_UPLOAD_SIZE = 12 * 1024 * 1024;
const PROPERTY_PHOTO_MAX_DIMENSION = 1100;
const FLOOR_PLAN_PHOTO_MAX_DIMENSION = 850;
const PROPERTY_PHOTO_TARGET_BYTES = 180 * 1024;
const FLOOR_PLAN_PHOTO_TARGET_BYTES = 120 * 1024;
const LEASING_WEEKS_PER_MONTH = 4;
const WEEKS_FREE_OPTIONS = Array.from({ length: 25 }, (_, index) => index * 0.5);
const LEASE_TERM_OPTIONS = ["6", "9", "12", "13", "14", "15", "18"];
const FEE_SPECIAL_TYPES = [
  { value: "admin", label: "Admin fee" },
  { value: "application", label: "Application fee" },
];
const NEW_MANAGEMENT_COMPANY_VALUE = "__new_management_company__";

export default function PropertyFormPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const existingProperty = propertyId ? getAnyPropertyById(propertyId) : null;
  const isEditing = Boolean(propertyId);
  const [saveError, setSaveError] = useState("");
  const [managementCompanies, setManagementCompanies] = useState(() =>
    getAllManagementCompanies()
  );
  const [propertyDraft, setPropertyDraft] = useState(() =>
    existingProperty ? createDraftFromProperty(existingProperty) : emptyPropertyDraft
  );

  const updateDraft = (field, value) => {
    if (saveError) {
      setSaveError("");
    }

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
      setSaveError("Each uploaded photo must be 12 MB or smaller.");
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

  const uploadFloorPlanPhotos = async (floorPlanId, event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (files.length === 0) return;

    const floorPlan = propertyDraft.floorPlans.find((item) => item.id === floorPlanId);
    const currentPhotos = floorPlan?.photos || [];
    const remainingSlots = MAX_FLOOR_PLAN_UPLOAD_COUNT - currentPhotos.length;
    const acceptedFiles = files.slice(0, remainingSlots);
    const oversizedFile = acceptedFiles.find((file) => file.size > MAX_UPLOAD_SIZE);

    if (remainingSlots <= 0) {
      setSaveError(`You can upload up to ${MAX_FLOOR_PLAN_UPLOAD_COUNT} photos for each floor plan.`);
      return;
    }

    if (oversizedFile) {
      setSaveError("Each uploaded floor plan photo must be 12 MB or smaller.");
      return;
    }

    try {
      const uploadedPhotos = await Promise.all(
        acceptedFiles.map((file) =>
          readPhotoFile(file, "Floor Plan", {
            maxDimension: FLOOR_PLAN_PHOTO_MAX_DIMENSION,
            targetBytes: FLOOR_PLAN_PHOTO_TARGET_BYTES,
          })
        )
      );

      setPropertyDraft((currentDraft) => ({
        ...currentDraft,
        floorPlans: currentDraft.floorPlans.map((item) => {
          if (item.id !== floorPlanId) return item;

          const nextPhotos = [...(item.photos || []), ...uploadedPhotos];

          return {
            ...item,
            image: item.image || nextPhotos[0]?.url || "",
            photos: nextPhotos,
          };
        }),
      }));
      setSaveError("");
    } catch (error) {
      console.error(error);
      setSaveError("Could not upload floor plan photos. Please try smaller image files.");
    }
  };

  const removeFloorPlanPhoto = (floorPlanId, photoId) => {
    setPropertyDraft((currentDraft) => ({
      ...currentDraft,
      floorPlans: currentDraft.floorPlans.map((floorPlan) => {
        if (floorPlan.id !== floorPlanId) return floorPlan;

        const nextPhotos = (floorPlan.photos || []).filter((photo) => photo.id !== photoId);
        const removedPrimary = (floorPlan.photos || []).find((photo) => photo.id === photoId)
          ?.url === floorPlan.image;

        return {
          ...floorPlan,
          image: removedPrimary ? nextPhotos[0]?.url || "" : floorPlan.image,
          photos: nextPhotos,
        };
      }),
    }));
  };

  const setPrimaryFloorPlanPhoto = (floorPlanId, photoId) => {
    setPropertyDraft((currentDraft) => ({
      ...currentDraft,
      floorPlans: currentDraft.floorPlans.map((floorPlan) => {
        if (floorPlan.id !== floorPlanId) return floorPlan;

        const photo = (floorPlan.photos || []).find((item) => item.id === photoId);

        return {
          ...floorPlan,
          image: photo?.url || floorPlan.image,
          photos: photo
            ? [photo, ...(floorPlan.photos || []).filter((item) => item.id !== photoId)]
            : floorPlan.photos || [],
        };
      }),
    }));
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
    if (saveError) {
      setSaveError("");
    }

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
    if (saveError) {
      setSaveError("");
    }

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

    const selectedManagementCompany = resolveManagementCompany({
      managementCompanies,
      propertyDraft,
      setManagementCompanies,
      setSaveError,
    });

    if (!selectedManagementCompany) {
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
      managementCompanyId: selectedManagementCompany.id,
      managementCompany: selectedManagementCompany.name,
      address: propertyDraft.address.trim(),
      city: propertyDraft.city.trim(),
      state: propertyDraft.state.trim(),
      zipcode: propertyDraft.zipcode.trim(),
      yearBuilt: propertyDraft.yearBuilt.trim(),
      rent: primaryFloorPlan.rent || "Contact for pricing",
      marketRent: primaryFloorPlan.marketRent,
      requiredMonthlyFees: primaryFloorPlan.requiredMonthlyFees,
      effectiveRent: primaryFloorPlan.effectiveRent || primaryFloorPlan.rent,
      monthlyConcession: primaryFloorPlan.monthlyConcession,
      savings: primaryFloorPlan.savings,
      belowMarketPercent: primaryFloorPlan.belowMarketPercent,
      special: primaryFloorPlan.currentSpecial,
      image:
        propertyDraft.photos.map(getPhotoImageUrl).find(Boolean) ||
        propertyDraft.image.trim() ||
        "",
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
      <div className="rounded-3xl border border-[#d7e6df] bg-white p-8 text-left shadow-sm">
        <h1 className="text-3xl font-black text-[#102426]">Property not found</h1>
        <p className="mt-2 font-semibold text-[#526260]">
          This property ID does not match any property in your current data.
        </p>
        <Link
          to="/admin/properties"
          className="mt-6 inline-block rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426]"
        >
          Back to Properties
        </Link>
      </div>
    );
  }

  return (
    <div className="text-left">
      <Link
        to="/admin/properties"
        className="inline-flex items-center gap-2 rounded-2xl bg-[#e7f3ee] px-4 py-3 text-sm font-bold text-[#173f3f] hover:bg-[#d7e6df]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Properties
      </Link>

      <div className="mt-6 rounded-3xl bg-[#102426] p-6 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[#f2b84b] p-3 text-[#102426]">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-black text-[#f2b84b]">
              {isEditing ? "Edit Property" : "Add Property"}
            </p>
            <h1 className="mt-1 text-4xl font-black text-[#fff7df]">
              {propertyDraft.name || "New Property"}
            </h1>
          </div>
        </div>
      </div>

      <form onSubmit={saveProperty} className="mt-6 space-y-6">
        <section className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
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
            <label className="rounded-2xl bg-[#f5f8f1] p-4">
              <span className="text-sm font-semibold text-[#526260]">
                Management Company
              </span>
              <select
                value={propertyDraft.managementCompanyId}
                onChange={(event) =>
                  setPropertyDraft((currentDraft) => ({
                    ...currentDraft,
                    managementCompanyId: event.target.value,
                    managementCompany:
                      getManagementCompanyById(event.target.value)?.name || "",
                  }))
                }
                className="mt-2 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 font-black text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
              >
                <option value="">Select management company</option>
                {managementCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
                <option value={NEW_MANAGEMENT_COMPANY_VALUE}>
                  Create new management company
                </option>
              </select>
            </label>
            {propertyDraft.managementCompanyId === NEW_MANAGEMENT_COMPANY_VALUE && (
              <FormField
                label="New Management Company Name"
                value={propertyDraft.newManagementCompanyName}
                onChange={(value) => updateDraft("newManagementCompanyName", value)}
                required
              />
            )}
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
            <FormField
              label="Year Built"
              type="number"
              value={propertyDraft.yearBuilt}
              onChange={(value) => updateDraft("yearBuilt", value)}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="rounded-2xl bg-[#f5f8f1] p-4">
              <span className="text-sm font-semibold text-[#526260]">
                Listing Status
              </span>
              <select
                value={propertyDraft.status}
                onChange={(event) => updateDraft("status", event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 font-black text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
              >
                <option>Live</option>
                <option>Pending Review</option>
                <option>Draft</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-black text-[#102426]">
                Floor Plans
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#526260]">
                {propertyDraft.floorPlans.length} floor plan
                {propertyDraft.floorPlans.length === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={addFloorPlan}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
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
                onPhotosUpload={uploadFloorPlanPhotos}
                onPhotoRemove={removeFloorPlanPhoto}
                onPrimaryPhotoSet={setPrimaryFloorPlanPhoto}
              />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-black text-[#102426]">
                Property Photos
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#526260]">
                {propertyDraft.photos.length} of {MAX_UPLOAD_COUNT} uploaded
              </p>
              <p className="mt-1 text-xs font-bold text-[#6b7775]">
                Photos are optimized before saving so larger uploads do not block the form.
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426]">
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
                    className="overflow-hidden rounded-2xl border border-[#d7e6df] bg-[#f5f8f1]"
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="h-36 w-full object-cover"
                    />

                    <div className="space-y-3 p-3">
                      <p className="truncate text-sm font-bold text-[#102426]">
                        {photo.name}
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPrimaryPhoto(photo.id)}
                          className={`inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold ${isPrimaryPhoto
                            ? "bg-[#d8efe6] text-[#1f6f63]"
                            : "bg-white text-[#173f3f] hover:bg-[#e7f3ee]"
                            }`}
                        >
                          <Star className="h-3.5 w-3.5" />
                          Primary
                        </button>

                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="inline-flex items-center justify-center rounded-xl bg-[#fde8df] px-3 py-2 text-[#b33818] hover:bg-[#f9d4c6]"
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
          <p className="rounded-2xl bg-[#fde8df] px-4 py-3 text-sm font-bold text-[#b33818] ring-1 ring-[#f4b39f]">
            {saveError}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
          >
            <Save className="h-4 w-4" />
            {isEditing ? "Save Property" : "Create Property"}
          </button>

          <Link
            to="/admin/properties"
            className="inline-flex items-center justify-center rounded-2xl bg-[#e7f3ee] px-5 py-3 text-sm font-bold text-[#173f3f] hover:bg-[#d7e6df]"
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
  onPhotosUpload,
  onPhotoRemove,
  onPrimaryPhotoSet,
}) {
  const calculatedValues = calculateFloorPlanValues(floorPlan);
  const updateUnitSpecial = (availableUnitId, value) => {
    if (value === "floorPlan") {
      onAvailabilityChange(floorPlan.id, availableUnitId, "specialMode", "floorPlan");
      onAvailabilityChange(floorPlan.id, availableUnitId, "freeWeeks", "");
      return;
    }

    if (value === "none") {
      onAvailabilityChange(floorPlan.id, availableUnitId, "specialMode", "none");
      onAvailabilityChange(floorPlan.id, availableUnitId, "freeWeeks", "");
      onAvailabilityChange(floorPlan.id, availableUnitId, "adminFeeSpecial", "");
      return;
    }

    onAvailabilityChange(floorPlan.id, availableUnitId, "specialMode", "custom");
    onAvailabilityChange(floorPlan.id, availableUnitId, "freeWeeks", value);
  };

  return (
    <div
      key={floorPlan.id}
      className="rounded-2xl border border-[#d7e6df] bg-[#f5f8f1] p-4"
    >
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h3 className="text-lg font-black text-[#102426]">
          Floor Plan {index + 1}
        </h3>

        <button
          type="button"
          onClick={() => onRemove(floorPlan.id)}
          disabled={!canRemove}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fde8df] px-3 py-2 text-sm font-bold text-[#b33818] hover:bg-[#f9d4c6] disabled:cursor-not-allowed disabled:bg-[#d7e6df] disabled:text-[#78908a]"
        >
          <X className="h-4 w-4" />
          Remove
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <p className="rounded-2xl border border-[#f2d08a] bg-[#fff8e6] p-4 text-sm font-bold leading-6 text-[#8a5b0a] md:col-span-2 xl:col-span-3">
          Enter base rent separately from required monthly fees. Free-week specials are calculated from base rent only and shown as an estimated monthly value. Most properties apply specials as account credits, so renter payment timing may vary by property.
        </p>
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
          label="Base Rent"
          value={floorPlan.startingRent}
          onChange={(value) => onChange(floorPlan.id, "startingRent", value)}
        />
        <FormField
          label="Required Monthly Fees / Amenities"
          value={floorPlan.requiredMonthlyFees}
          onChange={(value) => onChange(floorPlan.id, "requiredMonthlyFees", value)}
        />
        <FormField
          label="Market Rent"
          value={floorPlan.marketRent}
          onChange={(value) => onChange(floorPlan.id, "marketRent", value)}
        />
        <label className="rounded-2xl bg-white p-4">
          <span className="text-sm font-semibold text-[#526260]">
            Weeks Free Special
          </span>
          <select
            value={String(floorPlan.freeWeeks)}
            onChange={(event) => onChange(floorPlan.id, "freeWeeks", event.target.value)}
            className="mt-2 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 font-black text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
          >
            {WEEKS_FREE_OPTIONS.map((weeks) => (
              <option key={weeks} value={String(weeks)}>
                {weeks === 0 ? "No free weeks" : `${weeks} weeks free`}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-2xl bg-white p-4">
          <span className="text-sm font-semibold text-[#526260]">
            Fee Special
          </span>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {FEE_SPECIAL_TYPES.map((feeType) => (
              <label
                key={feeType.value}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black ${
                  floorPlan.adminFeeSpecialType === feeType.value
                    ? "border-[#f2b84b] bg-[#102426] text-[#fff7df]"
                    : "border-[#d7e6df] bg-white text-[#173f3f] hover:border-[#f2b84b]"
                }`}
              >
                <input
                  type="radio"
                  name={`${floorPlan.id}-fee-special-type`}
                  value={feeType.value}
                  checked={floorPlan.adminFeeSpecialType === feeType.value}
                  onChange={(event) =>
                    onChange(floorPlan.id, "adminFeeSpecialType", event.target.value)
                  }
                  className="h-4 w-4 accent-[#f2b84b]"
                />
                {feeType.label}
              </label>
            ))}
          </div>
          <input
            type="text"
            value={floorPlan.adminFeeSpecial}
            onChange={(event) =>
              onChange(floorPlan.id, "adminFeeSpecial", event.target.value)
            }
            placeholder="$99 or waived"
            className="mt-3 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 font-black text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
          />
        </div>
        <label className="rounded-2xl bg-white p-4">
          <span className="text-sm font-semibold text-[#526260]">
            Lease Term
          </span>
          <select
            value={String(floorPlan.leaseTermMonths)}
            onChange={(event) =>
              onChange(floorPlan.id, "leaseTermMonths", event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 font-black text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
          >
            {LEASE_TERM_OPTIONS.map((months) => (
              <option key={months} value={months}>
                {months} months
              </option>
            ))}
          </select>
        </label>
        <CalculatedField
          label="Normal Monthly Rent"
          value={calculatedValues.totalMonthlyRent}
        />
        <CalculatedField label="Estimated Monthly Value" value={calculatedValues.monthlyConcession} />
        <CalculatedField label="Net Effective Rent" value={calculatedValues.effectiveRent} />
        <CalculatedField
          label="Below Market Percent"
          value={calculatedValues.belowMarketPercent}
        />
        <label className="rounded-2xl bg-white p-4">
          <span className="text-sm font-semibold text-[#526260]">
            Status
          </span>
          <select
            value={floorPlan.status}
            onChange={(event) => onChange(floorPlan.id, "status", event.target.value)}
            className="mt-2 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 font-black text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
          >
            <option value="available">Available</option>
            <option value="limited">Limited</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>
        <label className="rounded-2xl bg-white p-4 md:col-span-2 xl:col-span-3">
          <span className="text-sm font-semibold text-[#526260]">
            Notes
          </span>
          <input
            type="text"
            value={floorPlan.notes}
            onChange={(event) => onChange(floorPlan.id, "notes", event.target.value)}
            className="mt-2 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 font-black text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
          />
        </label>
      </div>

      <div className="mt-5 rounded-2xl bg-white p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h4 className="text-base font-black text-[#102426]">
              Floor Plan Photos
            </h4>
            <p className="mt-1 text-sm font-semibold text-[#526260]">
              {(floorPlan.photos || []).length} of {MAX_FLOOR_PLAN_UPLOAD_COUNT} uploaded
            </p>
            <p className="mt-1 text-xs font-bold text-[#6b7775]">
              Floor plan photos are compressed before saving.
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173f3f] px-4 py-2 text-sm font-bold text-white hover:bg-[#102426]">
            <ImagePlus className="h-4 w-4" />
            Upload Floor Plan Photos
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => onPhotosUpload(floorPlan.id, event)}
              className="sr-only"
            />
          </label>
        </div>

        {(floorPlan.photos || []).length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {floorPlan.photos.map((photo) => {
              const isPrimaryPhoto = photo.url === floorPlan.image;

              return (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded-2xl border border-[#d7e6df] bg-[#f5f8f1]"
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="h-28 w-full object-cover"
                  />

                  <div className="space-y-2 p-3">
                    <p className="truncate text-sm font-bold text-[#102426]">
                      {photo.name}
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onPrimaryPhotoSet(floorPlan.id, photo.id)}
                        className={`inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold ${isPrimaryPhoto
                          ? "bg-[#d8efe6] text-[#1f6f63]"
                          : "bg-white text-[#173f3f] hover:bg-[#e7f3ee]"
                          }`}
                      >
                        <Star className="h-3.5 w-3.5" />
                        Primary
                      </button>

                      <button
                        type="button"
                        onClick={() => onPhotoRemove(floorPlan.id, photo.id)}
                        className="inline-flex items-center justify-center rounded-xl bg-[#fde8df] px-3 py-2 text-[#b33818] hover:bg-[#f9d4c6]"
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
      </div>

      <div className="mt-5 rounded-2xl bg-white p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h4 className="text-base font-black text-[#102426]">
              Available Dates
            </h4>
            <p className="mt-1 text-sm font-semibold text-[#526260]">
              {floorPlan.availableUnits.length} availability row
              {floorPlan.availableUnits.length === 1 ? "" : "s"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onAvailabilityAdd(floorPlan.id)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f2b84b] px-4 py-2 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
          >
            <Plus className="h-4 w-4" />
            Add Date
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {floorPlan.availableUnits.map((availableUnit, availabilityIndex) => (
            <div
              key={availableUnit.id}
              className="rounded-2xl border border-[#d7e6df] bg-[#f5f8f1] p-4"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <p className="text-sm font-black text-[#102426]">
                  Availability {availabilityIndex + 1}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onAvailabilityRemove(floorPlan.id, availableUnit.id)
                  }
                  disabled={floorPlan.availableUnits.length === 1}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fde8df] px-3 py-2 text-xs font-bold text-[#b33818] hover:bg-[#f9d4c6] disabled:cursor-not-allowed disabled:bg-[#d7e6df] disabled:text-[#78908a]"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
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
                  label="Unit Base Rent"
                  value={availableUnit.rent}
                  onChange={(value) =>
                    onAvailabilityChange(floorPlan.id, availableUnit.id, "rent", value)
                  }
                />
                <label className="rounded-2xl bg-white p-4">
                  <span className="text-sm font-semibold text-[#526260]">
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
                    className="mt-2 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 font-black text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
                  >
                    <option value="available">Available</option>
                    <option value="pending">Pending</option>
                    <option value="leased">Leased</option>
                  </select>
                </label>
                <label className="rounded-2xl bg-white p-4">
                  <span className="text-sm font-semibold text-[#526260]">
                    Unit Special
                  </span>
                  <select
                    value={getUnitSpecialSelectValue(availableUnit)}
                    onChange={(event) =>
                      updateUnitSpecial(availableUnit.id, event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 font-black text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
                  >
                    <option value="floorPlan">Use floor plan special</option>
                    <option value="none">No special</option>
                    {WEEKS_FREE_OPTIONS.filter((weeks) => weeks > 0).map((weeks) => (
                      <option key={weeks} value={String(weeks)}>
                        {weeks} weeks free
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-2xl bg-white p-4 md:col-span-2 xl:col-span-2">
                  <span className="text-sm font-semibold text-[#526260]">
                    Unit Fee Special
                  </span>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {FEE_SPECIAL_TYPES.map((feeType) => (
                      <label
                        key={feeType.value}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black ${
                          availableUnit.adminFeeSpecialType === feeType.value
                            ? "border-[#f2b84b] bg-[#102426] text-[#fff7df]"
                            : "border-[#d7e6df] bg-white text-[#173f3f] hover:border-[#f2b84b]"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`${availableUnit.id}-unit-fee-special-type`}
                          value={feeType.value}
                          checked={availableUnit.adminFeeSpecialType === feeType.value}
                          onChange={(event) =>
                            onAvailabilityChange(
                              floorPlan.id,
                              availableUnit.id,
                              "adminFeeSpecialType",
                              event.target.value
                            )
                          }
                          className="h-4 w-4 accent-[#f2b84b]"
                        />
                        {feeType.label}
                      </label>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={availableUnit.adminFeeSpecial}
                    onChange={(event) =>
                      onAvailabilityChange(
                        floorPlan.id,
                        availableUnit.id,
                        "adminFeeSpecial",
                        event.target.value
                      )
                    }
                    placeholder="$99 or waived"
                    className="mt-3 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 font-black text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
                  />
                </div>
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
    <label className="rounded-2xl bg-[#f5f8f1] p-4">
      <span className="text-sm font-semibold text-[#526260]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 font-black text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
      />
    </label>
  );
}

function CalculatedField({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <span className="text-sm font-semibold text-[#526260]">
        {label}
      </span>
      <p className="mt-2 rounded-xl border border-[#d7e6df] bg-[#e7f3ee] px-3 py-2 font-black text-[#102426]">
        {value || "Calculated"}
      </p>
    </div>
  );
}

function resolveManagementCompany({
  managementCompanies,
  propertyDraft,
  setManagementCompanies,
  setSaveError,
}) {
  if (propertyDraft.managementCompanyId === NEW_MANAGEMENT_COMPANY_VALUE) {
    const newCompanyName = propertyDraft.newManagementCompanyName.trim();

    if (!newCompanyName) {
      setSaveError("Add a management company name.");
      return null;
    }

    const existingCompany = managementCompanies.find(
      (company) => company.name.toLowerCase() === newCompanyName.toLowerCase()
    );

    if (existingCompany) {
      return existingCompany;
    }

    const createdCompany = createStoredManagementCompany({
      name: newCompanyName,
    });

    setManagementCompanies(getAllManagementCompanies());
    return createdCompany;
  }

  const selectedCompany = getManagementCompanyById(propertyDraft.managementCompanyId);

  if (selectedCompany) {
    return selectedCompany;
  }

  const fallbackCompanyName =
    propertyDraft.managementCompany.trim() ||
    propertyDraft.manager.trim();

  if (!fallbackCompanyName) {
    setSaveError("Select or create a management company.");
    return null;
  }

  const existingCompanyId = getManagementCompanyIdByName(fallbackCompanyName);
  const existingCompany = getManagementCompanyById(existingCompanyId);

  if (existingCompany) {
    return existingCompany;
  }

  const createdCompany = createStoredManagementCompany({
    name: fallbackCompanyName,
  });

  setManagementCompanies(getAllManagementCompanies());
  return createdCompany;
}

function createDraftFromProperty(property) {
  const managementCompanyId =
    property.managementCompanyId ||
    getManagementCompanyIdByName(property.managementCompany || property.manager);

  return {
    name: property.name || "",
    area: property.area || "",
    manager: property.manager || "",
    managementCompanyId,
    managementCompany: property.managementCompany || property.manager || "",
    newManagementCompanyName: "",
    address: property.address || "",
    city: property.city || "",
    state: property.state || "",
    zipcode: property.zipcode || property.zip || "",
    yearBuilt: property.yearBuilt || "",
    yearRenovated: property.yearRenovated || "",
    propertyClass: property.propertyClass || "",
    benchmarkClass: property.benchmarkClass || "",
    assetClass: property.assetClass || "",
    realPage: property.realPage || null,
    amenities: property.amenities || [],
    communityAmenities: property.communityAmenities || [],
    apartmentAmenities: property.apartmentAmenities || [],
    unitFeatures: property.unitFeatures || [],
    rent: property.rent || "",
    marketRent: property.marketRent || "",
    requiredMonthlyFees: property.requiredMonthlyFees || "",
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
    image: "",
    photos: [],
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    startingRent: "",
    requiredMonthlyFees: "",
    totalMonthlyRent: "",
    effectiveRent: "",
    marketRent: "",
    savings: "",
    belowMarketPercent: "",
    currentSpecial: "",
    freeWeeks: "0",
    adminFeeSpecial: "",
    adminFeeSpecialType: "admin",
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
    specialMode: "floorPlan",
    freeWeeks: "",
    adminFeeSpecial: "",
    adminFeeSpecialType: "admin",
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
          requiredMonthlyFees: "",
          totalMonthlyRent: property.rent || "",
          effectiveRent: property.effectiveRent || "",
          marketRent: property.marketRent || "",
          freeWeeks: "0",
          adminFeeSpecial: "",
          adminFeeSpecialType: "admin",
          leaseTermMonths: "12",
          image: "",
          photos: [],
          availableUnits: normalizeAvailableUnitsForDraft([], property.rent || ""),
        };
      }

      const currentSpecialLabel = floorPlan.currentSpecial || floorPlan.special?.label || "";
      const parsedFreeWeeks = floorPlan.freeWeeks ?? floorPlan.special?.freeWeeks ?? getWeeksFromSpecialLabel(currentSpecialLabel);
      const adminFeeSpecial =
        floorPlan.adminFeeSpecial ||
        floorPlan.special?.adminFeeSpecial ||
        getAdminFeeSpecialFromLabel(currentSpecialLabel);
      const adminFeeSpecialType =
        floorPlan.adminFeeSpecialType ||
        floorPlan.special?.adminFeeSpecialType ||
        getAdminFeeSpecialTypeFromLabel(adminFeeSpecial || currentSpecialLabel);

      return {
        ...createBlankFloorPlan(),
        id: floorPlan.id || `${property.id}-floor-plan-${index}`,
        name: floorPlan.name || "",
        bedrooms: floorPlan.bedrooms || floorPlan.beds || "",
        bathrooms: floorPlan.bathrooms || floorPlan.baths || "",
        squareFeet: floorPlan.squareFeet || floorPlan.sqft || "",
        startingRent: floorPlan.startingRent || floorPlan.rent || "",
        requiredMonthlyFees: floorPlan.requiredMonthlyFees || "",
        totalMonthlyRent: floorPlan.totalMonthlyRent || floorPlan.rent || "",
        marketRent: floorPlan.marketRent || "",
        freeWeeks: String(parsedFreeWeeks || 0),
        adminFeeSpecial,
        adminFeeSpecialType,
        leaseTermMonths: String(floorPlan.leaseTermMonths || floorPlan.special?.leaseTermMonths || 12),
        image:
          floorPlan.image ||
          (floorPlan.photos || []).map(getPhotoImageUrl).find(Boolean) ||
          "",
        photos: normalizeFloorPlanPhotos(floorPlan, index),
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
  const unitRentFallback = getFirstAvailableUnitRent(floorPlan.availableUnits);
  const startingRent = floorPlan.startingRent.trim() || unitRentFallback;
  const floorPlanForCalculation = {
    ...floorPlan,
    startingRent,
  };
  const calculatedValues = calculateFloorPlanValues(floorPlanForCalculation);
  const freeWeeks = Number(floorPlan.freeWeeks || 0);
  const leaseTermMonths = Number(floorPlan.leaseTermMonths || 12);
  const adminFeeSpecial = floorPlan.adminFeeSpecial.trim();
  const adminFeeSpecialType = floorPlan.adminFeeSpecialType || "admin";
  const currentSpecial = getSpecialLabel(freeWeeks, adminFeeSpecial, adminFeeSpecialType);
  const availableUnits = floorPlan.availableUnits
    .map((availableUnit, index) =>
      normalizeAvailableUnitForStorage(
        availableUnit,
        index,
        startingRent
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
    image:
      floorPlan.image ||
      (floorPlan.photos || []).map(getPhotoImageUrl).find(Boolean) ||
      "",
    photos: floorPlan.photos || [],
    startingRent,
    baseRent: startingRent,
    requiredMonthlyFees: floorPlan.requiredMonthlyFees.trim(),
    totalMonthlyRent: calculatedValues.totalMonthlyRent,
    rent: calculatedValues.totalMonthlyRent || startingRent,
    effectiveRent: calculatedValues.effectiveRent,
    monthlyConcession: calculatedValues.monthlyConcession,
    marketRent: floorPlan.marketRent.trim(),
    savings: calculatedValues.savings,
    belowMarketPercent: calculatedValues.belowMarketPercent,
    currentSpecial,
    freeWeeks,
    adminFeeSpecial,
    adminFeeSpecialType,
    leaseTermMonths,
    special: currentSpecial
      ? {
          type: "weeks_free",
          freeWeeks,
          adminFeeSpecial,
          adminFeeSpecialType,
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

function getFirstAvailableUnitRent(availableUnits = []) {
  return (
    availableUnits
      .map((availableUnit) => availableUnit.rent?.trim())
      .find(Boolean) || ""
  );
}

function normalizeAvailableUnitsForDraft(availableUnits = [], defaultRent = "") {
  if (availableUnits.length === 0) {
    return [createBlankAvailableUnit()];
  }

  return availableUnits.map((availableUnit, index) => {
    const specialLabel = availableUnit.currentSpecial || availableUnit.special?.label || "";
    const parsedFreeWeeks =
      availableUnit.freeWeeks ?? availableUnit.special?.freeWeeks ?? getWeeksFromSpecialLabel(specialLabel);
    const adminFeeSpecial =
      availableUnit.adminFeeSpecial ||
      availableUnit.special?.adminFeeSpecial ||
      getAdminFeeSpecialFromLabel(specialLabel);
    const adminFeeSpecialType =
      availableUnit.adminFeeSpecialType ||
      availableUnit.special?.adminFeeSpecialType ||
      getAdminFeeSpecialTypeFromLabel(adminFeeSpecial || specialLabel);

    return {
      ...createBlankAvailableUnit(),
      id: availableUnit.id || `availability-${index}`,
      unit: availableUnit.unit || "",
      availableDate: availableUnit.availableDate || getDateFromAvailabilityLabel(availableUnit.available),
      rent: availableUnit.rent || defaultRent,
      status: availableUnit.status || "available",
      specialMode:
        availableUnit.specialMode || (Number(parsedFreeWeeks || 0) > 0 ? "custom" : "floorPlan"),
      freeWeeks: Number(parsedFreeWeeks || 0) > 0 ? String(parsedFreeWeeks) : "",
      adminFeeSpecial,
      adminFeeSpecialType,
      notes: availableUnit.notes || "",
    };
  });
}

function normalizeAvailableUnitForStorage(availableUnit, index, defaultRent) {
  const unitLabel = availableUnit.unit.trim() || `Option ${index + 1}`;
  const availableDate = availableUnit.availableDate;
  const specialMode = availableUnit.specialMode || "floorPlan";
  const freeWeeks = specialMode === "custom" ? Number(availableUnit.freeWeeks || 0) : 0;
  const adminFeeSpecial = specialMode === "none" ? "" : availableUnit.adminFeeSpecial.trim();
  const adminFeeSpecialType = availableUnit.adminFeeSpecialType || "admin";
  const currentSpecial = specialMode === "none"
    ? ""
    : getSpecialLabel(freeWeeks, adminFeeSpecial, adminFeeSpecialType);

  return {
    id: availableUnit.id,
    unit: unitLabel,
    availableDate,
    available: formatAvailableDate(availableDate),
    rent: availableUnit.rent.trim() || defaultRent.trim(),
    status: availableUnit.status,
    specialMode,
    freeWeeks,
    adminFeeSpecial,
    adminFeeSpecialType,
    currentSpecial,
    special: currentSpecial
      ? {
          type: "weeks_free",
          freeWeeks,
          adminFeeSpecial,
          adminFeeSpecialType,
          label: currentSpecial,
        }
      : null,
    notes: availableUnit.notes.trim(),
    requestCount: 0,
  };
}

function getUnitSpecialSelectValue(availableUnit) {
  if (availableUnit.specialMode === "none") return "none";
  if (availableUnit.specialMode === "custom") return String(availableUnit.freeWeeks || "0.5");

  return "floorPlan";
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
  const requiredMonthlyFeesNumber = parseCurrency(floorPlan.requiredMonthlyFees);
  const totalMonthlyRentNumber = startingRentNumber + requiredMonthlyFeesNumber;
  const marketRentNumber = parseCurrency(floorPlan.marketRent);
  const freeWeeks = Number(floorPlan.freeWeeks || 0);
  const leaseTermMonths = Number(floorPlan.leaseTermMonths || 12);

  if (!startingRentNumber || !leaseTermMonths) {
    return {
      totalMonthlyRent: "",
      effectiveRent: "",
      monthlyConcession: "",
      savings: "",
      belowMarketPercent: "",
    };
  }

  const freeMonths = freeWeeks / LEASING_WEEKS_PER_MONTH;
  const monthlyConcession = (startingRentNumber * freeMonths) / leaseTermMonths;
  const effectiveRentNumber = Math.max(totalMonthlyRentNumber - monthlyConcession, 0);
  const savingsNumber = Math.max(totalMonthlyRentNumber - effectiveRentNumber, 0);
  const comparisonRent = marketRentNumber || totalMonthlyRentNumber;
  const belowMarketSavingsNumber = Math.max(comparisonRent - effectiveRentNumber, 0);
  const belowMarketPercentNumber = comparisonRent
    ? Math.round((belowMarketSavingsNumber / comparisonRent) * 100)
    : 0;

  return {
    totalMonthlyRent: formatCurrency(totalMonthlyRentNumber),
    effectiveRent: formatCurrency(effectiveRentNumber),
    monthlyConcession: monthlyConcession ? `${formatCurrency(monthlyConcession)}/mo` : "$0/mo",
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

function getSpecialLabel(freeWeeks, adminFeeSpecial = "", adminFeeSpecialType = "admin") {
  const specialParts = [];

  if (freeWeeks) {
    specialParts.push(`${freeWeeks} ${freeWeeks === 1 ? "week" : "weeks"} free`);
  }

  const feeSpecialLabel = getFeeSpecialLabel(adminFeeSpecial, adminFeeSpecialType);
  if (feeSpecialLabel) {
    specialParts.push(feeSpecialLabel);
  }

  return specialParts.join(" + ");
}

function getWeeksFromSpecialLabel(label) {
  const match = String(label || "").match(/(\d+(?:\.\d+)?)\s*weeks?/i);
  return match ? Number(match[1]) : 0;
}

function getAdminFeeSpecialFromLabel(label) {
  const parts = String(label || "")
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.find((part) => !/weeks?\s+free/i.test(part)) || "";
}

function getAdminFeeSpecialTypeFromLabel(label) {
  return /application\s+fees?/i.test(String(label || "")) ? "application" : "admin";
}

function getFeeSpecialLabel(adminFeeSpecial, adminFeeSpecialType) {
  const trimmedSpecial = adminFeeSpecial.trim();
  if (!trimmedSpecial) return "";

  if (/(admin|application)\s+fees?/i.test(trimmedSpecial)) {
    return trimmedSpecial;
  }

  const feeLabel = adminFeeSpecialType === "application" ? "application fee" : "admin fee";
  return `${trimmedSpecial} ${feeLabel}`;
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

function normalizeFloorPlanPhotos(floorPlan, index) {
  if (floorPlan.photos?.length > 0) {
    return floorPlan.photos.map((photo, photoIndex) => ({
      id: photo.id || `${floorPlan.id || `floor-plan-${index}`}-photo-${photoIndex}`,
      name: photo.name || `Floor plan photo ${photoIndex + 1}`,
      url: photo.url,
      category: photo.category || "Floor Plan",
    }));
  }

  if (floorPlan.image) {
    return [
      {
        id: `${floorPlan.id || `floor-plan-${index}`}-primary-photo`,
        name: `${floorPlan.name || `Floor Plan ${index + 1}`} primary photo`,
        url: floorPlan.image,
        category: "Floor Plan",
      },
    ];
  }

  return [];
}

async function readPhotoFile(file, category = "Property", options = {}) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image uploads are supported.");
  }

  const compressedPhoto = await compressImageFile(file, {
    maxDimension: PROPERTY_PHOTO_MAX_DIMENSION,
    targetBytes: PROPERTY_PHOTO_TARGET_BYTES,
    ...options,
  });

  return {
    id: `${file.name}-${file.lastModified}-${Date.now()}`,
    name: file.name,
    url: compressedPhoto.dataUrl,
    category,
    originalSize: file.size,
    storedSize: compressedPhoto.size,
  };
}

async function compressImageFile(file, options) {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const qualityLevels = [0.82, 0.72, 0.62, 0.52];
  let maxDimension = options.maxDimension;
  let bestBlob = null;

  if (!context) {
    throw new Error("Image compression is not available in this browser.");
  }

  for (let sizeAttempt = 0; sizeAttempt < 4; sizeAttempt += 1) {
    const scale = Math.min(
      1,
      maxDimension / image.naturalWidth,
      maxDimension / image.naturalHeight
    );

    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of qualityLevels) {
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);

      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob;
      }

      if (blob.size <= options.targetBytes) {
        return {
          dataUrl: await blobToDataUrl(blob),
          size: blob.size,
        };
      }
    }

    maxDimension = Math.round(maxDimension * 0.82);
  }

  if (!bestBlob) {
    throw new Error("Could not compress image.");
  }

  return {
    dataUrl: await blobToDataUrl(bestBlob),
    size: bestBlob.size,
  };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const imageUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Could not read this image file."));
    };

    image.src = imageUrl;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Could not compress image."));
      },
      type,
      quality
    );
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
