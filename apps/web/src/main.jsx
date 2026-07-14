import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./i18n";
import { AuthProvider } from "./auth";
import { PersonaProvider } from "./persona";
import AccessibilityBar from "./components/AccessibilityBar";
import AdminBanner from "./components/AdminBanner";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <PersonaProvider>
            <AdminBanner />
            <App />
            <AccessibilityBar />
          </PersonaProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
