const API = 'http://127.0.0.1:8000';

async function apiRequest(endpoint, options = {}) {
    const token = options.token || localStorage.getItem('token');
    const headers = { 
        'Content-Type': 'application/json', 
        ...(token && { 'Authorization': `Bearer ${token}` }), 
        ...options.headers 
    };
    
    // El backend NO usa prefijo /api (solo /api/health lo tiene), así que
    // llamamos directo al endpoint. Ej: /auth/login, /cargas, /usuarios...
    const res = await fetch(`${API}${endpoint}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
    return data;
}

const api = {
    auth: {
        login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
        me: (token) => apiRequest('/auth/me', { token }),
        register: (data) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) })
    },
    dashboard: { stats: (token) => apiRequest('/dashboard/stats', { token }) },
    catalogos: {
        zonas: (token) => apiRequest('/catalogos/zonas', { token }),
        empresas: (token) => apiRequest('/catalogos/empresas', { token }),
        rutas: (token) => apiRequest('/catalogos/rutas', { token }),
        camiones: (token) => apiRequest('/catalogos/camiones', { token }),
        crearCamion: (data, token) => apiRequest('/catalogos/camiones', { method: 'POST', body: JSON.stringify(data), token }),
        qrCamion: (id, token) => apiRequest(`/catalogos/camiones/${id}/qr`, { token })
    },
    cargas: {
        listar: (token) => apiRequest('/cargas', { token }),
        crear: (data, token) => apiRequest('/cargas', { method: 'POST', body: JSON.stringify(data), token }),
        verificarQR: (qr, token) => apiRequest('/cargas/verificar-qr', { method: 'POST', body: JSON.stringify({ qr_code: qr }), token })
    },
    certificados: {
        listar: (token) => apiRequest('/certificados', { token }),
        crear: (data, token) => apiRequest('/certificados', { method: 'POST', body: JSON.stringify(data), token }),
        verificar: (hash) => apiRequest(`/certificados/verificar/${hash}`)
    },
    usuarios: {
        listar: (token, q = '') => apiRequest(`/usuarios?${q}`, { token }),
        crear: (data, token) => apiRequest('/usuarios', { method: 'POST', body: JSON.stringify(data), token }),
        actualizar: (id, data, token) => apiRequest(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
        eliminar: (id, token) => apiRequest(`/usuarios/${id}`, { method: 'DELETE', token }),
        toggle: (id, act, token) => apiRequest(`/usuarios/${id}/toggle`, { method: 'PATCH', token })
    },
    reportes: {
        mensual: (p, token) => apiRequest(`/reportes/mensual-zona?${new URLSearchParams(p).toString()}`, { token }),
        autoridad: (p, token) => apiRequest(`/reportes/formato-autoridad?${new URLSearchParams(p).toString()}`, { token })
    },
    solicitudes: {
        listar: (token) => apiRequest('/solicitudes', { token }),
        crear: (data, token) => apiRequest('/solicitudes', { method: 'POST', body: JSON.stringify(data), token }),
        atender: (id, token) => apiRequest(`/solicitudes/${id}/atender`, { method: 'PATCH', token }),
        cancelar: (id, token) => apiRequest(`/solicitudes/${id}`, { method: 'DELETE', token })
    }
};
window.api = api;