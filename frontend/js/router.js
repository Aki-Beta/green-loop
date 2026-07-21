const routes = {
    '/': { view: 'login', public: true },
    '/login': { view: 'login', public: true },
    '/register': { view: 'register', public: true },
    '/dashboard': { view: 'dashboard', auth: true },
    '/cargas': { view: 'cargas', auth: true },
    '/certificados': { view: 'certificados', auth: true },
    '/solicitudes': { view: 'solicitudes', auth: true },
    '/reportes': { view: 'reportes', auth: true, admin: true },
    '/usuarios': { view: 'usuarios', auth: true, admin: true },
    '/camiones': { view: 'camiones', auth: true, admin: true }
};

function initRouter() { 
    window.addEventListener('hashchange', handleRoute); 
    handleRoute(); 
}

async function handleRoute() {
    const hash = location.hash.slice(1) || '/';
    const route = routes[hash] || routes['/'];
    
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Validación de seguridad
    if (route.auth && !token) { 
        navigate('/login'); return; 
    }
    if (route.admin && user.rol !== 'admin') { 
        navigate('/dashboard'); return; 
    }
    if (route.public && token && hash !== '/dashboard') { 
        navigate('/dashboard'); return; 
    }

    document.title = `${route.view.toUpperCase()} • Green-Loop`;

    // El contenedor exterior es angosto (580px) para login/register,
    // pero las vistas internas (dashboard, cargas, etc.) necesitan ancho completo.
    const layout = document.getElementById('contenedor-principal-layout');
    if (layout) {
        layout.classList.toggle('contenedor-pantalla', !!route.public);
        layout.classList.toggle('contenedor-app', !route.public);
    }

    updateNavbar(user);
    updateActiveNav(hash);
    await renderView(route.view);
}

// Función auxiliar para esperar a que una función exista en window
function waitForFunction(name, retries = 10) {
    return new Promise((resolve, reject) => {
        const check = () => {
            if (window[name]) resolve(window[name]);
            else if (retries > 0) {
                retries--;
                setTimeout(check, 100);
            } else reject(new Error(`No se encontró la función: ${name}`));
        };
        check();
    });
}

async function renderView(viewName) {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = '<div class="text-center py-12">Cargando...</div>';
    
    try {
        const funcName = `render${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`;
        // Usamos la espera inteligente
        const fn = await waitForFunction(funcName);
        await fn();
    } catch (e) {
        console.error("Error en renderView:", e);
        app.innerHTML = `<div class="text-center py-12 text-red-500 font-bold">Error al cargar la vista: ${viewName}</div>`;
    }
}

// Funciones de utilidad que ya tenías
function navigate(path) { location.hash = path.startsWith('/') ? path : `/${path}`; }
function updateNavbar(user) {
    const navbar = document.getElementById('navbar');
    const navLinks = document.getElementById('nav-links');
    const userMenu = document.getElementById('user-menu');
    if (!navbar || !navLinks || !userMenu) return;

    const token = localStorage.getItem('token');
    if (!token) {
        navbar.style.display = 'none';
        return;
    }
    navbar.style.display = 'block';

    const links = [
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/cargas', label: 'Cargas' },
        { path: '/certificados', label: 'Certificados' },
        { path: '/solicitudes', label: 'Solicitudes' },
    ];
    if (user.rol === 'admin') {
        links.push({ path: '/reportes', label: 'Reportes' });
        links.push({ path: '/usuarios', label: 'Usuarios' });
        links.push({ path: '/camiones', label: 'Camiones' });
    }
    navLinks.innerHTML = links
        .map(l => `<a href="#${l.path}" data-link style="color:#94a3b8;text-decoration:none;font-size:13px;font-weight:600;">${l.label}</a>`)
        .join('');

    userMenu.innerHTML = `
        <span style="color:#a7f3d0;font-size:13px;">
            ${user.nombre_completo || ''} <span style="color:#64748b;">(${user.rol || ''})</span>
        </span>
        <button onclick="logout()" class="btn-peligro" style="width:auto;padding:8px 14px;margin-top:0;">
            🚪 Cerrar sesión
        </button>
    `;
}
function updateActiveNav(path) { /* ... tu lógica existente ... */ }
// showToast() vive en app.js (se carga después y la deja disponible globalmente)
function logout() { localStorage.clear(); navigate('/login'); }

window.navigate = navigate;
window.logout = logout;
document.addEventListener('DOMContentLoaded', initRouter);