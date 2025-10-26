// js/upload.js — улучшенная версия
import { buildRouteOnMap, setCurrentTrip, clearCurrentTrip } from './trips.js';
import { showToast } from './push.js';

const fileInput = document.getElementById('file');
const uploadBtn = document.getElementById('uploadBtn');
const importBtn = document.getElementById('importBtn');

let uploadedData = [];

// --- Проверка CSV на корректность ---
function validateCSV(data) {
    if (!data || data.length === 0) {
        showToast('CSV пустой или некорректный', 'error');
        return false;
    }

    const headers = Object.keys(data[0]);
    if (!headers.includes('lat') || !headers.includes('lng')) {
        showToast('CSV должен содержать колонки lat и lng', 'error');
        return false;
    }

    // Можно добавить проверку на дубли и корректность координат
    for (let i = 0; i < data.length; i++) {
        const lat = parseFloat(data[i].lat);
        const lng = parseFloat(data[i].lng);
        if (isNaN(lat) || isNaN(lng)) {
            showToast(`Некорректные координаты в строке ${i + 2}`, 'error');
            return false;
        }
    }

    return true;
}

// --- Чтение CSV ---
function parseCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const text = e.target.result;
            const lines = text.split('\n').filter(Boolean);
            const headers = lines[0].split(',').map(h => h.trim());
            const result = lines.slice(1).map((line, idx) => {
                const values = line.split(',');
                const obj = {};
                headers.forEach((header, i) => obj[header] = values[i] ? values[i].trim() : '');
                obj._row = idx + 2; // для отладки и сообщений
                return obj;
            });
            resolve(result);
        };
        reader.onerror = () => reject('Ошибка чтения файла');
        reader.readAsText(file);
    });
}

// --- Загрузка и отображение CSV ---
uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) {
        showToast('Выберите CSV файл', 'warning');
        return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Загрузка...';

    try {
        const data = await parseCSV(file);
        if (!validateCSV(data)) return;

        uploadedData = data;
        showToast(`CSV успешно загружен (${data.length} точек)`, 'success');

        clearCurrentTrip(); // очистка предыдущей поездки
        setCurrentTrip(data);
        buildRouteOnMap({ points: data });

        // Автоматическая активация фильтров или VIP точек
        document.getElementById('filterVip').checked = true;

    } catch (err) {
        console.error(err);
        showToast('Ошибка при загрузке CSV', 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Загрузить и показать';
    }
});

// --- Создание поездки из CSV на сервере ---
importBtn.addEventListener('click', async () => {
    if (!uploadedData || uploadedData.length === 0) {
        showToast('Сначала загрузите CSV', 'warning');
        return;
    }

    let tripName = prompt('Введите название поездки', `Поездка ${new Date().toLocaleDateString()}`);
    if (!tripName) tripName = `Поездка ${new Date().toLocaleDateString()}`;

    importBtn.disabled = true;
    importBtn.textContent = 'Сохранение...';

    try {
        const response = await fetch('/routes/save_trip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trip: uploadedData, name: tripName })
        });
        const res = await response.json();
        if (res.success) {
            showToast(`Поездка "${tripName}" успешно создана`, 'success');
        } else {
            showToast(res.message || 'Ошибка создания поездки', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Ошибка при отправке на сервер', 'error');
    } finally {
        importBtn.disabled = false;
        importBtn.textContent = 'Создать поездку из CSV';
    }
});

// --- Очистка текущей загрузки ---
export function resetUpload() {
    fileInput.value = '';
    uploadedData = [];
    clearCurrentTrip();
    showToast('Выбранный файл и маршрут очищены', 'info');
}

// --- Drag & Drop поддержка (для удобства UX) ---
const dropZone = document.getElementById('file-drop-zone');
if (dropZone) {
    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', async e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            await uploadBtn.click();
        }
    });
}
