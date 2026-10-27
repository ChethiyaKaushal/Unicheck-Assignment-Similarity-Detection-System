const API_URL = import.meta.env.VITE_API_URL || "/api";

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem("unicheckToken");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

export function currentUser() {
  try { return JSON.parse(localStorage.getItem("unicheckUser") || "null"); }
  catch { return null; }
}

export function logout() {
  localStorage.removeItem("unicheckToken");
  localStorage.removeItem("unicheckUser");
  window.location.assign("/login");
}
