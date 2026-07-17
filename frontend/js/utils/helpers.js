// frontend/js/utils/helpers.js - Funciones utilitarias globales (SIN import/export)

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatCurrency(num) {
    if (num === null || num === undefined) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function formatDate(dateString, options = {}) {
    if (!dateString) return '-';
    try {
        const defaultOpts = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('es-CO', { ...defaultOpts, ...options });
    } catch { return dateString; }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const bgColors = { success: 'bg-green-600', error: 'bg-red-600', warning: 'bg-yellow-600', info: 'bg-blue-600' };
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };

    const toast = document.createElement('div');
    toast.className = `toast ${bgColors[type]} text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-[280px] max-w-md`;
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span class="flex-1 text-sm">${escapeHtml(message)}</span>
        <button onclick="this.parentElement.remove()" class="ml-2 opacity-70 hover:opacity-100">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 4000);
}

async function checkAPIConnection() {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (!dot || !text) return;

    try {
        const response = await fetch('http://localhost:5000/health');
        if (response.ok) {
            dot.className = 'w-2 h-2 rounded-full bg-green-500 mr-1';
            text.textContent = 'Conectado';
        } else {
            throw new Error('API error');
        }
    } catch (error) {
        dot.className = 'w-2 h-2 rounded-full bg-red-500 mr-1';
        text.textContent = 'Desconectado';
    }
}

function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function toCSV(data, columns) {
    if (!data.length) return '';
    const headers = columns || Object.keys(data[0]);
    const rows = data.map(obj => headers.map(h => {
        const val = obj[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') ? '"' + str.replace(/"/g, '""') + '"' : str;
    }).join(','));
    return [headers.join(','), ...rows].join('\n');
}

function exportToCSV(data, filename, columns) {
    const csv = toCSV(data, columns);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
}

// Extensión útil: "carton".capitalize() -> "Carton"
String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};