async function renderDashboard() {
    const app = document.getElementById('app');
    if (!app) return;
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    app.innerHTML = `
        <div class="max-w-7xl mx-auto py-4">
            <div class="mb-8">
                <h1 class="text-3xl font-extrabold text-gray-900">Hola, ${user.nombre_completo || 'Usuario'}</h1>
                <p class="text-gray-500 text-sm mt-1">Rol activo: <span class="capitalize font-semibold text-green-600">${user.rol}</span></p>
            </div>

            <div id="stats-grid" class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div class="flex items-center justify-between mb-2">
                        <p class="text-xs font-bold text-gray-400 uppercase">Cargas Registradas</p>
                        <span style="font-size:20px;">📋</span>
                    </div>
                    <h3 id="stat-cargas" class="text-3xl font-bold text-gray-800">--</h3>
                </div>
                <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div class="flex items-center justify-between mb-2">
                        <p class="text-xs font-bold text-gray-400 uppercase">Certificados Emitidos</p>
                        <span style="font-size:20px;">📜</span>
                    </div>
                    <h3 id="stat-certificados" class="text-3xl font-bold text-green-600">--</h3>
                </div>
                <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div class="flex items-center justify-between mb-2">
                        <p class="text-xs font-bold text-gray-400 uppercase">Total Residuos</p>
                        <span style="font-size:20px;">♻️</span>
                    </div>
                    <h3 id="stat-peso" class="text-3xl font-bold text-blue-600">-- kg</h3>
                </div>
            </div>

            <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 class="text-lg font-bold text-gray-800 mb-4">Acciones Rápidas</h3>
                <div class="flex flex-wrap gap-3" id="dashboard-actions"></div>
            </div>
        </div>
    `;
    await loadDashboardStats(token);
    renderDashboardActions(user.rol);
}

async function loadDashboardStats(token) {
    const elCargas = document.getElementById('stat-cargas');
    const elCerts = document.getElementById('stat-certificados');
    const elPeso = document.getElementById('stat-peso');
    try {
        const stats = await api.dashboard.stats(token);
        elCargas.textContent = stats.total_cargas ?? 0;
        elCerts.textContent = stats.total_certificados ?? 0;
        elPeso.textContent = `${formatNumber(stats.total_peso_kg ?? 0)} kg`;
    } catch (err) {
        // Mostramos 0 en vez de un texto falso que oculte que algo falló de verdad.
        console.error('Error cargando /dashboard/stats:', err);
        elCargas.textContent = '0';
        elCerts.textContent = '0';
        elPeso.textContent = '0 kg';
        showToast('No se pudieron cargar las estadísticas', 'error');
    }
}

function renderDashboardActions(rol) {
    const container = document.getElementById('dashboard-actions');
    if (!container) return;
    let html = '';
    if (rol === 'admin') {
        html = `
            <a href="#/usuarios" data-link class="btn btn-dark">👥 Gestionar Usuarios</a>
            <a href="#/reportes" data-link class="btn btn-primary">📊 Ver Reportes Avanzados</a>
            <a href="#/cargas" data-link class="btn btn-secondary">📋 Auditar Cargas</a>
            <a href="#/solicitudes" data-link class="btn btn-secondary">📝 Ver Solicitudes</a>
        `;
    } else if (rol === 'reciclador') {
        html = `
            <a href="#/cargas" data-link class="btn btn-primary">📋 Registrar Nueva Carga</a>
        `;
    } else if (rol === 'empresa') {
        html = `
            <a href="#/solicitudes" data-link class="btn btn-primary">📝 Solicitar Recolección</a>
            <a href="#/certificados" data-link class="btn btn-secondary">📜 Ver Certificados Ambientales</a>
        `;
    }
    container.innerHTML = html;
}

window.renderDashboard = renderDashboard;
