// frontend/js/router.js - Router SPA simple basado en hash (#/)

const routes = {
    '/': { view: 'dashboard', title: 'Dashboard' },
    '/carga': { view: 'carga', title: 'Registrar Carga' },
    '/certificado': { view: 'certificado', title: 'Certificado' },
    '/reportes': { view: 'reportes', title: 'Reportes' }
};

let currentRoute = null;

function initRouter() {
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange();
}

async function handleRouteChange() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, ...params] = hash.split('?');

    const route = routes[path] || routes['/'];
    currentRoute = { path, params, ...route };

    document.title = `${route.title} • EcoTrazabilidad`;
    updateActiveNav(path);
    await renderView(route.view, params);
}

async function renderView(viewName, params) {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
        <div class="flex justify-center items-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        </div>
    `;

    try {
        const renderFn = window[`render${viewName.capitalize()}`];
        if (typeof renderFn === 'function') {
            await renderFn(params);
        } else {
            throw new Error(`Vista no implementada: ${viewName}`);
        }
    } catch (error) {
        console.error(`Error renderizando ${viewName}:`, error);
        app.innerHTML = renderErrorState(viewName, error.message);
    }
}

function updateActiveNav(path) {
    document.querySelectorAll('[data-link]').forEach(link => {
        const href = link.getAttribute('href').slice(1);
        const isActive = href === path;
        link.classList.toggle('text-primary-100', isActive);
        link.classList.toggle('font-semibold', isActive);
    });
}

function navigate(path) {
    window.location.hash = path;
}

function renderErrorState(view, message) {
    return `
        <div class="max-w-md mx-auto text-center py-12">
            <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
            <h2 class="text-xl font-semibold text-gray-800 mb-2">Error en ${view}</h2>
            <p class="text-gray-600 mb-6">${escapeHtml(message)}</p>
            <button onclick="navigate('/')" class="bg-primary-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-primary-700 transition">
                Volver al Dashboard
            </button>
        </div>
    `;
}