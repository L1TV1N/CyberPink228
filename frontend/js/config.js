// js/config.js

// --- Конфигурация приложения ---
const ENV = {
  DEV: "development",
  PROD: "production",
};

// Текущая среда (можно менять для деплоя)
const CURRENT_ENV = ENV.DEV;

// Базовые URL для API
const API_BASE_URLS = {
  development: "http://127.0.0.1:8000",
  production: "https://planner.yourdomain.com",
};

// Таймауты
const TIMEOUTS = {
  fetch: 10000, // ms
  toast: 3000,  // ms
};

// Настройки карты Leaflet
const MAP_SETTINGS = {
  center: [47.2357, 39.7015], // Ростов-на-Дону
  zoom: 12,
  tileLayer: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};

// Стили маркеров
const MARKER_STYLES = {
  default: {
    color: "blue",
    radius: 6,
  },
  vip: {
    color: "gold",
    radius: 8,
  },
  currentRoute: {
    color: "green",
    radius: 6,
  },
};

// Настройки уведомлений
const NOTIFICATION_SETTINGS = {
  enablePush: true,
  icon: "/favicon.ico",
  badge: "/favicon.ico",
};

// --- Экспорт настроек ---
export {
  CURRENT_ENV,
  ENV,
  API_BASE_URLS,
  TIMEOUTS,
  MAP_SETTINGS,
  MARKER_STYLES,
  NOTIFICATION_SETTINGS,
};
