import { BrowserRouter, Routes, Route } from "react-router-dom";

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/start" element={<StartPage />} />
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
          path="/properties/:propertyId"
          element={<PublicPropertyListing />}
        />
      </Routes>
    </BrowserRouter>
  );
}
