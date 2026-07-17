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

const api = {
    cargas: {
        crear: (data) => request('/cargas', { method: 'POST', body: data }),
        obtener: (id) => request(`/cargas/${id}`),
        obtenerIncentivo: (id) => request(`/cargas/${id}/incentivo`)
    },
    certificados: {
        descargarPDF: (cargaId) => window.open(`${API_BASE}/certificados/${cargaId}/pdf`, '_blank'),
        verificar: (hash) => request(`/certificados/verificar/${hash}`)
    },
    reportes: {
        obtener: (params = {}) => {
            const query = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') query.append(k, v);
            });
            return request(`/reportes?${query.toString()}`);
        },
        formatoAutoridad: (params = {}) => {
            const query = new URLSearchParams(params);
            return request(`/reportes/formato-autoridad?${query.toString()}`);
        }
    },
    catalogos: {
        getTiposResiduo: () => request('/tipos-residuo'),
        getCamiones: () => request('/camiones'),
        getRutas: () => request('/rutas'),
        getUsuarios: () => request('/usuarios')
    },
    healthCheck: async () => {
        try {
            const response = await fetch('http://localhost:5000/health');
            return response.ok;
        } catch { return false; }
    }
};