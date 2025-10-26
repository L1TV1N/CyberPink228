// js/api.js

const API_BASE = "http://127.0.0.1:8000"; // базовый URL для backend
const TIMEOUT = 10000; // тайм-аут запросов в мс

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaultHeaders = {
    "Content-Type": "application/json",
  };
  const config = {
    headers: { ...defaultHeaders, ...(options.headers || {}) },
    method: options.method || "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include", // для куки и сессий
  };

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT);
    const response = await fetch(url, { ...config, signal: controller.signal });
    clearTimeout(id);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API ERROR] ${response.status} ${endpoint}: ${errorText}`);
      throw new Error(errorText || "Сетевая ошибка");
    }

    // Пытаемся разобрать JSON, если есть тело
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch (err) {
    if (err.name === "AbortError") {
      console.error(`[API TIMEOUT] ${endpoint} exceeded ${TIMEOUT}ms`);
      throw new Error("Превышено время ожидания запроса");
    }
    throw err;
  }
}

// --- Авторизация ---
export const login = async (email, password) => {
  return request("/auth/login", { method: "POST", body: { email, password } });
};

export const register = async (name, email, password) => {
  return request("/auth/register", { method: "POST", body: { name, email, password } });
};

export const logout = async () => {
  return request("/auth/logout", { method: "POST" });
};

export const getProfile = async () => {
  return request("/auth/me");
};

// --- Маршруты и поездки ---
export const uploadCSV = async (formData) => {
  return fetch(`${API_BASE}/routes/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
  }).then(async (res) => {
    if (!res.ok) throw new Error("Ошибка загрузки CSV");
    return res.json();
  });
};

export const buildRoute = async (data) => {
  return request("/routes/build", { method: "POST", body: data });
};

export const saveTrip = async (data) => {
  return request("/routes/save", { method: "POST", body: data });
};

export const getHistory = async () => {
  return request("/routes/history");
};

// --- Push Notifications ---
export const subscribePush = async (subscription) => {
  return request("/push/subscribe", { method: "POST", body: subscription });
};

export const unsubscribePush = async () => {
  return request("/push/unsubscribe", { method: "POST" });
};

// --- Универсальные утилиты ---
export const fetchWithRetry = async (endpoint, options = {}, retries = 2) => {
  try {
    return await request(endpoint, options);
  } catch (err) {
    if (retries > 0) {
      console.warn(`[API RETRY] ${endpoint}, retries left: ${retries}`);
      return fetchWithRetry(endpoint, options, retries - 1);
    }
    throw err;
  }
};
