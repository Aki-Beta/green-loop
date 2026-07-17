// frontend/js/router.js - Router SPA simple basado en hash (#/)

const routes = {
    '/': { view: 'login', title: 'Iniciar Sesión', public: true },
    '/login': { view: 'login', title: 'Iniciar Sesión', public: true },
    '/register': { view: 'register', title: 'Registrar Empresa', public: true },
    '/dashboard': { view: 'dashboard', title: 'Dashboard', auth: true },
    '/users': { view: 'users', title: 'Gestión de Usuarios', auth: true, admin: true }
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

    // Check auth
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (route.auth && !token) {
        showToast('Debe iniciar sesión', 'warning');
        navigate('/login');
        return;
    }
    if (route.admin && user.role !== 'admin') {
        showToast('Acceso denegado: se requiere rol admin', 'error');
        navigate('/dashboard');
        return;
    }
    if (route.public && token && path !== '/dashboard') {
        // Already logged in, redirect to dashboard
        navigate('/dashboard');
        return;
    }

    document.title = `${route.title} • Green Loop`;
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
            <button onclick="navigate('/dashboard')" class="bg-primary-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-primary-700 transition">
                Ir al Dashboard
            </button>
        </div>
    `;
}