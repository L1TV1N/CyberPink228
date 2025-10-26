import { API_BASE } from "./config.js";

// История маршрутов
async function getHistory() {
    try {
        const response = await fetch(`${API_BASE}/routes/history`);
        if (!response.ok) throw new Error("Ошибка при получении истории");
        const data = await response.json();
        renderHistory(data);
    } catch (err) {
        console.error(err);
        alert("Не удалось загрузить историю");
    }
}

// Логин
async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem("token", data.access_token);
            window.location.href = "index.html";
        } else {
            alert(data.detail || "Ошибка при логине");
        }
    } catch (err) {
        console.error(err);
        alert("Ошибка сети при логине");
    }
}

// Регистрация
async function register(email, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            alert("Регистрация успешна!");
            window.location.href = "login.html";
        } else {
            alert(data.detail || "Ошибка при регистрации");
        }
    } catch (err) {
        console.error(err);
        alert("Ошибка сети при регистрации");
    }
}

// Загрузка маршрута
async function uploadRoute(routeData) {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/upload`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(routeData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Ошибка при загрузке маршрута");
        alert("Маршрут успешно загружен!");
    } catch (err) {
        console.error(err);
        alert("Не удалось загрузить маршрут");
    }
}

// Пример обработки кнопки
document.querySelector("#btnGetHistory")?.addEventListener("click", () => {
    getHistory();
});
