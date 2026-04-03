import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { database } from "../firebase";
import { ref, get } from "firebase/database";
import { setEmployeeSession } from "../auth/employeeAuth";
import { loginAdmin } from "../auth/auth";

export default function LandingLogin() {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const id = employeeId.trim();
    const p = pin.trim();

    if (!id || !p) {
      setError("Enter Employee ID and PIN.");
      return;
    }

    setLoading(true);
    try {
      // 1) Hidden admin access (no admin UI):
      // If ID+PIN matches admin creds, go admin.
      if (loginAdmin(id, p)) {
        navigate("/admin", { replace: true });
        return;
      }

      // 2) Employee PIN check from Firebase: employees/{id}/pin
      const snap = await get(ref(database, `employees/${id}`));
      const emp = snap.val();

      if (!emp) {
        setError("Employee not found.");
        return;
      }

      const storedPin = String(emp.pin ?? "").trim();
      if (!storedPin) {
        setError("PIN is not set for this employee. Contact admin.");
        return;
      }

      if (storedPin !== p) {
        setError("Invalid PIN.");
        return;
      }

      setEmployeeSession(id);
      navigate("/employee", { replace: true });
    } catch (err) {
      setError("Login failed. Check connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Employee Login</h1>
        <p style={{ opacity: 0.9, marginTop: 6 }}>
          Enter your Employee ID and PIN.
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Employee ID</label>
            <input
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              style={inputStyle}
              placeholder="e.g. 1001"
              autoComplete="username"
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              style={inputStyle}
              placeholder="****"
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

          <button type="submit" style={{ width: "100%", padding: 10 }} disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
};