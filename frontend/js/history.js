// js/history.js
import { setCurrentTrip, buildRouteOnMap, removeLocation } from './trips.js';
import { showToast } from './auth.js';

const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const btnHistory = document.getElementById('btn-history');

let historyData = [];

// Получение истории с сервера
export async function fetchHistory() {
    try {
        const response = await fetch('/routes/history');
        if (!response.ok) throw new Error('Ошибка при загрузке истории');
        historyData = await response.json();
        renderHistory();
    } catch (err) {
        console.error(err);
        showToast('Не удалось загрузить историю', 'error');
    }
}

// Рендер истории поездок
function renderHistory() {
    historyList.innerHTML = '';
    if (!historyData.length) {
        historyList.innerHTML = '<p>История пуста</p>';
        return;
    }

    historyData.forEach((trip, index) => {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.innerHTML = `
            <div>
                <h3>${trip.name}</h3>
                <p>Дата: ${new Date(trip.date).toLocaleString()}</p>
                <p>Точек: ${trip.trip.length}</p>
            </div>
            <div class="history-actions">
                <button class="btn btn-small view-btn" data-index="${index}">Посмотреть</button>
                <button class="btn btn-small edit-btn" data-index="${index}">Редактировать</button>
                <button class="btn btn-small delete-btn" data-index="${index}">Удалить</button>
            </div>
        `;
        historyList.appendChild(card);
    });

    // Назначение обработчиков кнопок
    document.querySelectorAll('.view-btn').forEach(btn =>
        btn.addEventListener('click', e => viewTrip(e.target.dataset.index))
    );
    document.querySelectorAll('.edit-btn').forEach(btn =>
        btn.addEventListener('click', e => editTrip(e.target.dataset.index))
    );
    document.querySelectorAll('.delete-btn').forEach(btn =>
        btn.addEventListener('click', e => deleteTrip(e.target.dataset.index))
    );
}

// Просмотр маршрута
function viewTrip(index) {
    const trip = historyData[index];
    setCurrentTrip(trip.trip);
    buildRouteOnMap({ points: trip.trip });
    showToast(`Маршрут "${trip.name}" загружен`, 'info');
}

// Редактирование поездки
function editTrip(index) {
    const trip = historyData[index];
    const newName = prompt('Редактировать название поездки', trip.name);
    if (newName) {
        trip.name = newName;
        fetch(`/trips/update/${trip.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trip)
        }).then(res => {
            if (res.ok) {
                showToast('Поездка обновлена', 'success');
                renderHistory();
            } else showToast('Ошибка при обновлении', 'error');
        });
    }
}

// Удаление поездки
function deleteTrip(index) {
    const trip = historyData[index];
    if (!confirm(`Удалить поездку "${trip.name}"?`)) return;

    fetch(`/trips/delete/${trip.id}`, { method: 'DELETE' }).then(res => {
        if (res.ok) {
            historyData.splice(index, 1);
            renderHistory();
            showToast('Поездка удалена', 'warning');
        } else showToast('Ошибка при удалении', 'error');
    });
}

// Показ/скрытие панели истории
btnHistory.addEventListener('click', () => {
    historyPanel.classList.toggle('hidden');
    if (!historyPanel.classList.contains('hidden')) fetchHistory();
});
