import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./auth/ProtectedRoute";
import EmployeeLogin from "./pages/EmployeeLogin";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeProtectedRoute from "./auth/EmployeeProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
  <Route path="/" element={<Navigate to="/admin" replace />} />

  <Route path="/admin/login" element={<AdminLogin />} />
  <Route
    path="/admin"
    element={
      <ProtectedRoute>
        <AdminDashboard />
      </ProtectedRoute>
    }
  />

  <Route path="/employee/login" element={<EmployeeLogin />} />
  <Route
    path="/employee"
    element={
      <EmployeeProtectedRoute>
        <EmployeeDashboard />
      </EmployeeProtectedRoute>
    }
  />

  <Route path="*" element={<Navigate to="/admin" replace />} />
</Routes>
    </BrowserRouter>
  );
}