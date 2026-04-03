const KEY = "bas_employee_session";

export function loginEmployee(employeeId) {
  const id = String(employeeId || "").trim();
  if (!id) return false;
  localStorage.setItem(KEY, JSON.stringify({ employeeId: id, ts: Date.now() }));
  return true;
}

export function logoutEmployee() {
  localStorage.removeItem(KEY);
}

export function getEmployeeSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export function isEmployeeAuthed() {
  return Boolean(getEmployeeSession()?.employeeId);
}