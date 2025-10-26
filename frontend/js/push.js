// js/push.js

let toastQueue = [];
let toastTimeout = null;

// Основная функция для отображения тоста
export function showToast(message, type = 'info', duration = 3000, callback = null) {
    let toastContainer = document.getElementById('toast-container');

    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);

        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = `
            #toast-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                z-index: 9999;
                pointer-events: none;
            }
            .toast {
                min-width: 200px;
                max-width: 320px;
                padding: 12px 18px;
                border-radius: 8px;
                color: #fff;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.3s ease, transform 0.3s ease;
                pointer-events: auto;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .toast.show { opacity: 1; transform: translateY(0); }
            .toast.info { background: #2196F3; }
            .toast.success { background: #4CAF50; }
            .toast.warning { background: #FFC107; color: #000; }
            .toast.error { background: #F44336; }

            .toast button.close-btn {
                background: transparent;
                border: none;
                color: inherit;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                margin-left: 10px;
            }
        `;
        document.head.appendChild(style);
    }

    // Создаем элемент тоста
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    // Кнопка закрытия
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => removeToast(toast, callback);
    toast.appendChild(closeBtn);

    toastContainer.appendChild(toast);
    toastQueue.push(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    // Автоудаление
    toastTimeout = setTimeout(() => removeToast(toast, callback), duration);
}

// Удаление тоста с анимацией
function removeToast(toast, callback) {
    toast.classList.remove('show');
    setTimeout(() => {
        toast.remove();
        toastQueue = toastQueue.filter(t => t !== toast);
        if (callback) callback();
    }, 300);
}

// Очистка всех тостов
export function clearToasts() {
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) {
        toastQueue.forEach(toast => toast.remove());
        toastQueue = [];
        clearTimeout(toastTimeout);
    }
}

// Уведомления для личного кабинета
export function notifyLogin(username) {
    showToast(`Добро пожаловать, ${username}!`, 'success');
}

export function notifyLogout() {
    showToast(`Вы вышли из личного кабинета`, 'info');
}

export function notifyTripSaved(tripName = '') {
    showToast(tripName ? `Поездка "${tripName}" успешно сохранена!` : 'Поездка успешно сохранена!', 'success');
}

export function notifyCSVUploadSuccess() {
    showToast('CSV успешно загружен', 'success');
}

export function notifyCSVUploadError(errMsg = '') {
    showToast(`Ошибка загрузки CSV${errMsg ? `: ${errMsg}` : ''}`, 'error');
}

export function notifyError(message = 'Произошла ошибка') {
    showToast(message, 'error');
}

export function notifyWarning(message = 'Внимание!') {
    showToast(message, 'warning');
}

export function notifyInfo(message = 'Информация') {
    showToast(message, 'info');
}
