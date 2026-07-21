// ============================================================
// Utilidades globales usadas por todas las vistas.
// formatNumber / formatDate / showToast NO estaban definidas
// antes (o estaban vacías) — por eso fallaban en varias vistas.
// ============================================================

function formatNumber(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return '0';
    return num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(value) {
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return '-';
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) { console.log(`[${type}] ${message}`); return; }

    const palette = {
        success: { border: '#10b981', color: '#34d399', bg: 'rgba(16,185,129,0.12)' },
        error: { border: '#ef4444', color: '#fca5a5', bg: 'rgba(239,68,68,0.12)' },
        warning: { border: '#f97316', color: '#fdba74', bg: 'rgba(249,115,22,0.12)' },
    };
    const c = palette[type] || palette.success;

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        background:${c.bg}; border:1px solid ${c.border}; color:${c.color};
        padding:12px 18px; border-radius:10px; margin-bottom:10px;
        font-size:13px; font-weight:600; max-width:340px;
        box-shadow:0 10px 25px rgba(0,0,0,0.45); backdrop-filter: blur(6px);
        opacity:0; transform:translateY(-8px); transition: all .2s ease;
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        setTimeout(() => toast.remove(), 250);
    }, 3200);
}

async function checkAPI() {
    const ind = document.getElementById('api-status');
    if (!ind) return;
    try {
        const res = await fetch('http://127.0.0.1:8000/api/health');
        if (res.ok) {
            ind.textContent = '🟢 API Conectada';
            ind.className = 'text-green-600 text-xs font-medium';
        } else {
            throw new Error();
        }
    } catch {
        ind.textContent = '🔴 API Desconectada';
        ind.className = 'text-red-600 text-xs font-medium';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAPI();
    setInterval(checkAPI, 30000);
});
