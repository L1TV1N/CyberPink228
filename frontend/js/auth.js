// js/auth.js
import { showToast, notifyLogin, notifyLogout } from './push.js';

const API_URL = 'http://127.0.0.1:8000'; // базовый URL API

// Элементы страницы
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const logoutBtn = document.getElementById('btn-logout');

// Хранение токена в localStorage
export function setToken(token) {
    localStorage.setItem('authToken', token);
}

export function getToken() {
    return localStorage.getItem('authToken');
}

export function clearToken() {
    localStorage.removeItem('authToken');
}

// Проверка авторизации
export function isLoggedIn() {
    return !!getToken();
}

// Функция для отправки запросов с токеном
export async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = options.headers || {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Ошибка запроса');
        }
        return await res.json();
    } catch (err) {
        showToast(err.message, 'error');
        throw err;
    }
}

// Login
export async function login(email, password) {
    try {
        const data = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        }).then(res => res.json());

        if (data.access_token) {
            setToken(data.access_token);
            notifyLogin(data.username || email);
            return true;
        } else {
            showToast(data.detail || 'Ошибка авторизации', 'error');
            return false;
        }
    } catch (err) {
        console.error(err);
        showToast('Ошибка при авторизации', 'error');
        return false;
    }
}

// Register
export async function register(username, email, password) {
    try {
        const data = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        }).then(res => res.json());

        if (data.success) {
            showToast('Регистрация успешна! Войдите в систему', 'success');
            return true;
        } else {
            showToast(data.detail || 'Ошибка регистрации', 'error');
            return false;
        }
    } catch (err) {
        console.error(err);
        showToast('Ошибка при регистрации', 'error');
        return false;
    }
}

// Logout
export function logout() {
    clearToken();
    notifyLogout();
    // Перезагрузка или редирект на страницу логина
    window.location.href = '/login.html';
}

// Авто-подключение кнопки выхода
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
}

// Обработка формы логина
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('input[name="email"]').value;
        const password = loginForm.querySelector('input[name="password"]').value;

        const success = await login(email, password);
        if (success) window.location.href = '/index.html';
    });
}

// Обработка формы регистрации
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = registerForm.querySelector('input[name="username"]').value;
        const email = registerForm.querySelector('input[name="email"]').value;
        const password = registerForm.querySelector('input[name="password"]').value;

        const success = await register(username, email, password);
        if (success) window.location.href = '/login.html';
    });
}

// Авто-редирект если пользователь не авторизован
export function protectRoute() {
    if (!isLoggedIn()) {
        window.location.href = '/login.html';
    }
}
