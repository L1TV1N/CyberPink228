// trips.js — управление маршрутами, сохранение поездок, работа с CSV

import { showToast } from './auth.js';
import { getToken } from './auth.js';
import { buildMapRoute, drawMarkers, clearRoute } from './map.js';

const API_BASE = 'http://127.0.0.1:8000';

export let currentTrip = {
    name: '',
    points: [],
    mode: 'baseline',
    vehicle: 'car',
};

// --- Загрузка CSV ---
export async function uploadCSV(file) {
    if (!file) {
        showToast('Файл не выбран', 'error');
        return;
    }

    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`${API_BASE}/routes/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        if (res.ok) {
            currentTrip.points = data.points || [];
            showToast('CSV загружен успешно', 'success');
            drawMarkers(currentTrip.points);
        } else {
            showToast(data.detail || 'Ошибка загрузки CSV', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Сервер недоступен', 'error');
    }
}

// --- Создание поездки из CSV ---
export async function createTripFromCSV(name) {
    if (!currentTrip.points.length) {
        showToast('Нет точек для создания поездки', 'error');
        return;
    }

    currentTrip.name = name || `Поездка ${new Date().toLocaleDateString()}`;
    await saveTrip();
}

// --- Сохранение поездки ---
export async function saveTrip() {
    const token = getToken();
    if (!token) {
        showToast('Не авторизован', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/routes/save`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentTrip)
        });

        const data = await res.json();
        if (res.ok) {
            showToast('Поездка сохранена', 'success');
        } else {
            showToast(data.detail || 'Ошибка сохранения', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Сервер недоступен', 'error');
    }
}

// --- Построение маршрута на карте ---
export function buildTripRoute(mode, vehicle) {
    if (!currentTrip.points.length) {
        showToast('Нет точек маршрута', 'error');
        return;
    }

    currentTrip.mode = mode || 'baseline';
    currentTrip.vehicle = vehicle || 'car';

    buildMapRoute(currentTrip.points, currentTrip.mode, currentTrip.vehicle);
    showToast('Маршрут построен', 'success');
}

// --- Очистка текущей поездки ---
export function clearTrip() {
    currentTrip = { name: '', points: [], mode: 'baseline', vehicle: 'car' };
    clearRoute();
    showToast('Текущая поездка очищена', 'info');
}
