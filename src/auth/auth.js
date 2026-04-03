const KEY = "bas_admin_session";

const DEFAULT_ADMIN = {
  username: "admin",
  password: "admin123",
};

export function loginAdmin(username, password) {
  if (username === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password) {
    localStorage.setItem(KEY, JSON.stringify({ username, ts: Date.now() }));
    return true;
  }
  return false;
}

export function logoutAdmin() {
  localStorage.removeItem(KEY);
}

export function isAdminAuthed() {
  try {
    return Boolean(JSON.parse(localStorage.getItem(KEY) || "null"));
  } catch {
    return false;
  }
}

export function getAdminSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}