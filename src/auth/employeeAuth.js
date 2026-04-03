const KEY = "bas_employee_session";

export function setEmployeeSession(employeeId) {
  localStorage.setItem(KEY, JSON.stringify({ employeeId: String(employeeId), ts: Date.now() }));
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