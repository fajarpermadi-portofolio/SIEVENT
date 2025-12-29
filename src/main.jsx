import "./tailwind.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

// Layout
import App from "./App.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";

// User Pages
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import DashboardUser from "./pages/DashboardUser.jsx";
import ScanPage from "./pages/ScanPage.jsx";
import EventDetail from "./pages/EventDetail.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminEventDetail from "./pages/AdminEventDetail.jsx";
import AdminEvent from "./pages/AdminEvent.jsx";
import AdminEventEdit from "./pages/AdminEventEdit.jsx";
import AdminQRDynamic from "./pages/AdminQRDynamic.jsx";
import AdminCertificateEditor from "./pages/AdminCertificateEditor.jsx";

// NEW PAGE — Sertifikat Saya (butuh login)
import MyCertificates from "./pages/MyCertificates.jsx";

// Middleware
import RequireAuth from "./components/RequireAuth.jsx";
import RequireAdmin from "./components/RequireAdmin.jsx";

const router = createBrowserRouter([
  // ============================
  // 🔐 AUTH ROUTES
  // ============================
  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      { path: "register", element: <Register /> },
      { path: "login", element: <Login /> },
      { path: "callback", element: <AuthCallback /> },
    ],
  },

  // ============================
  // 👤 USER ROUTES (LOGIN WAJIB)
  // ============================
  {
    path: "/",
    element: (
      <RequireAuth>
        <App />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardUser /> },
      { path: "event/:id", element: <EventDetail /> },
      { path: "scan/:eventId/:type", element: <ScanPage /> },
    ],
  },

  // ============================
  // 🛠 ADMIN ROUTES
  // ============================
  {
    path: "/admin",
    element: (
      <RequireAuth>
        <RequireAdmin>
          <App />
        </RequireAdmin>
      </RequireAuth>
    ),
    children: [
      { path: "dashboard", element: <AdminDashboard /> },
      { path: "event/:id", element: <AdminEventDetail /> },
      { path: "event", element: <AdminEvent /> },
      { path: "event/edit/:id", element: <AdminEventEdit /> },
      { path: "dynamicqr/:eventId/:type", element: <AdminQRDynamic /> },
      { path: "certificate-editor/:eventId", element: <AdminCertificateEditor /> },
    ],
  },

  // ============================
  // ⭐ SERTIFIKAT SAYA (WAJIB LOGIN)
  // ============================
  {
    path: "/my-certificates",
    element: (
      <RequireAuth>
        <MyCertificates />
      </RequireAuth>
    ),
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <>
    <Toaster position="top-center" />
    <RouterProvider router={router} />
  </>
);
