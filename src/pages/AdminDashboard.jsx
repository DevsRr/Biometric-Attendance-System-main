import React from "react";
import { useNavigate } from "react-router-dom";
import { logoutAdmin } from "../auth/auth";
import PayrollDashboard from "../ui/PayrollDashboard";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const onLogout = () => {
    logoutAdmin();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="container">
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
          <div style={{ opacity: 0.85, marginTop: 6 }}>
            Biometric Attendance • Payroll • Employees
          </div>
        </div>
        <button onClick={onLogout} style={{ background: "#dc2626" }}>
          Logout
        </button>
      </div>

      <PayrollDashboard />
    </div>
  );
}