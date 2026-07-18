// ============================================================
// Green-Loop - Vista Dashboard
// ============================================================

async function renderDashboard() {
    const app = document.getElementById('app');
    if (!app) return;

    // Asegurar que Icons esté disponible (fallback por si no cargó)
    window.Icons = window.Icons || { get: (name) => '' };

    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    try {
        const [user, stats] = await Promise.all([
            api.auth.me(token),
            api.dashboard.stats(token)
        ]);
        renderDashboardHTML(user, stats);
    } catch (e) {
        if (e.message.includes('401')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
        } else {
            showToast('Error cargando dashboard: ' + e.message, 'error');
        }
    }
}

function renderDashboardHTML(user, stats) {
    const app = document.getElementById('app');
    const isAdmin = user.rol === 'admin';

    app.innerHTML = `
        <div class="min-h-screen bg-gray-50">
            <header class="bg-white shadow-sm sticky top-0 z-40">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        <div class="flex items-center">
                            <span class="icon leaf" style="width: 2rem; height: 2rem; color: var(--primary-600);"></span>
                            <span class="font-bold text-xl text-gray-900">Green-Loop</span>
                        </div>
                        <div class="flex items-center gap-4">
                            <span class="text-sm text-gray-600">
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                    ${isAdmin ? 'bg-purple-100 text-purple-800' : 
                                      user.rol === 'empresa' ? 'bg-blue-100 text-blue-800' : 
                                      'bg-green-100 text-green-800'} capitalize">
                                    ${user.rol}
                                </span>
                            </span>
                            <button onclick="logout()" class="btn btn-secondary text-sm">
                                ${Icons.get('sign-out-alt')} Salir
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p class="text-gray-600 mt-1">Bienvenido, ${escapeHtml(user.nombre_completo)} <span class="text-gray-400">|</span> ${escapeHtml(user.email)}</p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="stat-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm font-medium">Cargas Hoy</p>
                                <p class="text-3xl font-bold text-gray-900 mt-1">${stats.total_cargas_hoy || 0}</p>
                            </div>
                            <div class="stat-icon stat-icon-primary">${Icons.get('boxes')}</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm font-medium">Kg Reciclados Hoy</p>
                                <p class="text-3xl font-bold text-gray-900 mt-1">${formatNumber(stats.total_kg_hoy || 0)}</p>
                            </div>
                            <div class="stat-icon stat-icon-blue">${Icons.get('weight-hanging')}</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm font-medium">Recicladores Activos</p>
                                <p class="text-3xl font-bold text-gray-900 mt-1">${stats.total_recicladores_activos || 0}</p>
                            </div>
                            <div class="stat-icon stat-icon-green">${Icons.get('users')}</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm font-medium">Incentivos Pendientes</p>
                                <p class="text-3xl font-bold text-gray-900 mt-1">$${formatCurrency(stats.incentivos_pendientes || 0)}</p>
                            </div>
                            <div class="stat-icon stat-icon-yellow">${Icons.get('coins')}</div>
                        </div>
                    </div>
                </div>

                ${isAdmin ? `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="card p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Cargas por Zona</h3>
                        <div class="h-64">
                            ${Object.keys(stats.cargas_por_zona || {}).length 
                                ? '<canvas id="chart-zona"></canvas>'
                                : '<p class="text-gray-500 text-center py-20">Sin datos</p>'}
                        </div>
                    </div>
                    <div class="card p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Cargas por Residuo</h3>
                        <div class="h-64">
                            ${Object.keys(stats.cargas_por_residuo || {}).length 
                                ? '<canvas id="chart-residuo"></canvas>'
                                : '<p class="text-gray-500 text-center py-20">Sin datos</p>'}
                        </div>
                    </div>
                </div>
                ` : ''}
            </main>
        </div>
    `;

    if (isAdmin) drawCharts(stats);
}

function drawCharts(stats) {
    if (typeof Chart === 'undefined') return;
    
    // Chart Zona
    const zonaEl = document.getElementById('chart-zona');
    if (zonaEl) {
        new Chart(zonaEl, {
            type: 'doughnut',
            data: {
                labels: Object.keys(stats.cargas_por_zona),
                datasets: [{ data: Object.values(stats.cargas_por_zona), backgroundColor: ['#16a34a', '#22c55e', '#4ade80', '#86efac'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    // Chart Residuo
    const residuoEl = document.getElementById('chart-residuo');
    if (residuoEl) {
        new Chart(residuoEl, {
            type: 'bar',
            data: {
                labels: Object.keys(stats.cargas_por_residuo),
                datasets: [{ label: 'Cargas', data: Object.values(stats.cargas_por_residuo), backgroundColor: '#16a34a' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }
}