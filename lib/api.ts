const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      window.location.href = "/login";
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export function setAuth(token: string, user: unknown) {
  localStorage.setItem("adminToken", token);
  localStorage.setItem("adminUser", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const u = localStorage.getItem("adminUser");
  return u ? JSON.parse(u) : null;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
