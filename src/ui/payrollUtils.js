export function getCutoffRange() {
  const today = new Date();
  const start =
    today.getDate() <= 15
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : new Date(today.getFullYear(), today.getMonth(), 16);

  const end =
    today.getDate() <= 15
      ? new Date(today.getFullYear(), today.getMonth(), 15)
      : new Date(today.getFullYear(), today.getMonth() + 1, 0);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function countWeekdays(start, end) {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Computes payroll summary for a single employee for the current cutoff.
 * @param {object} emp {name, department, rate}
 * @param {string} empId
 * @param {Array} attendanceRecords array of records from DB root (excluding employees node)
 */
export function computeEmployeePayroll(emp, empId, attendanceRecords) {
  const { start, end } = getCutoffRange();
  const totalWorkDays = countWeekdays(start, end);

  let daysWorked = 0;
  let overtime = 0;
  let lateMinutes = 0;
  let totalHours = 0;

  const records = [];

  attendanceRecords.forEach((record) => {
    if (!record || record.employeeId !== empId) return;

    const date = new Date(record.date);
    const day = date.getDay();

    if (date >= start && date <= end && day !== 0 && day !== 6) {
      records.push(record);

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
  const dailyRate = Number(emp?.rate || 0);
  const hourlyRate = dailyRate / 8;

  const base = totalHours * hourlyRate;
  const otPay = overtime * hourlyRate * 1.25;
  const lateDeduct = lateMinutes * (hourlyRate / 60);
  const absenceDeduct = absences * dailyRate;
  const net = base + otPay - lateDeduct - absenceDeduct;

  return {
    cutoff: { start, end },
    records,
    summary: {
      daysWorked,
      totalHours: Number(totalHours).toFixed(2),
      overtime: Number(overtime).toFixed(2),
      lateMinutes,
      absences,
      dailyRate,
      hourlyRate,
      base,
      otPay,
      lateDeduct,
      absenceDeduct,
      net,
    },
  };
}