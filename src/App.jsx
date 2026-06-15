import { BrowserRouter, Routes, Route } from "react-router-dom";

import { clearLegacyDemoData } from "./data/localDataReset";
import AdminLayout from "./layouts/AdminLayout";

import AdminDashboard from "./pages/AdminDashboard";
import PropertiesTab from "./pages/PropertiesTab";
import LeadsTab from "./pages/LeadsTab";
import LeadMessagePage from "./pages/LeadMessagePage";
import SendPropertiesPage from "./pages/SendPropertiesPage";
import RenterPropertiesList from "./pages/RenterPropertiesList";
import DataHistory from "./pages/DataHistory";
import PropertyDetails from "./pages/PropertyDetails";
import PropertyFormPage from "./pages/PropertyFormPage";
import PublicPropertyListing from "./pages/PublicPropertyListing";
import HomePage from "./pages/HomePage";
import StartPage from "./pages/StartPage";
import LeadDetailsPage from "./pages/LeadDetailsPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import PropertySearchPage from "./pages/PropertySearchPage";
import DallasSeoLandingPage from "./pages/DallasSeoLandingPage";
import {
  PrivacyPolicyPage,
  TermsAndConditionsPage,
} from "./pages/LegalPage";

clearLegacyDemoData();

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/start" element={<StartPage />} />
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
          path="/properties/:propertyId"
          element={<PublicPropertyListing />}
        />
      </Routes>
    </BrowserRouter>
  );
}
