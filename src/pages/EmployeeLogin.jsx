import React from "react";
import { Navigate } from "react-router-dom";
export default function EmployeeLogin() {
  return <Navigate to="/" replace />;
}

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    setError("");

    const ok = loginEmployee(employeeId);
    if (!ok) {
      setError("Please enter your Employee ID.");
      return;
    }
    navigate("/employee", { replace: true });
  };

  return (
    <div className="container" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Employee View</h1>
        <p style={{ opacity: 0.9, marginTop: 6 }}>
          Enter your Employee ID to view your work days and current salary computation.
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Employee ID</label>
            <input
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                outline: "none",
              }}
              placeholder="e.g. 1001"
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
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}