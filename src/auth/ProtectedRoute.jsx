import React from "react";
import { Navigate } from "react-router-dom";
import { isAdminAuthed } from "./auth";

export default function ProtectedRoute({ children }) {
  if (!isAdminAuthed()) return <Navigate to="/admin/login" replace />;
  return children;
}