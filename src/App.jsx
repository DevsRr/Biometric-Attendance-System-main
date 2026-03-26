import { useEffect, useState, useMemo } from "react";
import { database } from "./firebase";
import { ref, onValue, set, remove } from "firebase/database";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function App() {
  const [employees, setEmployees] = useState({});
  const [attendance, setAttendance] = useState([]);
  const [payroll, setPayroll] = useState([]);

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  const [form, setForm] = useState({ id: "", name: "", department: "", rate: "" });
  const [editing, setEditing] = useState(false);

  // FETCH DATA
  useEffect(() => {
    onValue(ref(database, "employees"), snap => setEmployees(snap.val() || {}));
    onValue(ref(database, "/"), snap => {
      const data = snap.val() || {};
      delete data.employees;
      const filtered = Object.values(data).filter(
        rec => rec.employeeId && rec.timeIn && rec.timeOut && rec.date
      );
      setAttendance(filtered);
    });
  }, []);

  // COMPUTE PAYROLL
  useEffect(() => computePayroll(), [employees, attendance]);

  const getCutoffRange = () => {
    const today = new Date();
    const start = today.getDate() <= 15
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : new Date(today.getFullYear(), today.getMonth(), 16);
    const end = today.getDate() <= 15
      ? new Date(today.getFullYear(), today.getMonth(), 15)
      : new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start, end };
  };

  const countWeekdays = (start, end) => {
    let count = 0;
    const current = new Date(start);
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

    const results = Object.keys(employees).map(empId => {
      const emp = employees[empId];

      let daysWorked = 0, overtime = 0, lateMinutes = 0, totalHours = 0;

      attendance.forEach(record => {
        if (record.employeeId !== empId) return;
        const date = new Date(record.date);
        const day = date.getDay();
        if (date >= start && date <= end && day !== 0 && day !== 6) {
          daysWorked++;
          const workHours = parseFloat(record.workHours || 0);
          totalHours += workHours;

          const [inH, inM] = record.timeIn.split(":").map(Number);
          const late = (inH * 60 + inM) - 480; // after 8:00 AM
          if (late > 0) lateMinutes += late;
          if (workHours > 8) overtime += workHours - 8;
        }
      });

      const absences = totalWorkDays - daysWorked;
      const hourlyRate = emp.rate / 8;
      const base = totalHours * hourlyRate;
      const otPay = overtime * hourlyRate * 1.25;
      const lateDeduct = lateMinutes * (hourlyRate / 60);
      const absenceDeduct = absences * emp.rate;
      const net = base + otPay - lateDeduct - absenceDeduct;

      let status = "", statusColor = "";
      if (absences === 0) { status = "Perfect Attendance"; statusColor = "green"; }
      else if (absences < 5) { status = "Warning"; statusColor = "orange"; }
      else { status = "RED FLAG"; statusColor = "red"; }

      return {
        id: empId, name: emp.name, department: emp.department,
        daysWorked, totalHours: totalHours.toFixed(2),
        overtime: overtime.toFixed(2), lateMinutes,
        absences, status, statusColor, net, rate: emp.rate
      };
    });

    setPayroll(results);
  };

  // DEPARTMENT FILTER
  const departments = useMemo(() => ["All", ...new Set(Object.values(employees).map(e => e.department))], [employees]);
  const filteredPayroll = payroll.filter(emp =>
    emp.name.toLowerCase().includes(search.toLowerCase()) &&
    (departmentFilter === "All" || emp.department === departmentFilter)
  );

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const saveEmployee = () => {
    if (!form.id || !form.name || !form.department || !form.rate) return alert("Fill all fields");
    set(ref(database, "employees/" + form.id), {
      name: form.name, department: form.department, rate: parseFloat(form.rate)
    });
    setForm({ id: "", name: "", department: "", rate: "" });
    setEditing(false);
  };

  const editEmployee = id => { const emp = employees[id]; setForm({ id, ...emp }); setEditing(true); };
  const deleteEmployee = id => { if (window.confirm("Delete employee?")) remove(ref(database, "employees/" + id)); };
  const exportExcel = () => { const ws = XLSX.utils.json_to_sheet(filteredPayroll); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Payroll"); XLSX.writeFile(wb, "Enterprise_Payroll.xlsx"); };

  // PROFESSIONAL PDF
  const downloadPDF = emp => {
    const doc = new jsPDF({ unit: "pt", format: "A4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20); doc.setFont("helvetica", "bold");
    doc.text("Enterprise Payroll Payslip", pageWidth / 2, 40, { align: "center" });

    doc.setFontSize(12); doc.setFont("helvetica", "normal");
    doc.text("Company:Biometric Attendance Automated Salary", 40, 70);
    doc.text(`Cutoff: ${getCutoffRange().start.toLocaleDateString()} - ${getCutoffRange().end.toLocaleDateString()}`, 40, 85);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 40, 100);

    doc.setDrawColor(0); doc.setFillColor(240);
    doc.rect(40, 120, pageWidth - 80, 60, "F");
    doc.text(`Name: ${emp.name}`, 50, 140);
    doc.text(`Department: ${emp.department}`, 50, 155);

    const attendanceHeaders = ["Days Worked", "Absent", "Late Minutes", "Overtime"];
    const attendanceData = [[emp.daysWorked, emp.absences, emp.lateMinutes, emp.overtime]];

    autoTable(doc, {
      startY: 210, head: [attendanceHeaders], body: attendanceData,
      theme: "grid", headStyles: { fillColor: [52,58,64] }, styles: { halign: "center" }
    });

    const hourlyRate = emp.rate / 8;
    const base = emp.daysWorked * emp.rate;
    const otPay = parseFloat(emp.overtime) * hourlyRate * 1.25;
    const lateDeduct = emp.lateMinutes * (hourlyRate / 60);
    const absenceDeduct = emp.absences * emp.rate;

    const salaryHeaders = ["Description", "Amount (₱)"];
    const salaryData = [
      ["Base Pay", base.toFixed(2)],
      ["Overtime Pay", otPay.toFixed(2)],
      ["Late Deduction", lateDeduct.toFixed(2)],
      ["Absence Deduction", absenceDeduct.toFixed(2)],
      ["Net Salary", emp.net.toFixed(2)]
    ];

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 40,
      head: [salaryHeaders], body: salaryData,
      theme: "grid",
      headStyles: { fillColor: [52,58,64] },
      styles: { halign: "right" },
      columnStyles: { 0: { halign: "left" }, 1: { halign: "right" } }
    });

    doc.text("____________________", 70, doc.lastAutoTable.finalY + 80);
    doc.text("Authorized Signature", 70, doc.lastAutoTable.finalY + 95);

    doc.save(`${emp.name}_Payslip.pdf`);
  };

  return (
    <div style={{ padding: 40, fontFamily: "Arial", background: "#0f172a", minHeight: "100vh", color: "white" }}>
      <h1 style={{ marginBottom: 20 }}>Admin Dashboard</h1>

      <div style={{ marginBottom: 20 }}>
        <input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginRight: 10, padding: 8, borderRadius: 4, border: "none", width: 200 }} />
        <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} style={{ padding: 8, borderRadius: 4, border: "none" }}>
          {departments.map(dep => <option key={dep}>{dep}</option>)}
        </select>
      </div>

      <h3>{editing ? "Edit Employee" : "Add Employee"}</h3>
      <div style={{ marginBottom: 20, display: "flex", gap: 10 }}>
        <input name="id" placeholder="Biometric ID" value={form.id} onChange={handleChange} disabled={editing} style={{ flex:1, padding:8, borderRadius:4, border:"none" }} />
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} style={{ flex:2, padding:8, borderRadius:4, border:"none" }} />
        <input name="department" placeholder="Department" value={form.department} onChange={handleChange} style={{ flex:2, padding:8, borderRadius:4, border:"none" }} />
        <input name="rate" type="number" placeholder="Daily Salary" value={form.rate} onChange={handleChange} style={{ flex:1, padding:8, borderRadius:4, border:"none" }} />
        <button onClick={saveEmployee} style={{ padding:"0 16px", borderRadius:6, border:"none", backgroundColor:"#3b82f6", color:"white", cursor:"pointer" }}>{editing ? "Update" : "Add"}</button>
      </div>

      <button onClick={exportExcel} style={{ backgroundColor:"#2563eb", color:"white", border:"none", borderRadius:6, padding:"10px 20px", cursor:"pointer" }}>Export Excel</button>

      <table style={{ marginTop:20, width:"100%", borderCollapse:"collapse", background:"#1e293b", color:"white", borderRadius:8, overflow:"hidden" }}>
        <thead style={{ background:"#334155", color:"white" }}>
          <tr>
            <th style={{ padding:12, textAlign:"left" }}>Name</th>
            <th style={{ padding:12, textAlign:"left" }}>Department</th>
            <th style={{ padding:12, textAlign:"center" }}>Days</th>
            <th style={{ padding:12, textAlign:"center" }}>Hours</th>
            <th style={{ padding:12, textAlign:"center" }}>OT</th>
            <th style={{ padding:12, textAlign:"center" }}>Late</th>
            <th style={{ padding:12, textAlign:"center" }}>Absent</th>
            <th style={{ padding:12, textAlign:"center" }}>Status</th>
            <th style={{ padding:12, textAlign:"right" }}>Net</th>
            <th style={{ padding:12, textAlign:"center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredPayroll.map(emp => (
            <tr key={emp.id} style={{ borderBottom:"1px solid #475569" }}>
              <td>{emp.name}</td>
              <td>{emp.department}</td>
              <td style={{ textAlign:"center" }}>{emp.daysWorked}</td>
              <td style={{ textAlign:"center" }}>{emp.totalHours}</td>
              <td style={{ textAlign:"center" }}>{emp.overtime}</td>
              <td style={{ textAlign:"center" }}>{emp.lateMinutes}</td>
              <td style={{ textAlign:"center" }}>{emp.absences}</td>
              <td style={{ color: emp.statusColor, fontWeight:"bold", textAlign:"center" }}>{emp.status}</td>
              <td style={{ textAlign:"right" }}>₱{emp.net.toFixed(2)}</td>
              <td style={{ textAlign:"center" }}>
                <button onClick={() => downloadPDF(emp)} style={{ marginRight:6, padding:"4px 8px", borderRadius:4, border:"none", backgroundColor:"#2563eb", color:"white", cursor:"pointer" }}>Payslip</button>
                <button onClick={() => editEmployee(emp.id)} style={{ marginRight:6, padding:"4px 8px", borderRadius:4, border:"none", backgroundColor:"#2563eb", color:"white", cursor:"pointer" }}>Edit</button>
                <button onClick={() => deleteEmployee(emp.id)} style={{ padding:"4px 8px", borderRadius:4, border:"none", backgroundColor:"#dc2626", color:"white", cursor:"pointer" }}>Delete</button>
              </td>
            </tr>
          ))}
          {filteredPayroll.length === 0 && <tr><td colSpan={10} style={{ textAlign:"center", padding:20, color:"#94a3b8" }}>No employees found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
