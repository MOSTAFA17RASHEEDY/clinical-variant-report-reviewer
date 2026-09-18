import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { Layout } from "./components/Layout";
import { Worklist } from "./pages/Worklist";
import { DraftReview } from "./pages/DraftReview";
import { VariantDetail } from "./pages/VariantDetail";
import { SignOff } from "./pages/SignOff";
import { AuditTrail } from "./pages/AuditTrail";
import { Settings } from "./pages/Settings";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Worklist />} />
          <Route path="draft-review" element={<DraftReview />} />
          <Route path="variant/:variantKey" element={<VariantDetail />} />
          <Route path="sign-off" element={<SignOff />} />
          <Route path="audit-trail" element={<AuditTrail />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
