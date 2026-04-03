import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { database } from "../firebase";
import { ref, onValue } from "firebase/database";
import { getEmployeeSession, logoutEmployee } from "../auth/employeeAuth";
import { computeEmployeePayroll } from "../ui/payrollUtils";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const session = getEmployeeSession();
  const employeeId = session?.employeeId;

  const [employees, setEmployees] = useState({});
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubEmployees = onValue(ref(database, "employees"), (snap) => {
      setEmployees(snap.val() || {});
    });

    const unsubRoot = onValue(ref(database, "/"), (snap) => {
      const data = snap.val() || {};
      const { employees: _employeesNode, ...rest } = data;
      const filtered = Object.values(rest).filter(
        (rec) => rec && rec.employeeId && rec.timeIn && rec.timeOut && rec.date
      );
      setAttendance(filtered);
      setLoading(false);
    });

    return () => {
      if (typeof unsubEmployees === "function") unsubEmployees();
      if (typeof unsubRoot === "function") unsubRoot();
    };
  }, []);

  const emp = employees?.[employeeId];

  const computed = useMemo(() => {
    if (!employeeId || !emp) return null;
    return computeEmployeePayroll(emp, employeeId, attendance);
  }, [attendance, emp, employeeId]);

  const onLogout = () => {
    logoutEmployee();
    navigate("/employee/login", { replace: true });
  };

  if (!employeeId) return null;

  return (
    <div className="container">
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Employee Dashboard</h1>
          <div style={{ opacity: 0.85, marginTop: 6 }}>
            Employee ID: <b>{employeeId}</b>
          </div>
        </div>
        <button onClick={onLogout} style={{ background: "#dc2626" }}>
          Logout
        </button>
      </div>

      {loading && (
        <div className="card" style={{ opacity: 0.9 }}>
          Loading...
        </div>
      )}

      {!loading && !emp && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Employee not found</h2>
          <div style={{ opacity: 0.9 }}>
            No employee record exists for ID <b>{employeeId}</b>. Please contact admin.
          </div>
        </div>
      )}

      {!loading && emp && computed && (
        <>
          <div className="stats">
            <div className="card" style={{ flex: 1 }}>
              <div style={{ opacity: 0.85 }}>Name</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{emp.name}</div>
            </div>
            <div className="card" style={{ flex: 1 }}>
              <div style={{ opacity: 0.85 }}>Department</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{emp.department}</div>
            </div>
            <div className="card" style={{ flex: 1 }}>
              <div style={{ opacity: 0.85 }}>Net Salary (Current Cutoff)</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>₱{computed.summary.net.toFixed(2)}</div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Salary Computation</h2>
            <div style={{ opacity: 0.9, marginBottom: 10 }}>
              Cutoff: {computed.cutoff.start.toLocaleDateString()} - {computed.cutoff.end.toLocaleDateString()}
            </div>

            <div style={{ overflowX: "auto" }}>
              <table>
                <tbody>
                  <tr><td>Days Worked</td><td style={{ textAlign: "right" }}>{computed.summary.daysWorked}</td></tr>
                  <tr><td>Total Hours</td><td style={{ textAlign: "right" }}>{computed.summary.totalHours}</td></tr>
                  <tr><td>Overtime (hrs)</td><td style={{ textAlign: "right" }}>{computed.summary.overtime}</td></tr>
                  <tr><td>Late Minutes</td><td style={{ textAlign: "right" }}>{computed.summary.lateMinutes}</td></tr>
                  <tr><td>Absences</td><td style={{ textAlign: "right" }}>{computed.summary.absences}</td></tr>
                  <tr><td>Base Pay</td><td style={{ textAlign: "right" }}>₱{computed.summary.base.toFixed(2)}</td></tr>
                  <tr><td>Overtime Pay</td><td style={{ textAlign: "right" }}>₱{computed.summary.otPay.toFixed(2)}</td></tr>
                  <tr><td>Late Deduction</td><td style={{ textAlign: "right" }}>₱{computed.summary.lateDeduct.toFixed(2)}</td></tr>
                  <tr><td>Absence Deduction</td><td style={{ textAlign: "right" }}>₱{computed.summary.absenceDeduct.toFixed(2)}</td></tr>
                  <tr>
                    <td style={{ fontWeight: 800 }}>Net Salary</td>
                    <td style={{ textAlign: "right", fontWeight: 800 }}>₱{computed.summary.net.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Work Days (Current Cutoff)</h2>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Work Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {computed.records
                    .slice()
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map((r, idx) => (
                      <tr key={idx}>
                        <td>{new Date(r.date).toLocaleDateString()}</td>
                        <td>{r.timeIn}</td>
                        <td>{r.timeOut}</td>
                        <td>{r.workHours ?? "-"}</td>
                      </tr>
                    ))}

                  {computed.records.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", opacity: 0.85, padding: 18 }}>
                        No attendance records found for this cutoff.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}