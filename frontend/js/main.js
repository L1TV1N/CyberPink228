// js/main.js

import { initMap, addMarkers, clearMarkers } from "./map.js";
import { loadTrips, buildRoute } from "./trips.js";
import { loadHistory } from "./history.js";
import { subscribePushNotifications } from "./push.js";
import { loadProfile, showToast } from "./auth.js";

// --- Элементы DOM ---
const uploadBtn = document.getElementById("uploadBtn");
const importBtn = document.getElementById("importBtn");
const buildBtn = document.getElementById("buildBtn");
const saveTripBtn = document.getElementById("saveTripBtn");
const filterVipCheckbox = document.getElementById("filterVip");
const routeModeSelect = document.getElementById("routeMode");
const vehicleSelect = document.getElementById("vehicle");
const fileInput = document.getElementById("file");
const historyPanel = document.getElementById("historyPanel");
const btnHistory = document.getElementById("btn-history");

// --- Переменные ---
let mapInstance;
let markers = [];

// --- Инициализация приложения ---
async function initApp() {
  try {
    await loadProfile(); // загрузка данных пользователя
    mapInstance = initMap("map"); // инициализация карты
    await loadTrips(mapInstance, markers); // загрузка поездок
    await loadHistory(); // загрузка истории поездок
    await subscribePushNotifications(); // push уведомления
    attachEventListeners();
  } catch (err) {
    console.error("Ошибка инициализации приложения:", err);
    showToast("Ошибка инициализации приложения", true);
  }
}

// --- Привязка событий ---
function attachEventListeners() {
  if (uploadBtn) {
    uploadBtn.addEventListener("click", async () => {
      if (fileInput.files.length === 0) return showToast("Выберите CSV файл", true);
      await loadTrips(mapInstance, markers, fileInput.files[0]);
    });
  }

  if (importBtn) {
    importBtn.addEventListener("click", async () => {
      if (fileInput.files.length === 0) return showToast("Выберите CSV файл", true);
      await loadTrips(mapInstance, markers, fileInput.files[0], true);
    });
  }

  if (buildBtn) {
    buildBtn.addEventListener("click", async () => {
      const mode = routeModeSelect.value;
      const vehicle = vehicleSelect.value;
      await buildRoute(mapInstance, markers, mode, vehicle);
    });
  }

  if (saveTripBtn) {
    saveTripBtn.addEventListener("click", async () => {
      try {
        await saveTrip(markers);
        showToast("Поездка сохранена");
        await loadHistory();
      } catch (err) {
        showToast("Ошибка сохранения поездки: " + err.message, true);
      }
    });
  }

  if (filterVipCheckbox) {
    filterVipCheckbox.addEventListener("change", async () => {
      clearMarkers(mapInstance, markers);
      await loadTrips(mapInstance, markers);
    });
  }

  if (btnHistory) {
    btnHistory.addEventListener("click", () => {
      historyPanel.classList.toggle("hidden");
    });
  }
}

// --- Сохраняем поездку ---
async function saveTrip(markersData) {
  const tripData = markersData.map(m => ({
    lat: m.getLatLng().lat,
    lng: m.getLatLng().lng,
    title: m.options.title || ""
  }));
  const response = await fetch("/routes/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trip: tripData })
  });
  if (!response.ok) throw new Error("Не удалось сохранить поездку");
}

// --- Старт приложения ---
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});
