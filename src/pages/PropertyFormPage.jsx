import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronRight,
  ImagePlus,
  Plus,
  Save,
  Star,
  X,
} from "lucide-react";
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

const MAX_UPLOAD_COUNT = 6;
const MAX_FLOOR_PLAN_UPLOAD_COUNT = 3;
const MAX_UPLOAD_SIZE = 12 * 1024 * 1024;
const PROPERTY_PHOTO_MAX_DIMENSION = 760;
const FLOOR_PLAN_PHOTO_MAX_DIMENSION = 620;
const PROPERTY_PHOTO_TARGET_BYTES = 45 * 1024;
const FLOOR_PLAN_PHOTO_TARGET_BYTES = 38 * 1024;
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
  const isEditing = Boolean(propertyId);
  const [existingProperty, setExistingProperty] = useState(null);
  const [isLoadingFormData, setIsLoadingFormData] = useState(isEditing);
  const [saveError, setSaveError] = useState("");
  const [managementCompanies, setManagementCompanies] = useState([]);
  const [propertyDraft, setPropertyDraft] = useState(emptyPropertyDraft);
  const [expandedFloorPlanIds, setExpandedFloorPlanIds] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadFormData() {
      try {
        setIsLoadingFormData(true);
        const [companies, savedProperty] = await Promise.all([
          getAllManagementCompanies(),
          propertyId ? getAnyPropertyById(propertyId) : Promise.resolve(null),
        ]);

        if (!isMounted) return;

        setManagementCompanies(companies);
        setExistingProperty(savedProperty);
        setPropertyDraft(savedProperty ? createDraftFromProperty(savedProperty) : emptyPropertyDraft);
        setSaveError("");
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setSaveError("Could not load property form data from Supabase.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingFormData(false);
        }
      }
    }

    loadFormData();

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

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
    if (saveError) {
      setSaveError("");
    }

    setPropertyDraft((currentDraft) => {
      const nextPhotos = currentDraft.photos.filter((photo) => photo.id !== photoId);
      const removedPhoto = currentDraft.photos.find((photo) => photo.id === photoId);
      const removedPrimary = getPhotoImageUrl(removedPhoto) === currentDraft.image;

      return {
        ...currentDraft,
        image: removedPrimary ? getPhotoImageUrl(nextPhotos[0]) || "" : currentDraft.image,
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
    if (saveError) {
      setSaveError("");
    }

    setPropertyDraft((currentDraft) => ({
      ...currentDraft,
      floorPlans: currentDraft.floorPlans.map((floorPlan) => {
        if (floorPlan.id !== floorPlanId) return floorPlan;

        const nextPhotos = (floorPlan.photos || []).filter((photo) => photo.id !== photoId);
        const removedPhoto = (floorPlan.photos || []).find((photo) => photo.id === photoId);
        const removedPrimary = getPhotoImageUrl(removedPhoto) === floorPlan.image;

        return {
          ...floorPlan,
          image: removedPrimary ? getPhotoImageUrl(nextPhotos[0]) || "" : floorPlan.image,
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
          image: getPhotoImageUrl(photo) || floorPlan.image,
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
        image: getPhotoImageUrl(photo) || currentDraft.image,
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

  const importFloorPlanAvailability = (floorPlanId, pastedRows) => {
    const importedUnits = parseAvailabilityImportRows(pastedRows);

    if (importedUnits.length === 0) {
      setSaveError("Paste at least one unit row with a unit, rent, or available date.");
      return 0;
    }

    setPropertyDraft((currentDraft) => ({
      ...currentDraft,
      floorPlans: currentDraft.floorPlans.map((floorPlan) =>
        floorPlan.id === floorPlanId
          ? {
              ...floorPlan,
              availableUnits: importedUnits,
            }
          : floorPlan
      ),
    }));
    setSaveError("");

    return importedUnits.length;
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
    const newFloorPlan = createBlankFloorPlan();

    setPropertyDraft((currentDraft) => ({
      ...currentDraft,
      floorPlans: [...currentDraft.floorPlans, newFloorPlan],
    }));
    setExpandedFloorPlanIds((currentIds) => [...currentIds, newFloorPlan.id]);
  };

  const removeFloorPlan = (floorPlanId) => {
    setPropertyDraft((currentDraft) => ({
      ...currentDraft,
      floorPlans:
        currentDraft.floorPlans.length > 1
          ? currentDraft.floorPlans.filter((floorPlan) => floorPlan.id !== floorPlanId)
          : currentDraft.floorPlans,
    }));
    setExpandedFloorPlanIds((currentIds) =>
      currentIds.filter((expandedFloorPlanId) => expandedFloorPlanId !== floorPlanId)
    );
  };

  const toggleFloorPlanExpansion = (floorPlanId) => {
    setExpandedFloorPlanIds((currentIds) =>
      currentIds.includes(floorPlanId)
        ? currentIds.filter((expandedFloorPlanId) => expandedFloorPlanId !== floorPlanId)
        : [...currentIds, floorPlanId]
    );
  };

  const expandAllFloorPlans = () => {
    setExpandedFloorPlanIds(propertyDraft.floorPlans.map((floorPlan) => floorPlan.id));
  };

  const collapseAllFloorPlans = () => {
    setExpandedFloorPlanIds([]);
  };

  const saveProperty = async (event) => {
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

    const selectedManagementCompany = await resolveManagementCompany({
      managementCompanies,
      propertyDraft,
      setManagementCompanies,
      setSaveError,
    });

    if (!selectedManagementCompany) {
      return;
    }

    let optimizedDraft;

    try {
      optimizedDraft = await optimizeDraftPhotos(propertyDraft);
    } catch (error) {
      console.error(error);
      setSaveError("Could not optimize these photos. Try removing one photo and saving again.");
      return;
    }

    setPropertyDraft(optimizedDraft);

    const floorPlans = optimizedDraft.floorPlans
      .map(normalizeFloorPlanForStorage)
      .filter((floorPlan) => floorPlan.name && floorPlan.rent);

    if (floorPlans.length === 0) {
      setSaveError("Add at least one floor plan with a name and starting rent.");
      return;
    }

    const primaryFloorPlan = floorPlans[0];

    const propertyPayload = {
      ...optimizedDraft,
      name: optimizedDraft.name.trim(),
      area: optimizedDraft.area.trim(),
      manager: optimizedDraft.manager.trim() || "Not assigned",
      managementCompanyId: selectedManagementCompany.id,
      managementCompany: selectedManagementCompany.name,
      address: optimizedDraft.address.trim(),
      city: optimizedDraft.city.trim(),
      state: optimizedDraft.state.trim(),
      zipcode: optimizedDraft.zipcode.trim(),
      yearBuilt: optimizedDraft.yearBuilt.trim(),
      rent: primaryFloorPlan.rent || "Contact for pricing",
      marketRent: primaryFloorPlan.marketRent,
      requiredMonthlyFees: primaryFloorPlan.requiredMonthlyFees,
      effectiveRent: primaryFloorPlan.effectiveRent || primaryFloorPlan.rent,
      monthlyConcession: primaryFloorPlan.monthlyConcession,
      savings: primaryFloorPlan.savings,
      belowMarketPercent: primaryFloorPlan.belowMarketPercent,
      special: primaryFloorPlan.currentSpecial,
      image:
        optimizedDraft.photos.map(getPhotoImageUrl).find(Boolean) ||
        optimizedDraft.image.trim() ||
        "",
      photos: optimizedDraft.photos,
      floorPlans,
      bedrooms: [
        ...new Set(floorPlans.map((floorPlan) => floorPlan.beds).filter(Boolean)),
      ],
    };

    const savedProperty = await savePropertyWithPhotoFallback({
      isEditing,
      propertyId,
      propertyPayload,
    });

    if (savedProperty) {
      navigate(`/admin/properties/${savedProperty.id}`);
    } else {
      setSaveError("Could not save this property to Supabase. Confirm the properties tables and property-photos bucket are set up, then try again.");
    }
  };

  if (isLoadingFormData) {
    return (
      <div className="rounded-3xl border border-[#d7e6df] bg-white p-8 text-left shadow-sm">
        <h1 className="text-3xl font-black text-[#102426]">Loading property form...</h1>
        <p className="mt-2 font-semibold text-[#526260]">Checking Supabase for the latest data.</p>
      </div>
    );
  }

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
                onChange={(event) => {
                  const selectedCompany = managementCompanies.find(
                    (company) => company.id === event.target.value
                  );

                  setPropertyDraft((currentDraft) => ({
                    ...currentDraft,
                    managementCompanyId: event.target.value,
                    managementCompany: selectedCompany?.name || "",
                  }));
                }}
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

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={expandAllFloorPlans}
                className="inline-flex items-center justify-center rounded-2xl bg-[#e7f3ee] px-4 py-3 text-sm font-black text-[#173f3f] hover:bg-[#d7e6df]"
              >
                Expand All
              </button>

              <button
                type="button"
                onClick={collapseAllFloorPlans}
                className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
              >
                Collapse All
              </button>

              <button
                type="button"
                onClick={addFloorPlan}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
              >
                <Plus className="h-4 w-4" />
                Add Floor Plan
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {propertyDraft.floorPlans.map((floorPlan, index) => {
              const isExpanded = expandedFloorPlanIds.includes(floorPlan.id);

              return (
                <div
                  key={floorPlan.id}
                  className="overflow-hidden rounded-2xl border border-[#d7e6df] bg-[#f5f8f1]"
                >
                  <FloorPlanSummaryCard
                    floorPlan={floorPlan}
                    index={index}
                    isExpanded={isExpanded}
                    canRemove={propertyDraft.floorPlans.length > 1}
                    onToggle={() => toggleFloorPlanExpansion(floorPlan.id)}
                    onRemove={() => removeFloorPlan(floorPlan.id)}
                  />

                  {isExpanded && (
                    <div className="border-t border-[#d7e6df] bg-white p-3">
                      <FloorPlanEditor
                        floorPlan={floorPlan}
                        index={index}
                        canRemove={propertyDraft.floorPlans.length > 1}
                        onChange={updateFloorPlan}
                        onRemove={removeFloorPlan}
                        onAvailabilityChange={updateFloorPlanAvailability}
                        onAvailabilityAdd={addFloorPlanAvailability}
                        onAvailabilityImport={importFloorPlanAvailability}
                        onAvailabilityRemove={removeFloorPlanAvailability}
                        onPhotosUpload={uploadFloorPlanPhotos}
                        onPhotoRemove={removeFloorPlanPhoto}
                        onPrimaryPhotoSet={setPrimaryFloorPlanPhoto}
                      />
                    </div>
                  )}
                </div>
              );
            })}
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

function FloorPlanSummaryCard({
  floorPlan,
  index,
  isExpanded,
  canRemove,
  onToggle,
  onRemove,
}) {
  const calculatedValues = calculateFloorPlanValues(floorPlan);
  const planName = floorPlan.name?.trim() || `Floor Plan ${index + 1}`;
  const bedrooms = floorPlan.bedrooms || floorPlan.beds || "Beds not set";
  const bathrooms = floorPlan.bathrooms || floorPlan.baths || "Baths not set";
  const squareFeet = floorPlan.squareFeet || floorPlan.sqft || "Sqft not set";
  const availableUnitCount =
    floorPlan.availableUnits?.filter((availableUnit) => availableUnit.status !== "leased")
      .length || 0;
  const currentSpecial =
    getSpecialLabel(
      Number(floorPlan.freeWeeks || 0),
      floorPlan.rentCreditSpecial,
      floorPlan.adminFeeSpecial,
      floorPlan.adminFeeSpecialType
    ) ||
    floorPlan.currentSpecial ||
    floorPlan.special?.label ||
    "No special";

  return (
    <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 items-start gap-3 rounded-2xl text-left outline-none transition hover:bg-white/70 focus-visible:ring-4 focus-visible:ring-[#f2b84b]/25"
      >
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#173f3f] text-[#f2b84b]">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </span>

        <span className="min-w-0">
          <span className="block truncate text-lg font-black text-[#102426]">
            {planName}
          </span>
          <span className="mt-1 block text-sm font-bold text-[#526260]">
            {formatFloorPlanBedroomSummary(bedrooms)} • {bathrooms} ba • {squareFeet} sqft
          </span>
        </span>
      </button>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <SummaryChip label="Base" value={floorPlan.startingRent || floorPlan.rent || "Not set"} />
        <SummaryChip label="Effective" value={calculatedValues.effectiveRent || "Calculated"} />
        <SummaryChip label="Units" value={String(availableUnitCount)} />
        <SummaryChip label="Special" value={currentSpecial} />

        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center justify-center rounded-xl bg-[#173f3f] px-4 py-2 text-sm font-black text-white hover:bg-[#102426]"
        >
          {isExpanded ? "Minimize" : "Edit"}
        </button>

        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="inline-flex items-center justify-center rounded-xl bg-[#fde8df] px-3 py-2 text-sm font-bold text-[#b33818] hover:bg-[#f9d4c6] disabled:cursor-not-allowed disabled:bg-[#d7e6df] disabled:text-[#78908a]"
          aria-label={`Remove ${planName}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SummaryChip({ label, value }) {
  return (
    <span className="min-w-[92px] rounded-xl bg-white px-3 py-2 text-xs font-black text-[#102426] ring-1 ring-[#d7e6df]">
      <span className="block text-[10px] uppercase text-[#6b7775]">{label}</span>
      <span className="block max-w-[160px] truncate">{value}</span>
    </span>
  );
}

function formatFloorPlanBedroomSummary(value) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) return "Beds not set";
  if (/studio/i.test(normalizedValue) || normalizedValue === "0") return "Studio";
  if (/\bbd\b/i.test(normalizedValue)) return normalizedValue;

  return `${normalizedValue} bd`;
}

function FloorPlanEditor({
  floorPlan,
  index,
  canRemove,
  onChange,
  onRemove,
  onAvailabilityChange,
  onAvailabilityAdd,
  onAvailabilityImport,
  onAvailabilityRemove,
  onPhotosUpload,
  onPhotoRemove,
  onPrimaryPhotoSet,
}) {
  const calculatedValues = calculateFloorPlanValues(floorPlan);
  const [bulkAvailabilityText, setBulkAvailabilityText] = useState("");
  const [bulkAvailabilityMessage, setBulkAvailabilityMessage] = useState("");
  const updateUnitSpecial = (availableUnitId, value) => {
    if (value === "floorPlan") {
      onAvailabilityChange(floorPlan.id, availableUnitId, "specialMode", "floorPlan");
      onAvailabilityChange(floorPlan.id, availableUnitId, "freeWeeks", "");
      onAvailabilityChange(floorPlan.id, availableUnitId, "rentCreditSpecial", "");
      return;
    }

    if (value === "none") {
      onAvailabilityChange(floorPlan.id, availableUnitId, "specialMode", "none");
      onAvailabilityChange(floorPlan.id, availableUnitId, "freeWeeks", "");
      onAvailabilityChange(floorPlan.id, availableUnitId, "rentCreditSpecial", "");
      onAvailabilityChange(floorPlan.id, availableUnitId, "adminFeeSpecial", "");
      return;
    }

    onAvailabilityChange(floorPlan.id, availableUnitId, "specialMode", "custom");
    onAvailabilityChange(floorPlan.id, availableUnitId, "freeWeeks", value);
  };
  const importBulkAvailability = () => {
    const importedCount = onAvailabilityImport(floorPlan.id, bulkAvailabilityText);

    if (!importedCount) {
      setBulkAvailabilityMessage("No valid rows found.");
      return;
    }

    setBulkAvailabilityText("");
    setBulkAvailabilityMessage(
      `${importedCount} availability row${importedCount === 1 ? "" : "s"} imported.`
    );
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
        <label className="rounded-2xl bg-white p-4">
          <span className="text-sm font-semibold text-[#526260]">
            Rent Credit Special
          </span>
          <input
            type="text"
            value={floorPlan.rentCreditSpecial}
            onChange={(event) =>
              onChange(floorPlan.id, "rentCreditSpecial", event.target.value)
            }
            placeholder="$1,500"
            className="mt-2 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 font-black text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
          />
          <span className="mt-2 block text-xs font-bold text-[#6b7775]">
            Shown as off base rent and spread across the lease for net effective rent.
          </span>
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

        <div className="mt-4 rounded-2xl border border-[#d7e6df] bg-[#f5f8f1] p-4">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h5 className="text-sm font-black text-[#102426]">
                Bulk Import Availability
              </h5>
              <p className="mt-1 text-xs font-bold leading-5 text-[#526260]">
                Paste rows from a spreadsheet. Format: Unit, Rent, Available Date, Status, Free Weeks, Renovated, Notes.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setBulkAvailabilityText(
                  "Unit,Rent,Available Date,Status,Free Weeks,Renovated,Notes\n1204,1795,07/15/2026,available,8,yes,Top floor\n1308,1845,07/20/2026,available,8,no,\n1402,1945,08/01/2026,limited,6,yes,"
                )
              }
              className="w-fit rounded-xl bg-white px-3 py-2 text-xs font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
            >
              Use Sample
            </button>
          </div>

          <textarea
            value={bulkAvailabilityText}
            onChange={(event) => {
              setBulkAvailabilityText(event.target.value);
              setBulkAvailabilityMessage("");
            }}
            rows={4}
            placeholder="Unit,Rent,Available Date,Status,Free Weeks,Renovated,Notes&#10;1204,1795,07/15/2026,available,8,yes,Top floor&#10;1308,1845,07/20/2026,available,8,no,"
            className="mt-3 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 text-sm font-bold text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
          />

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-bold text-[#526260]">
              Importing replaces the availability rows for this floor plan only.
            </p>

            <button
              type="button"
              onClick={importBulkAvailability}
              className="inline-flex items-center justify-center rounded-xl bg-[#173f3f] px-4 py-2 text-sm font-black text-white hover:bg-[#102426]"
            >
              Import Rows
            </button>
          </div>

          {bulkAvailabilityMessage && (
            <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#1f6f63] ring-1 ring-[#d7e6df]">
              {bulkAvailabilityMessage}
            </p>
          )}
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
                <label className="flex items-center gap-3 rounded-2xl bg-white p-4">
                  <input
                    type="checkbox"
                    checked={Boolean(availableUnit.isRenovated)}
                    onChange={(event) =>
                      onAvailabilityChange(
                        floorPlan.id,
                        availableUnit.id,
                        "isRenovated",
                        event.target.checked
                      )
                    }
                    className="h-5 w-5 rounded border-[#b8d9d0] text-[#1f6f63] focus:ring-[#f2b84b]"
                  />
                  <span>
                    <span className="block text-sm font-black text-[#102426]">
                      Renovated unit
                    </span>
                    <span className="text-xs font-semibold text-[#526260]">
                      Shows a renter badge for this unit number.
                    </span>
                  </span>
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
                    <option value="0">Rent credit only</option>
                    {WEEKS_FREE_OPTIONS.filter((weeks) => weeks > 0).map((weeks) => (
                      <option key={weeks} value={String(weeks)}>
                        {weeks} weeks free
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rounded-2xl bg-white p-4">
                  <span className="text-sm font-semibold text-[#526260]">
                    Unit Rent Credit
                  </span>
                  <input
                    type="text"
                    value={availableUnit.rentCreditSpecial}
                    onChange={(event) =>
                      onAvailabilityChange(
                        floorPlan.id,
                        availableUnit.id,
                        "rentCreditSpecial",
                        event.target.value
                      )
                    }
                    placeholder="$1,500"
                    className="mt-2 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 font-black text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
                  />
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

async function resolveManagementCompany({
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

    const createdCompany = await createStoredManagementCompany({
      name: newCompanyName,
    });

    setManagementCompanies(await getAllManagementCompanies());
    return createdCompany;
  }

  const selectedCompany = await getManagementCompanyById(propertyDraft.managementCompanyId);

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

  const existingCompanyId = await getManagementCompanyIdByName(fallbackCompanyName);
  const existingCompany = await getManagementCompanyById(existingCompanyId);

  if (existingCompany) {
    return existingCompany;
  }

  const createdCompany = await createStoredManagementCompany({
    name: fallbackCompanyName,
  });

  setManagementCompanies(await getAllManagementCompanies());
  return createdCompany;
}

async function savePropertyWithPhotoFallback({ isEditing, propertyId, propertyPayload }) {
  try {
    return isEditing
      ? await updateStoredProperty(propertyId, propertyPayload)
      : await createStoredProperty(propertyPayload);
  } catch (error) {
    console.error(error);
  }

  const storageSafePayload = createStorageSafePhotoPayload(propertyPayload);

  try {
    return isEditing
      ? await updateStoredProperty(propertyId, storageSafePayload)
      : await createStoredProperty(storageSafePayload);
  } catch (error) {
    console.error(error);
    return null;
  }
}

function createStorageSafePhotoPayload(propertyPayload) {
  const propertyPhotos = (propertyPayload.photos || []).slice(0, 2);
  const floorPlans = (propertyPayload.floorPlans || []).map((floorPlan) => {
    return {
      ...floorPlan,
      photos: [],
      image: "",
      cardImage: "",
      thumbnailImage: "",
    };
  });

  return {
    ...propertyPayload,
    photos: propertyPhotos,
    image: getPhotoImageUrl(propertyPhotos[0]) || "",
    cardImage: propertyPayload.cardImage || propertyPhotos[0]?.cardUrl || propertyPhotos[0]?.thumbnailUrl || "",
    thumbnailImage: propertyPayload.thumbnailImage || propertyPhotos[0]?.thumbnailUrl || propertyPhotos[0]?.cardUrl || "",
    floorPlans,
  };
}

function createDraftFromProperty(property) {
  const managementCompanyId = property.managementCompanyId || "";

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
    cardImage: property.cardImage || "",
    thumbnailImage: property.thumbnailImage || "",
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
    rentCreditSpecial: "",
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
    isRenovated: false,
    specialMode: "floorPlan",
    freeWeeks: "",
    rentCreditSpecial: "",
    adminFeeSpecial: "",
    adminFeeSpecialType: "admin",
    notes: "",
  };
}

function parseAvailabilityImportRows(value) {
  const rows = String(value || "")
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  return rows
    .filter((row, index) => !isAvailabilityHeaderRow(row, index))
    .map(parseAvailabilityImportRow)
    .filter((availableUnit) =>
      [availableUnit.unit, availableUnit.availableDate, availableUnit.rent, availableUnit.notes]
        .some(Boolean)
    );
}

function isAvailabilityHeaderRow(row, index) {
  if (index !== 0) return false;

  return /unit/i.test(row) && /(rent|available|date|status)/i.test(row);
}

function parseAvailabilityImportRow(row) {
  const columns = splitAvailabilityImportColumns(row);
  const [unit = "", rent = "", availableDate = "", status = "", freeWeeks = ""] = columns;
  const renovated = columns.length > 6 ? columns[5] || "" : "";
  const notes = columns.length > 6 ? columns[6] || "" : columns[5] || "";

  return {
    ...createBlankAvailableUnit(),
    unit: unit.trim(),
    rent: formatImportedRent(rent),
    availableDate: normalizeImportedDate(availableDate),
    status: normalizeImportedStatus(status),
    isRenovated: isAffirmativeValue(renovated) || /renovated|updated|upgraded/i.test(notes),
    specialMode: freeWeeks.trim() ? "custom" : "floorPlan",
    freeWeeks: freeWeeks.trim(),
    notes: notes.trim(),
  };
}

function splitAvailabilityImportColumns(row) {
  const delimiter = row.includes("\t") ? "\t" : ",";
  const columns = [];
  let currentColumn = "";
  let isQuoted = false;

  for (const character of row) {
    if (character === '"') {
      isQuoted = !isQuoted;
      continue;
    }

    if (character === delimiter && !isQuoted) {
      columns.push(currentColumn.trim());
      currentColumn = "";
      continue;
    }

    currentColumn += character;
  }

  columns.push(currentColumn.trim());
  return columns;
}

function formatImportedRent(value) {
  const rentNumber = Number(String(value || "").replace(/[^0-9.]/g, ""));

  if (!rentNumber) return "";

  return `$${Math.round(rentNumber).toLocaleString()}`;
}

function normalizeImportedDate(value) {
  const dateValue = String(value || "").trim();
  if (!dateValue) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;

  const match = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return dateValue;

  const [, month, day, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;

  return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizeImportedStatus(value) {
  const status = String(value || "").trim().toLowerCase();

  if (["leased", "unavailable"].includes(status)) return "leased";
  if (["limited", "hold", "pending"].includes(status)) return "limited";

  return "available";
}

function isAffirmativeValue(value) {
  return ["yes", "y", "true", "renovated", "updated", "upgraded", "1"].includes(
    String(value || "").trim().toLowerCase()
  );
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
          rentCreditSpecial: "",
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
      const rentCreditSpecial =
        floorPlan.rentCreditSpecial ||
        floorPlan.special?.rentCreditSpecial ||
        getRentCreditSpecialFromLabel(currentSpecialLabel);
      const adminFeeSpecialType =
        floorPlan.adminFeeSpecialType ||
        floorPlan.special?.adminFeeSpecialType ||
        getAdminFeeSpecialTypeFromLabel(adminFeeSpecial || currentSpecialLabel);

      return {
        ...createBlankFloorPlan(),
        id: floorPlan.id || `${property.id}-floor-plan-${index}`,
        name: floorPlan.name || "",
        bedrooms: floorPlan.bedrooms ?? floorPlan.beds ?? "",
        bathrooms: floorPlan.bathrooms || floorPlan.baths || "",
        squareFeet: floorPlan.squareFeet || floorPlan.sqft || "",
        startingRent: floorPlan.startingRent || floorPlan.rent || "",
        requiredMonthlyFees: floorPlan.requiredMonthlyFees || "",
        totalMonthlyRent: floorPlan.totalMonthlyRent || floorPlan.rent || "",
        marketRent: floorPlan.marketRent || "",
        freeWeeks: String(parsedFreeWeeks || 0),
        rentCreditSpecial,
        adminFeeSpecial,
        adminFeeSpecialType,
        leaseTermMonths: String(floorPlan.leaseTermMonths || floorPlan.special?.leaseTermMonths || 12),
        image:
          floorPlan.image ||
          (floorPlan.photos || []).map(getPhotoImageUrl).find(Boolean) ||
          "",
        cardImage: floorPlan.cardImage || "",
        thumbnailImage: floorPlan.thumbnailImage || "",
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
  const rentCreditSpecial = floorPlan.rentCreditSpecial.trim();
  const adminFeeSpecial = floorPlan.adminFeeSpecial.trim();
  const adminFeeSpecialType = floorPlan.adminFeeSpecialType || "admin";
  const currentSpecial = getSpecialLabel(
    freeWeeks,
    rentCreditSpecial,
    adminFeeSpecial,
    adminFeeSpecialType
  );
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
    rentCreditSpecial,
    adminFeeSpecial,
    adminFeeSpecialType,
    leaseTermMonths,
    special: currentSpecial
      ? {
          type: "weeks_free",
          freeWeeks,
          rentCreditSpecial,
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
    const rentCreditSpecial =
      availableUnit.rentCreditSpecial ||
      availableUnit.special?.rentCreditSpecial ||
      getRentCreditSpecialFromLabel(specialLabel);
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
      isRenovated: Boolean(availableUnit.isRenovated || availableUnit.renovated),
      specialMode:
        availableUnit.specialMode ||
        (Number(parsedFreeWeeks || 0) > 0 || rentCreditSpecial ? "custom" : "floorPlan"),
      freeWeeks: Number(parsedFreeWeeks || 0) > 0 ? String(parsedFreeWeeks) : "",
      rentCreditSpecial,
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
  const rentCreditSpecial =
    specialMode === "none" ? "" : availableUnit.rentCreditSpecial.trim();
  const adminFeeSpecial = specialMode === "none" ? "" : availableUnit.adminFeeSpecial.trim();
  const adminFeeSpecialType = availableUnit.adminFeeSpecialType || "admin";
  const currentSpecial = specialMode === "none"
    ? ""
    : getSpecialLabel(
        freeWeeks,
        rentCreditSpecial,
        adminFeeSpecial,
        adminFeeSpecialType
      );

  return {
    id: availableUnit.id,
    unit: unitLabel,
    availableDate,
    available: formatAvailableDate(availableDate),
    rent: availableUnit.rent.trim() || defaultRent.trim(),
    status: availableUnit.status,
    isRenovated: Boolean(availableUnit.isRenovated),
    specialMode,
    freeWeeks,
    rentCreditSpecial,
    adminFeeSpecial,
    adminFeeSpecialType,
    currentSpecial,
    special: currentSpecial
      ? {
          type: "weeks_free",
          freeWeeks,
          rentCreditSpecial,
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
  if (availableUnit.specialMode === "custom") {
    return String(availableUnit.freeWeeks || (availableUnit.rentCreditSpecial ? "0" : "0.5"));
  }

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
  const rentCreditSpecialNumber = parseCurrency(floorPlan.rentCreditSpecial);
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
  const monthlyConcession =
    (startingRentNumber * freeMonths + rentCreditSpecialNumber) / leaseTermMonths;
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

function getSpecialLabel(
  freeWeeks,
  rentCreditSpecial = "",
  adminFeeSpecial = "",
  adminFeeSpecialType = "admin"
) {
  const specialParts = [];

  if (freeWeeks) {
    specialParts.push(`${freeWeeks} ${freeWeeks === 1 ? "week" : "weeks"} free`);
  }

  const rentCreditLabel = getRentCreditSpecialLabel(rentCreditSpecial);
  if (rentCreditLabel) {
    specialParts.push(rentCreditLabel);
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

function getRentCreditSpecialFromLabel(label) {
  const match = String(label || "").match(/\$?\s*([\d,]+(?:\.\d+)?)\s*(?:off|rent credit|credit)/i);
  return match ? formatCurrency(Number(match[1].replace(/,/g, ""))) : "";
}

function getAdminFeeSpecialFromLabel(label) {
  const parts = String(label || "")
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.find((part) => !/weeks?\s+free/i.test(part) && !/(\$?\s*[\d,]+(?:\.\d+)?)\s*(?:off|rent credit|credit)/i.test(part)) || "";
}

function getAdminFeeSpecialTypeFromLabel(label) {
  return /application\s+fees?/i.test(String(label || "")) ? "application" : "admin";
}

function getFeeSpecialLabel(adminFeeSpecial, adminFeeSpecialType) {
  const trimmedSpecial = adminFeeSpecial.trim();
  if (!trimmedSpecial) return "";

  if (/(admin|application)\s+fees?|deposit|fee waived|waived fee/i.test(trimmedSpecial)) {
    return trimmedSpecial;
  }

  const feeLabel = adminFeeSpecialType === "application" ? "application fee" : "admin fee";
  return `${trimmedSpecial} ${feeLabel}`;
}

function getRentCreditSpecialLabel(rentCreditSpecial) {
  const rentCreditNumber = parseCurrency(rentCreditSpecial);
  if (!rentCreditNumber) return "";

  return `${formatCurrency(rentCreditNumber)} off base rent`;
}

function normalizePropertyPhotos(property) {
  if (property.photos?.length > 0) {
    return property.photos.map((photo, index) => ({
      id: photo.id || `${property.id}-photo-${index}`,
      name: photo.name || `Photo ${index + 1}`,
      url: photo.url,
      cardUrl: photo.cardUrl || "",
      thumbnailUrl: photo.thumbnailUrl || "",
      category: photo.category || "Property",
    }));
  }

  if (property.image) {
    return [
      {
        id: `${property.id}-primary-photo`,
        name: `${property.name} primary photo`,
        url: property.image,
        cardUrl: property.cardImage || "",
        thumbnailUrl: property.thumbnailImage || "",
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
      cardUrl: photo.cardUrl || "",
      thumbnailUrl: photo.thumbnailUrl || "",
      category: photo.category || "Floor Plan",
    }));
  }

  if (floorPlan.image) {
    return [
      {
        id: `${floorPlan.id || `floor-plan-${index}`}-primary-photo`,
        name: `${floorPlan.name || `Floor Plan ${index + 1}`} primary photo`,
        url: floorPlan.image,
        cardUrl: floorPlan.cardImage || "",
        thumbnailUrl: floorPlan.thumbnailImage || "",
        category: "Floor Plan",
      },
    ];
  }

  return [];
}

async function optimizeDraftPhotos(propertyDraft) {
  const propertyPhotoResult = await optimizePhotoList(propertyDraft.photos, {
    maxDimension: PROPERTY_PHOTO_MAX_DIMENSION,
    targetBytes: PROPERTY_PHOTO_TARGET_BYTES,
  });
  const optimizedPropertyImage =
    propertyPhotoResult.urlMap.get(propertyDraft.image) ||
    (await optimizeImageUrlForStorage(propertyDraft.image, {
      maxDimension: PROPERTY_PHOTO_MAX_DIMENSION,
      targetBytes: PROPERTY_PHOTO_TARGET_BYTES,
    }));

  const floorPlans = await Promise.all(
    propertyDraft.floorPlans.map(async (floorPlan) => {
      const floorPlanPhotoResult = await optimizePhotoList(floorPlan.photos || [], {
        maxDimension: FLOOR_PLAN_PHOTO_MAX_DIMENSION,
        targetBytes: FLOOR_PLAN_PHOTO_TARGET_BYTES,
      });
      const optimizedFloorPlanImage =
        floorPlanPhotoResult.urlMap.get(floorPlan.image) ||
        (await optimizeImageUrlForStorage(floorPlan.image, {
          maxDimension: FLOOR_PLAN_PHOTO_MAX_DIMENSION,
          targetBytes: FLOOR_PLAN_PHOTO_TARGET_BYTES,
        }));

      return {
        ...floorPlan,
        image: optimizedFloorPlanImage,
        photos: floorPlanPhotoResult.photos,
      };
    })
  );

  return {
    ...propertyDraft,
    image: optimizedPropertyImage,
    photos: propertyPhotoResult.photos,
    floorPlans,
  };
}

async function optimizePhotoList(photos = [], options) {
  const urlMap = new Map();
  const optimizedPhotos = await Promise.all(
    photos.map(async (photo) => {
      const optimizedPhoto = await optimizePhotoForStorage(photo, options);
      const currentUrl = getPhotoImageUrl(photo);
      const nextUrl = getPhotoImageUrl(optimizedPhoto);

      if (currentUrl && nextUrl && currentUrl !== nextUrl) {
        urlMap.set(currentUrl, nextUrl);
      }

      return optimizedPhoto;
    })
  );

  return {
    photos: optimizedPhotos,
    urlMap,
  };
}

async function optimizePhotoForStorage(photo, options) {
  const photoUrl = getPhotoImageUrl(photo);
  const sanitizedPhoto = sanitizePhotoForStorage(photo, photoUrl);

  if (!photoUrl || !isDataUrl(photoUrl)) return sanitizedPhoto;

  const currentSize = photo.storedSize || getDataUrlByteSize(photoUrl);

  if (currentSize <= options.targetBytes * 1.15) {
    return {
      ...sanitizedPhoto,
      storedSize: currentSize,
    };
  }

  const compressedPhoto = await compressImageUrl(photoUrl, options);

  return {
    ...sanitizedPhoto,
    url: compressedPhoto.dataUrl,
    storedSize: compressedPhoto.size,
  };
}

async function optimizeImageUrlForStorage(imageUrl, options) {
  if (!imageUrl || !isDataUrl(imageUrl)) return imageUrl || "";

  if (getDataUrlByteSize(imageUrl) <= options.targetBytes * 1.15) {
    return imageUrl;
  }

  const compressedImage = await compressImageUrl(imageUrl, options);

  return compressedImage.dataUrl;
}

function sanitizePhotoForStorage(photo, fallbackUrl = "") {
  return {
    id: photo.id,
    name: photo.name,
    category: photo.category,
    url: photo.url || fallbackUrl,
    originalSize: photo.originalSize,
  };
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
  const imageUrl = URL.createObjectURL(file);

  try {
    return await compressImageUrl(imageUrl, options);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function compressImageUrl(imageUrl, options) {
  const image = await loadImage(imageUrl);
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

    image.onload = () => {
      resolve(image);
    };

    image.onerror = () => {
      reject(new Error("Could not read this image file."));
    };

    image.src = file;
  });
}

function isDataUrl(value) {
  return String(value || "").startsWith("data:");
}

function getDataUrlByteSize(dataUrl) {
  const base64Value = String(dataUrl).split(",")[1] || "";

  return Math.ceil((base64Value.length * 3) / 4);
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
