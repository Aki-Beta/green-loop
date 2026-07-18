// ============================================================
// Green-Loop - API Client (Simplificado) - Usa proxy nginx
// ============================================================

const API = '/api';  // Proxy nginx: /api/ -> backend:8000/

async function apiRequest(endpoint, options = {}) {
    const token = options.token || localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    const res = await fetch(`${API}${endpoint}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
        throw new Error(data.detail || data.message || `Error ${res.status}`);
    }
    return data;
}

const api = {
    auth: {
        login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
        me: (token) => apiRequest('/auth/me', { token })
    },
    dashboard: {
        stats: (token) => apiRequest('/dashboard/stats', { token })
    },
    catalogos: {
        zonas: (token) => apiRequest('/catalogos/zonas', { token }),
        residuos: (token) => apiRequest('/catalogos/residuos', { token }),
        rutas: (token) => apiRequest('/catalogos/rutas', { token }),
        empresas: (token) => apiRequest('/catalogos/empresas', { token }),
        camiones: (token) => apiRequest('/catalogos/camiones', { token })
    },
    cargas: {
        listar: (token, params = '') => apiRequest(`/cargas?${params}`, { token }),
        crear: (data, token) => apiRequest('/cargas', { method: 'POST', body: JSON.stringify(data), token }),
        simularQR: (qr, token) => apiRequest('/cargas/simular-qr', { method: 'POST', body: JSON.stringify({ qr_code: qr }), token }),
        obtener: (id, token) => apiRequest(`/cargas/${id}`, { token }),
        obtenerIncentivo: (id, token) => apiRequest(`/cargas/${id}/incentivo`, { token }),
        exportarCSV: (token) => apiRequest('/cargas/exportar/csv', { token })
    },
    certificados: {
        listar: (token) => apiRequest('/certificados', { token }),
        crear: (data, token) => apiRequest('/certificados', { method: 'POST', body: JSON.stringify(data), token }),
        verificar: (hash) => apiRequest(`/certificados/verificar/${hash}`)
    },
    pagos: {
        listar: (token) => apiRequest('/pagos', { token }),
        pagar: (id, ref, token) => apiRequest(`/pagos/${id}/pagar?referencia=${encodeURIComponent(ref)}`, { method: 'POST', token })
    },
    usuarios: {
        listar: (token, params = '') => apiRequest(`/usuarios?${params}`, { token }),
        crear: (data, token) => apiRequest('/usuarios', { method: 'POST', body: JSON.stringify(data), token }),
        actualizar: (id, data, token) => apiRequest(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
        toggle: (id, activo, token) => apiRequest(`/usuarios/${id}/toggle?activo=${activo}`, { method: 'POST', token }),
        eliminar: (id, token) => apiRequest(`/usuarios/${id}`, { method: 'DELETE', token }),
        obtener: (id, token) => apiRequest(`/usuarios/${id}`, { token })
    },
    reportes: {
        mensual: (params, token) => apiRequest(`/reportes/mensual-zona?${new URLSearchParams(params).toString()}`, { token }),
        autoridad: (params, token) => apiRequest(`/reportes/formato-autoridad?${new URLSearchParams(params).toString()}`, { token })
    }
};