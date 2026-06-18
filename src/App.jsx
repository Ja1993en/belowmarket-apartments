import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { clearLegacyDemoData } from "./data/localDataReset";

const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PropertiesTab = lazy(() => import("./pages/PropertiesTab"));
const LeadsTab = lazy(() => import("./pages/LeadsTab"));
const LeadMessagePage = lazy(() => import("./pages/LeadMessagePage"));
const SendPropertiesPage = lazy(() => import("./pages/SendPropertiesPage"));
const RenterPropertiesList = lazy(() => import("./pages/RenterPropertiesList"));
const DataHistory = lazy(() => import("./pages/DataHistory"));
const PropertyDetails = lazy(() => import("./pages/PropertyDetails"));
const PropertyFormPage = lazy(() => import("./pages/PropertyFormPage"));
const PublicPropertyListing = lazy(() => import("./pages/PublicPropertyListing"));
const HomePage = lazy(() => import("./pages/HomePage"));
const StartPage = lazy(() => import("./pages/StartPage"));
const ThankYouPage = lazy(() => import("./pages/ThankYouPage"));
const LeadDetailsPage = lazy(() => import("./pages/LeadDetailsPage"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const PropertySearchPage = lazy(() => import("./pages/PropertySearchPage"));
const DallasSeoLandingPage = lazy(() => import("./pages/DallasSeoLandingPage"));
const PrivacyPolicyPage = lazy(() =>
  import("./pages/LegalPage").then((module) => ({
    default: module.PrivacyPolicyPage,
  }))
);
const TermsAndConditionsPage = lazy(() =>
  import("./pages/LegalPage").then((module) => ({
    default: module.TermsAndConditionsPage,
  }))
);
const AboutPage = lazy(() =>
  import("./pages/TrustPages").then((module) => ({ default: module.AboutPage }))
);
const ContactPage = lazy(() =>
  import("./pages/TrustPages").then((module) => ({ default: module.ContactPage }))
);
const MethodologyPage = lazy(() =>
  import("./pages/TrustPages").then((module) => ({
    default: module.MethodologyPage,
  }))
);

clearLegacyDemoData();

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/start" element={<StartPage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="properties" element={<PropertiesTab />} />
            <Route path="properties/new" element={<PropertyFormPage />} />
            <Route path="properties/:propertyId/edit" element={<PropertyFormPage />} />
            <Route path="properties/:propertyId" element={<PropertyDetails />} />
            <Route path="leads" element={<LeadsTab />} />
            <Route path="leads/:leadId" element={<LeadDetailsPage />} />
            <Route path="leads/:leadId/message" element={<LeadMessagePage />} />
            <Route
              path="leads/:leadId/send-properties"
              element={<SendPropertiesPage />}
            />
            <Route path="data-history" element={<DataHistory />} />
          </Route>

          <Route path="/r/:token" element={<RenterPropertiesList />} />
          <Route path="/properties" element={<PropertySearchPage />} />
          <Route
            path="/apartments/:pageType"
            element={<DallasSeoLandingPage />}
          />
          <Route
            path="/apartments/dallas-tx/:pageType"
            element={<DallasSeoLandingPage />}
          />
          <Route
            path="/dallas-apartments-6-weeks-free"
            element={<DallasSeoLandingPage pageKey="6-weeks-free" />}
          />
          <Route
            path="/dallas-apartments-4-weeks-free"
            element={<DallasSeoLandingPage pageKey="4-weeks-free" />}
          />
          <Route
            path="/dallas-apartments-no-deposit"
            element={<DallasSeoLandingPage pageKey="no-deposit" />}
          />
          <Route
            path="/farmers-branch-apartments-specials"
            element={<DallasSeoLandingPage pageKey="farmers-branch-specials" />}
          />
          <Route
            path="/irving-apartments-specials"
            element={<DallasSeoLandingPage pageKey="irving-specials" />}
          />
          <Route
            path="/oak-lawn-apartments-specials"
            element={<DallasSeoLandingPage pageKey="oak-lawn-apartments-specials" />}
          />
          <Route
            path="/dallas-luxury-apartments-specials"
            element={<DallasSeoLandingPage pageKey="dallas-luxury-specials" />}
          />
          <Route
            path="/dallas-apartments-with-move-in-specials"
            element={<DallasSeoLandingPage pageKey="move-in-specials" />}
          />
          <Route
            path="/dallas-apartments-waived-admin-fee"
            element={<DallasSeoLandingPage pageKey="waived-admin-fee" />}
          />
          <Route
            path="/las-colinas-apartments-specials"
            element={<DallasSeoLandingPage pageKey="las-colinas-specials" />}
          />
          <Route
            path="/farmers-branch-apartments-6-weeks-free"
            element={<DallasSeoLandingPage pageKey="farmers-branch-6-weeks-free" />}
          />
          <Route
            path="/uptown-dallas-apartments-4-weeks-free"
            element={<DallasSeoLandingPage pageKey="uptown-4-weeks-free" />}
          />
          <Route
            path="/medical-district-apartments-specials"
            element={<DallasSeoLandingPage pageKey="medical-district-specials" />}
          />
          <Route
            path="/turtle-creek-apartments-specials"
            element={<DallasSeoLandingPage pageKey="turtle-creek-specials" />}
          />
          <Route
            path="/farmers-branch-apartments-8-weeks-free"
            element={<DallasSeoLandingPage pageKey="farmers-branch-8-weeks-free" />}
          />
          <Route
            path="/west-dallas-apartments-specials"
            element={<DallasSeoLandingPage pageKey="west-dallas-specials" />}
          />
          <Route
            path="/deep-ellum-apartments-specials"
            element={<DallasSeoLandingPage pageKey="deep-ellum-specials" />}
          />
          <Route
            path="/north-dallas-apartments-specials"
            element={<DallasSeoLandingPage pageKey="north-dallas-specials" />}
          />

          <Route
            path="/properties/:propertyId"
            element={<PublicPropertyListing />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function RouteLoadingFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8f1] px-4 text-[#102426]">
      <div className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-[#d7e6df]">
        <p className="text-sm font-black text-[#173f3f]">Below Market Apartments</p>
        <p className="mt-1 text-xs font-bold text-[#526260]">Loading...</p>
      </div>
    </main>
  );
}
