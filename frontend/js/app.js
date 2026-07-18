// ============================================================
// Green-Loop - App Bootstrap (Simplificado)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando Green-Loop...');
    initRouter();
    checkAPI();
    setInterval(checkAPI, 30000);

    // Navegación SPA
    document.body.addEventListener('click', e => {
        const link = e.target.closest('[data-link]');
        if (link) {
            e.preventDefault();
            navigate(link.getAttribute('href').slice(1));
        }
        if (e.target.closest('[data-logout]')) {
            e.preventDefault();
            logout();
        }
    });

    console.log('✅ Green-Loop lista');
});

async function checkAPI() {
    try {
        const res = await fetch('http://localhost:8000/health');
        const data = await res.json();
        const ind = document.getElementById('api-status');
        if (ind) {
            ind.textContent = data.status === 'ok' ? '🟢 API Conectada' : '🔴 API Error';
            ind.className = data.status === 'ok' ? 'text-green-600 text-sm' : 'text-red-600 text-sm';
        }
    } catch {
        const ind = document.getElementById('api-status');
        if (ind) { ind.textContent = '🔴 API Desconectada'; ind.className = 'text-red-600 text-sm'; }
    }
}