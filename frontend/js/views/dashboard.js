// frontend/js/views/dashboard.js - Vista Dashboard (KPIs, gráficos, tabla)

async function renderDashboard() {
    const app = document.getElementById('app');
    if (!app) return;

    try {
        const hoy = new Date().toISOString().split('T')[0];
        const reporte = await api.reportes.obtener({ fecha_inicio: hoy, per_page: 100 });
        renderDashboardHTML(reporte);
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        app.innerHTML = `
            <div class="text-center py-12 max-w-md mx-auto">
                <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
                <h2 class="text-xl font-semibold text-gray-800 mb-2">Error cargando dashboard</h2>
                <p class="text-gray-600 mb-6">${escapeHtml(error.message)}</p>
                <button onclick="renderDashboard()" class="bg-primary-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-primary-700 transition">
                    <i class="fas fa-redo mr-2"></i> Reintentar
                </button>
            </div>
        `;
    }
}

function renderDashboardHTML(reporte) {
    const resumen = reporte.resumen || {};
    const detalle = reporte.detalle || [];
    const app = document.getElementById('app');

    app.innerHTML = `
        <div class="space-y-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 class="text-3xl font-bold text-gray-800">Dashboard</h1>
                    <p class="text-gray-600 mt-1">Resumen de operaciones - ${formatDate(new Date().toISOString(), {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
                </div>
                <button onclick="navigate('/carga')" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition flex items-center gap-2 shadow-sm">
                    <i class="fas fa-plus"></i> Nueva Carga
                </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                ${renderKPICards(resumen)}
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    ${renderBarChart('Por Tipo de Residuo', resumen.por_material || {}, 'primary')}
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    ${renderBarChart('Por Zona', resumen.por_zona || {}, 'blue')}
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                        <i class="fas fa-history text-primary-600"></i> Últimas Cargas
                    </h3>
                    <button onclick="navigate('/reportes')" class="text-primary-600 hover:text-primary-800 text-sm font-medium">
                        Ver reporte completo <i class="fas fa-arrow-right ml-1"></i>
                    </button>
                </div>
                <div class="overflow-x-auto">${renderCargasTable(detalle.slice(0, 10))}</div>
            </div>
        </div>
    `;
}

function renderKPICards(resumen) {
    const cards = [
        { label: 'Cargas Hoy', value: resumen.total_cargas || 0, icon: 'fa-boxes', color: 'primary' },
        { label: 'Total Kg', value: formatNumber(resumen.total_kg || 0), icon: 'fa-weight-hanging', color: 'blue' },
        { label: 'Certificados', value: resumen.total_certificados || 0, icon: 'fa-certificate', color: 'green' },
        { label: 'Materiales', value: Object.keys(resumen.por_material || {}).length, icon: 'fa-recycle', color: 'purple' }
    ];
    return cards.map(card => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-gray-500 text-sm font-medium">${card.label}</p>
                    <p class="text-3xl font-bold text-gray-800 mt-1">${card.value}</p>
                </div>
                <div class="bg-${card.color}-100 p-3 rounded-full">
                    <i class="fas ${card.icon} text-${card.color}-600 text-2xl"></i>
                </div>
            </div>
        </div>
    `).join('');
}

function renderBarChart(title, data, color) {
    if (!data || Object.keys(data).length === 0) {
        return `<h4 class="font-semibold text-gray-800 mb-4">${title}</h4><div class="text-center py-8 text-gray-500">Sin datos</div>`;
    }
    const max = Math.max(...Object.values(data));
    const bars = Object.entries(data).map(([label, value]) => {
        const pct = max > 0 ? (value / max) * 100 : 0;
        return `
            <div class="mb-4 last:mb-0">
                <div class="flex justify-between text-sm mb-1">
                    <span class="font-medium text-gray-700 capitalize">${escapeHtml(label)}</span>
                    <span class="text-gray-500">${formatNumber(value)} kg</span>
                </div>
                <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full bg-${color}-500 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
    return `<h4 class="font-semibold text-gray-800 mb-4">${title}</h4><div class="space-y-4">${bars}</div>`;
}

function renderCargasTable(cargas) {
    if (!cargas.length) {
        return `
            <div class="p-12 text-center text-gray-500">
                <i class="fas fa-inbox text-4xl mb-3 text-gray-300"></i>
                <p>No hay cargas registradas hoy</p>
                <button onclick="navigate('/carga')" class="mt-4 text-primary-600 hover:text-primary-800 font-medium">
                    Registrar primera carga <i class="fas fa-arrow-right ml-1"></i>
                </button>
            </div>
        `;
    }
    const rows = cargas.map(c => `
        <tr class="hover:bg-gray-50 border-b border-gray-100 last:border-0">
            <td class="px-5 py-4 text-sm text-gray-600">${formatDate(c.fecha, {hour:'2-digit', minute:'2-digit'})}</td>
            <td class="px-5 py-4 text-sm font-medium text-gray-800">${escapeHtml(c.camion)}</td>
            <td class="px-5 py-4 text-sm text-gray-600 capitalize">${escapeHtml(c.material)}</td>
            <td class="px-5 py-4 text-sm text-gray-600 text-right">${formatNumber(c.peso_kg)} kg</td>
            <td class="px-5 py-4 text-sm">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${c.zona === 'urbana' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'} capitalize">${c.zona}</span>
            </td>
            <td class="px-5 py-4 text-sm text-gray-600">${escapeHtml(c.reciclador)}</td>
            <td class="px-5 py-4 text-sm text-center">
                ${c.tiene_certificado
                    ? '<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"><i class="fas fa-check mr-1"></i> Sí</span>'
                    : '<span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">No</span>'}
            </td>
            <td class="px-5 py-4 text-sm text-center">
                ${c.tiene_certificado
                    ? `<button onclick="navigate('/certificado?id=${c.id}')" class="text-primary-600 hover:text-primary-800 font-medium text-sm">Ver</button>`
                    : '<span class="text-gray-400 text-sm">-</span>'}
            </td>
        </tr>
    `).join('');

    return `
        <table class="w-full">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                    <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Camión</th>
                    <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Material</th>
                    <th class="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Peso</th>
                    <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Zona</th>
                    <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reciclador</th>
                    <th class="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Cert.</th>
                    <th class="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acción</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">${rows}</tbody>
        </table>
    `;
}