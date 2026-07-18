// ============================================================
// Green-Loop - Router SPA (Simplificado)
// ============================================================

const routes = {
    '/': { view: 'login', public: true },
    '/login': { view: 'login', public: true },
    '/register': { view: 'register', public: true },
    '/dashboard': { view: 'dashboard', auth: true },
    '/cargas': { view: 'cargas', auth: true },
    '/certificados': { view: 'certificados', auth: true },
    '/reportes': { view: 'reportes', auth: true, admin: true },
    '/usuarios': { view: 'usuarios', auth: true, admin: true }
};

let currentRoute = null;

function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}

async function handleRoute() {
    const hash = location.hash.slice(1) || '/';
    const route = routes[hash] || routes['/'];
    currentRoute = { path: hash, ...route };

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (route.auth && !token) {
        showToast('Debe iniciar sesión', 'warning');
        navigate('/login');
        return;
    }

    if (route.admin && user.rol !== 'admin') {
        showToast('Acceso denegado: se requiere admin', 'error');
        navigate('/dashboard');
        return;
    }

    if (route.public && token && hash !== '/dashboard') {
        navigate('/dashboard');
        return;
    }

    document.title = `${route.view.charAt(0).toUpperCase() + route.view.slice(1)} • Green-Loop`;
    updateNavbar(user);
    await renderView(route.view);
}

async function renderView(viewName) {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        const fn = window[`render${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`];
        if (typeof fn === 'function') {
            await fn();
        } else {
            throw new Error(`Vista no implementada: ${viewName}`);
        }
    } catch (e) {
        console.error(e);
        const IconsObj = window.Icons || { get: () => '' };
        app.innerHTML = `<div class="max-w-md mx-auto text-center py-12">${IconsObj.get('exclamation-triangle')}<h2 class="text-xl font-semibold mb-2">Error</h2><p class="text-gray-600 mb-6">${e.message}</p><button onclick="navigate('/dashboard')" class="btn btn-primary">${IconsObj.get('arrow-left')} Dashboard</button></div>`;
    }
}

function updateNavbar(user) {
    const nav = document.getElementById('navbar');
    const links = document.getElementById('nav-links');
    const menu = document.getElementById('user-menu');
    
    if (!nav) return;
    
    if (!user || !user.rol) {
        nav.classList.add('hidden');
        return;
    }
    
    // Ensure Icons is available
    const IconsObj = window.Icons || { get: () => '' };
    
    nav.classList.remove('hidden');
    
    const linkMap = {
        admin: ['/dashboard', '/cargas', '/certificados', '/reportes', '/usuarios'],
        reciclador: ['/dashboard', '/cargas'],
        empresa: ['/dashboard', '/certificados', '/cargas']
    };
    
    const allowed = linkMap[user.rol] || ['/dashboard'];
    const labels = {
        '/dashboard': 'Dashboard',
        '/cargas': 'Cargas',
        '/certificados': 'Certificados',
        '/reportes': 'Reportes',
        '/usuarios': 'Usuarios'
    };
    
    links.innerHTML = allowed.map(p => 
        `<a href="#${p}" data-link class="hover:text-primary-100">${labels[p]}</a>`
    ).join(' ');
    
    menu.innerHTML = `
        <span class="mr-4 text-sm">${user.nombre_completo}</span>
        <span class="px-2 py-1 bg-primary-600 rounded text-xs capitalize">${user.rol}</span>
        <button data-logout class="ml-4 px-3 py-1 bg-primary-600 hover:bg-primary-500 rounded text-sm">
            ${IconsObj.get('sign-out-alt')} Salir
        </button>
    `;
}

function navigate(path) {
    location.hash = path;
}

function updateActiveNav(path) {
    document.querySelectorAll('[data-link]').forEach(a => {
        const href = a.getAttribute('href').slice(1);
        a.classList.toggle('text-primary-100', href === path);
        a.classList.toggle('font-semibold', href === path);
    });
}

function showToast(msg, type = 'success') {
    const box = document.getElementById('toast-container');
    const colors = { success: 'bg-green-600', error: 'bg-red-600', warning: 'bg-yellow-600', info: 'bg-blue-600' };
    const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
    const IconsObj = window.Icons || { get: () => '' };
    
    const el = document.createElement('div');
    el.className = `toast ${colors[type]} text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-[280px] max-w-md`;
    el.innerHTML = `${IconsObj.get(icons[type])}<span class="flex-1 text-sm">${msg}</span><button onclick="this.parentElement.remove()" class="ml-2 opacity-70 hover:opacity-100">${IconsObj.get('times')}</button>`;
    box.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Sesión cerrada', 'info');
    setTimeout(() => navigate('/login'), 500);
}

function escapeHtml(t) {
    if (!t) return '';
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

function formatNumber(n) {
    return Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(d, opts = {}) {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', ...opts }); } 
    catch { return d; }
}

window.navigate = navigate;
window.logout = logout;
window.showToast = showToast;
window.escapeHtml = escapeHtml;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.updateActiveNav = updateActiveNav;