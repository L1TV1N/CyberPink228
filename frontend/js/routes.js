// js/routes.js

import { showToast } from "./auth.js";
import { clearMarkers, addMarkers } from "./map.js";

// --- Получение всех маршрутов ---
export async function fetchRoutes(filterVip = true) {
  try {
    const url = filterVip ? "/routes?vip=true" : "/routes";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Не удалось загрузить маршруты");
    const data = await res.json();
    return data.routes || [];
  } catch (err) {
    console.error("Ошибка fetchRoutes:", err);
    showToast("Ошибка загрузки маршрутов", true);
    return [];
  }
}

// --- Сохранение маршрута ---
export async function saveRoute(routeData) {
  try {
    const res = await fetch("/routes/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route: routeData }),
    });
    if (!res.ok) throw new Error("Не удалось сохранить маршрут");
    showToast("Маршрут успешно сохранен");
    return true;
  } catch (err) {
    console.error("Ошибка saveRoute:", err);
    showToast("Ошибка сохранения маршрута", true);
    return false;
  }
}

// --- Построение маршрута на карте ---
export async function buildRoute(mapInstance, markers, mode = "baseline", vehicle = "car") {
  try {
    if (markers.length === 0) return showToast("Нет точек для построения маршрута", true);

    // Подготовка координат
    const points = markers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);

    // Отправка на сервер для расчета маршрута
    const res = await fetch(`/routes/build?mode=${mode}&vehicle=${vehicle}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points }),
    });
    if (!res.ok) throw new Error("Не удалось построить маршрут");

    const routeData = await res.json();

    // Очистка старых маркеров и отрисовка нового маршрута
    clearMarkers(mapInstance, markers);
    addMarkers(mapInstance, routeData.points, markers);

    showToast("Маршрут построен успешно");
    return routeData;
  } catch (err) {
    console.error("Ошибка buildRoute:", err);
    showToast("Ошибка построения маршрута", true);
  }
}

// --- Получение истории маршрутов ---
export async function fetchHistory() {
  try {
    const res = await fetch("/routes/history");
    if (!res.ok) throw new Error("Не удалось загрузить историю маршрутов");
    const data = await res.json();
    return data.history || [];
  } catch (err) {
    console.error("Ошибка fetchHistory:", err);
    showToast("Ошибка загрузки истории", true);
    return [];
  }
}
