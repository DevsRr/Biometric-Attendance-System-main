import React from "react";
import { Navigate } from "react-router-dom";
import { isEmployeeAuthed } from "./employeeAuth";

export default function EmployeeProtectedRoute({ children }) {
  if (!isEmployeeAuthed()) return <Navigate to="/employee/login" replace />;
  return children;
}