// map.js — работа с картой, маркерами и маршрутом

import L from 'leaflet';
import 'leaflet.markercluster';
import { currentTrip } from './trips.js';
import { showToast } from './auth.js';

let map;
let markerClusterGroup;
let routeLayer;

// --- Инициализация карты ---
export function initMap() {
    map = L.map('map').setView([47.2357, 39.7015], 12); // Ростов-на-Дону

    // OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    markerClusterGroup = L.markerClusterGroup();
    map.addLayer(markerClusterGroup);

    routeLayer = L.layerGroup().addTo(map);

    showToast("Карта готова", "success");
}

// --- Рисуем маркеры ---
export function drawMarkers(points) {
    markerClusterGroup.clearLayers();

    points.forEach(p => {
        const marker = L.marker([p.lat, p.lon], {
            icon: L.icon({
                iconUrl: p.vip ? 'img/vip-marker.png' : 'img/marker.png',
                iconSize: [30, 42],
                iconAnchor: [15, 42],
            })
        }).bindPopup(`
            <strong>${p.name}</strong><br/>
            ${p.vip ? '<span style="color:gold;">VIP</span>' : 'Обычная точка'}
        `);
        markerClusterGroup.addLayer(marker);
    });

    if (points.length) {
        const group = new L.featureGroup(markerClusterGroup.getLayers());
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// --- Строим маршрут ---
export function buildMapRoute(points, vehicle = 'car', mode = 'baseline') {
    routeLayer.clearLayers();

    if (!points.length) return routeLayer;

    const latlngs = points.map(p => [p.lat, p.lon]);
    const polyline = L.polyline(latlngs, {
        color: vehicle === 'car' ? 'blue' : vehicle === 'bicycle' ? 'green' : 'orange',
        weight: 4,
        opacity: 0.7,
        smoothFactor: 1
    });

    polyline.addTo(routeLayer);

    // Добавляем маркеры по маршруту
    points.forEach((p, index) => {
        const marker = L.marker([p.lat, p.lon]).bindPopup(`<strong>${p.name}</strong><br/>Порядок: ${index + 1}`);
        routeLayer.addLayer(marker);
    });

    if (points.length) {
        const group = new L.featureGroup(routeLayer.getLayers());
        map.fitBounds(group.getBounds().pad(0.1));
    }

    return routeLayer;
}

// --- Сброс маршрута ---
export function clearRoute() {
    routeLayer.clearLayers();
    markerClusterGroup.clearLayers();
}

// --- Фильтр VIP ---
export function filterVip(showVip = true) {
    const filtered = showVip ? currentTrip : currentTrip.filter(p => !p.vip);
    drawMarkers(filtered);
    buildMapRoute(filtered);
}

// --- Экспорт карты ---
export function getMapInstance() {
    return map;
}
