// frontend/js/api.js - Cliente API centralizado (SIN import/export, script plano)

const API_BASE = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    };
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        if (!response.ok) {
            const error = new Error(data?.error || `HTTP ${response.status}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }
        return data;
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('No se puede conectar al servidor. ¿Está corriendo en puerto 5000?');
        }
        throw error;
    }
}

function authHeaders(token) {
    return { 'Authorization': `Bearer ${token}` };
}

const api = {
    auth: {
        registerCompany: (data) => request('/auth/register-company', { method: 'POST', body: data }),
        register: (data, token) => request('/auth/register', { method: 'POST', body: data, headers: authHeaders(token) }),
        login: (data) => request('/auth/login', { method: 'POST', body: data }),
        me: (token) => request('/me', { headers: authHeaders(token) }),
    },
    users: {
        list: (token) => request('/users', { headers: authHeaders(token) }),
        delete: (id, token) => request(`/users/${id}`, { method: 'DELETE', headers: authHeaders(token) }),
    },
    healthCheck: async () => {
        try {
            const response = await fetch('http://localhost:5000/api/health');
            return response.ok;
        } catch { return false; }
    }
};