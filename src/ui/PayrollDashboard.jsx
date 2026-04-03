import React, { useEffect, useMemo, useState } from "react";
import { database } from "../firebase";
import { ref, onValue, set, remove } from "firebase/database";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { getCutoffRange, countWeekdays } from "./payrollUtils";

export default function PayrollDashboard() {
  const [employees, setEmployees] = useState({});
  const [attendance, setAttendance] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [form, setForm] = useState({ id: "", name: "", department: "", rate: "" });
  const [editing, setEditing] = useState(false);

  // FETCH DATA
  useEffect(() => {
    const unsubEmployees = onValue(ref(database, "employees"), (snap) => {
      setEmployees(snap.val() || {});
    });

    const unsubRoot = onValue(ref(database, "/"), (snap) => {
      const data = snap.val() || {};
      // remove employees node from attendance scan
      const { employees: _employeesNode, ...rest } = data;

      const filtered = Object.values(rest).filter(
        (rec) => rec && rec.employeeId && rec.timeIn && rec.timeOut && rec.date
      );
      setAttendance(filtered);
    });

    return () => {
      // firebase onValue returns unsubscribe function in v9 compat style;
      // in modular SDK it returns undefined, so guard:
      if (typeof unsubEmployees === "function") unsubEmployees();
      if (typeof unsubRoot === "function") unsubRoot();
    };
  }, []);

  const getCutoffRange = () => {
    const today = new Date();
    const start =
      today.getDate() <= 15
        ? new Date(today.getFullYear(), today.getMonth(), 1)
        : new Date(today.getFullYear(), today.getMonth(), 16);

    const end =
      today.getDate() <= 15
        ? new Date(today.getFullYear(), today.getMonth(), 15)
        : new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // normalize times
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  const countWeekdays = (start, end) => {
    let count = 0;
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);

    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  const computePayroll = () => {
    const { start, end } = getCutoffRange();
    const totalWorkDays = countWeekdays(start, end);

    const results = Object.keys(employees).map((empId) => {
      const emp = employees[empId];

      let daysWorked = 0;
      let overtime = 0;
      let lateMinutes = 0;
      let totalHours = 0;

      attendance.forEach((record) => {
        if (record.employeeId !== empId) return;

        const date = new Date(record.date);
        const day = date.getDay();

        if (date >= start && date <= end && day !== 0 && day !== 6) {
          daysWorked++;

          const workHours = parseFloat(record.workHours || 0);
          totalHours += workHours;

          const [inH, inM] = String(record.timeIn).split(":").map(Number);
          const late = inH * 60 + inM - 480; // after 8:00 AM
          if (late > 0) lateMinutes += late;

          if (workHours > 8) overtime += workHours - 8;
        }
      });

      const absences = Math.max(0, totalWorkDays - daysWorked);
      const dailyRate = Number(emp.rate || 0);
      const hourlyRate = dailyRate / 8;

      // Pay based on hours actually worked (your original approach)
      const base = totalHours * hourlyRate;
      const otPay = overtime * hourlyRate * 1.25;
      const lateDeduct = lateMinutes * (hourlyRate / 60);
    const hasAnyRecordThisCutoff = attendance.some((r) => {
  if (!r || r.employeeId !== empId) return false;
  const d = new Date(r.date);
  const day = d.getDay();
  return d >= start && d <= end && day !== 0 && day !== 6;
});

const absenceDeduct = hasAnyRecordThisCutoff ? absences * dailyRate : 0;
      const net = base + otPay - lateDeduct - absenceDeduct;

      let status = "";
      let statusColor = "";
      if (absences === 0) {
        status = "Perfect Attendance";
        statusColor = "green";
      } else if (absences < 5) {
        status = "Warning";
        statusColor = "orange";
      } else {
        status = "RED FLAG";
        statusColor = "red";
      }

      return {
        id: empId,
        name: emp.name,
        department: emp.department,
        daysWorked,
        totalHours: Number(totalHours).toFixed(2),
        overtime: Number(overtime).toFixed(2),
        lateMinutes,
        absences,
        status,
        statusColor,
        net: Number(net),
        rate: dailyRate,
      };
    });

    setPayroll(results);
  };

  useEffect(() => {
    computePayroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, attendance]);

  const departments = useMemo(
    () => ["All", ...new Set(Object.values(employees).map((e) => e.department).filter(Boolean))],
    [employees]
  );

  const filteredPayroll = payroll.filter(
    (emp) =>
      emp.name?.toLowerCase().includes(search.toLowerCase()) &&
      (departmentFilter === "All" || emp.department === departmentFilter)
  );

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const saveEmployee = () => {
    if (!form.id || !form.name || !form.department || !form.rate) return alert("Fill all fields");

    set(ref(database, "employees/" + form.id), {
      name: form.name,
      department: form.department,
      rate: parseFloat(form.rate),
    });

    setForm({ id: "", name: "", department: "", rate: "" });
    setEditing(false);
  };

  const editEmployee = (id) => {
    const emp = employees[id];
    setForm({ id, ...emp });
    setEditing(true);
  };

  const deleteEmployee = (id) => {
    if (window.confirm("Delete employee?")) remove(ref(database, "employees/" + id));
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredPayroll);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    XLSX.writeFile(wb, "Enterprise_Payroll.xlsx");
  };

  const downloadPDF = (emp) => {
    const doc = new jsPDF({ unit: "pt", format: "A4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Enterprise Payroll Payslip", pageWidth / 2, 40, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Company: Biometric Attendance Automated Salary", 40, 70);

    const cutoff = getCutoffRange();
    doc.text(`Cutoff: ${cutoff.start.toLocaleDateString()} - ${cutoff.end.toLocaleDateString()}`, 40, 85);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 40, 100);

    doc.setDrawColor(0);
    doc.setFillColor(240);
    doc.rect(40, 120, pageWidth - 80, 60, "F");

    doc.text(`Name: ${emp.name}`, 50, 140);
    doc.text(`Department: ${emp.department}`, 50, 155);

    const attendanceHeaders = ["Days Worked", "Absent", "Late Minutes", "Overtime"];
    const attendanceData = [[emp.daysWorked, emp.absences, emp.lateMinutes, emp.overtime]];

    autoTable(doc, {
      startY: 210,
      head: [attendanceHeaders],
      body: attendanceData,
      theme: "grid",
      headStyles: { fillColor: [52, 58, 64] },
      styles: { halign: "center" },
    });

    const hourlyRate = emp.rate / 8;
    const base = Number(emp.totalHours) * hourlyRate;
    const otPay = parseFloat(emp.overtime) * hourlyRate * 1.25;
    const lateDeduct = emp.lateMinutes * (hourlyRate / 60);
    const absenceDeduct = emp.absences * emp.rate;

    const salaryHeaders = ["Description", "Amount (₱)"];
    const salaryData = [
      ["Base Pay", base.toFixed(2)],
      ["Overtime Pay", otPay.toFixed(2)],
      ["Late Deduction", lateDeduct.toFixed(2)],
      ["Absence Deduction", absenceDeduct.toFixed(2)],
      ["Net Salary", emp.net.toFixed(2)],
    ];

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 40,
      head: [salaryHeaders],
      body: salaryData,
      theme: "grid",
      headStyles: { fillColor: [52, 58, 64] },
      styles: { halign: "right" },
      columnStyles: { 0: { halign: "left" }, 1: { halign: "right" } },
    });

    doc.text("____________________", 70, doc.lastAutoTable.finalY + 80);
    doc.text("Authorized Signature", 70, doc.lastAutoTable.finalY + 95);

    doc.save(`${emp.name}_Payslip.pdf`);
  };

  return (
    <>
      <div className="card">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              marginRight: 10,
              padding: 8,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              outline: "none",
              width: 220,
            }}
          />

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              outline: "none",
            }}
          >
            {departments.map((dep) => (
              <option key={dep} value={dep} style={{ color: "black" }}>
                {dep}
              </option>
            ))}
          </select>

          <div style={{ flex: 1 }} />

          <button onClick={exportExcel}>Export Excel</button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{editing ? "Edit Employee" : "Add Employee"}</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <input
            name="id"
            placeholder="Employee ID"
            value={form.id}
            onChange={handleChange}
            disabled={editing}
            style={inputStyle}
          />
          <input name="name" placeholder="Name" value={form.name} onChange={handleChange} style={inputStyle} />
          <input
            name="department"
            placeholder="Department"
            value={form.department}
            onChange={handleChange}
            style={inputStyle}
          />
          <input
            name="rate"
            placeholder="Daily Rate"
            value={form.rate}
            onChange={handleChange}
            type="number"
            style={inputStyle}
          />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <button onClick={saveEmployee}>{editing ? "Update" : "Add"}</button>
          {editing && (
            <button
              onClick={() => {
                setEditing(false);
                setForm({ id: "", name: "", department: "", rate: "" });
              }}
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Payroll</h2>

        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Days Worked</th>
                <th>Total Hours</th>
                <th>Overtime</th>
                <th>Late (min)</th>
                <th>Absences</th>
                <th>Net</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredPayroll.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.name}</td>
                  <td>{emp.department}</td>
                  <td>{emp.daysWorked}</td>
                  <td>{emp.totalHours}</td>
                  <td>{emp.overtime}</td>
                  <td>{emp.lateMinutes}</td>
                  <td style={{ color: emp.statusColor, fontWeight: 700 }}>{emp.absences}</td>
                  <td>₱{emp.net.toFixed(2)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => downloadPDF(emp)}
                      style={{ marginRight: 6, padding: "4px 8px", borderRadius: 6 }}
                    >
                      Payslip
                    </button>
                    <button
                      onClick={() => editEmployee(emp.id)}
                      style={{ marginRight: 6, padding: "4px 8px", borderRadius: 6 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteEmployee(emp.id)}
                      style={{ padding: "4px 8px", borderRadius: 6, background: "#dc2626" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredPayroll.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", opacity: 0.85, padding: 18 }}>
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
};