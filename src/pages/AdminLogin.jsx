import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../auth/auth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    setError("");

    const ok = loginAdmin(username.trim(), password);
    if (!ok) {
      setError("Invalid username or password.");
      return;
    }
    navigate("/admin", { replace: true });
  };

  return (
    <div className="container" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Admin Login</h1>
        <p style={{ opacity: 0.9, marginTop: 6 }}>
          Sign in to access the Attendance & Payroll dashboard.
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                outline: "none",
              }}
              autoComplete="username"
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                outline: "none",
              }}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: 12,
                padding: 10,
                borderRadius: 8,
                background: "rgba(220,38,38,0.2)",
                border: "1px solid rgba(220,38,38,0.35)",
              }}
            >
              {error}
            </div>
          )}

          <button type="submit" style={{ width: "100%", padding: 10 }}>
            Login
          </button>

          <div style={{ marginTop: 12, opacity: 0.85, fontSize: 13 }}>
            Default credentials: <b>admin</b> / <b>admin123</b>
          </div>
        </form>
      </div>
    </div>
  );
}