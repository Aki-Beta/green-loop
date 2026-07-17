// frontend/js/views/reportes.js - Vista Reportes con filtros y export CSV

let currentFilters = {};
let currentPage = 1;
const perPage = 20;

async function renderReportes() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <h1 class="text-3xl font-bold text-gray-800 flex items-center gap-3 mb-6">
                <i class="fas fa-chart-bar text-primary-600"></i> Reportes de Cumplimiento
            </h1>

            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div class="lg:col-span-1">
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h3 class="font-semibold text-gray-800 mb-4">Filtros</h3>
                        <form id="filtros-form" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                                <input type="date" id="fecha_inicio" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                                <input type="date" id="fecha_fin" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Municipio</label>
                                <input type="text" id="municipio" placeholder="Ej: Bogotá" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Zona</label>
                                <select id="zona" class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                                    <option value="">Todas</option>
                                    <option value="urbana">Urbana</option>
                                    <option value="rural">Rural</option>
                                </select>
                            </div>
                            <button type="submit" class="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition">Filtrar</button>
                        </form>
                    </div>
                </div>

                <div class="lg:col-span-3 space-y-6">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-reportes"></div>
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div class="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h3 class="font-semibold text-gray-800">Detalle de Cargas</h3>
                            <div class="flex items-center gap-2">
                                <span class="text-sm text-gray-500" id="pagination-info"></span>
                                <button id="btn-prev" class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50" disabled><i class="fas fa-chevron-left"></i></button>
                                <button id="btn-next" class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50" disabled><i class="fas fa-chevron-right"></i></button>
                            </div>
                        </div>
                        <div class="overflow-x-auto" id="tabla-reportes"></div>
                    </div>
                    <button onclick="exportarCSVReporte()" class="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition">
                        <i class="fas fa-file-csv"></i> Exportar CSV
                    </button>
                </div>
            </div>
        </div>
    `;

    setupFiltersListeners();
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha_fin').value = hoy;
    await loadReporte();
}

function setupFiltersListeners() {
    document.getElementById('filtros-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        currentFilters = {
            fecha_inicio: document.getElementById('fecha_inicio').value,
            fecha_fin: document.getElementById('fecha_fin').value,
            municipio: document.getElementById('municipio').value,
            zona: document.getElementById('zona').value
        };
        currentPage = 1;
        await loadReporte();
    });

    document.getElementById('btn-prev').addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadReporte(); } });
    document.getElementById('btn-next').addEventListener('click', () => { currentPage++; loadReporte(); });
}

let lastCargas = [];

async function loadReporte() {
    document.getElementById('tabla-reportes').innerHTML = `
        <div class="p-8 text-center">
            <div class="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent mx-auto"></div>
        </div>
    `;
    try {
        const params = { ...currentFilters, page: currentPage, per_page: perPage };
        const reporte = await api.reportes.obtener(params);
        lastCargas = reporte.detalle;
        renderKPIsReportes(reporte.resumen);
        renderTablaReportes(reporte.detalle, reporte.paginacion);
    } catch (error) {
        document.getElementById('tabla-reportes').innerHTML = `<div class="p-8 text-center text-red-600">Error: ${escapeHtml(error.message)}</div>`;
    }
}

function renderKPIsReportes(resumen) {
    const container = document.getElementById('kpi-reportes');
    const cards = [
        { label: 'Total Cargas', value: resumen.total_cargas || 0, icon: 'fa-boxes' },
        { label: 'Total Kg', value: formatNumber(resumen.total_kg || 0), icon: 'fa-weight-hanging' },
        { label: 'Certificados', value: resumen.total_certificados || 0, icon: 'fa-certificate' },
        { label: 'Municipios', value: Object.keys(resumen.por_municipio || {}).length, icon: 'fa-map-marker-alt' }
    ];
    container.innerHTML = cards.map(c => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p class="text-gray-500 text-sm font-medium">${c.label}</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">${c.value}</p>
        </div>
    `).join('');
}

function renderTablaReportes(cargas, paginacion) {
    const tbody = document.getElementById('tabla-reportes');
    const info = document.getElementById('pagination-info');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');

    if (!cargas.length) {
        tbody.innerHTML = '<div class="p-8 text-center text-gray-500">Sin resultados</div>';
        info.textContent = '0 resultados';
        prevBtn.disabled = true; nextBtn.disabled = true;
        return;
    }

    const rows = cargas.map(c => `
        <tr class="hover:bg-gray-50 border-b border-gray-100 last:border-0">
            <td class="px-5 py-3 text-sm text-gray-600">${formatDate(c.fecha, {hour:'2-digit', minute:'2-digit'})}</td>
            <td class="px-5 py-3 text-sm font-medium text-gray-800">${escapeHtml(c.camion)}</td>
            <td class="px-5 py-3 text-sm text-gray-600">${escapeHtml(c.municipio)}</td>
            <td class="px-5 py-3 text-sm text-gray-600 capitalize">${c.zona}</td>
            <td class="px-5 py-3 text-sm text-gray-600 capitalize">${c.material}</td>
            <td class="px-5 py-3 text-sm text-right text-gray-600">${formatNumber(c.peso_kg)} kg</td>
            <td class="px-5 py-3 text-sm text-gray-600">${escapeHtml(c.reciclador)}</td>
        </tr>
    `).join('');

    tbody.innerHTML = `
        <table class="w-full">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                    <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Camión</th>
                    <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Municipio</th>
                    <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Zona</th>
                    <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Material</th>
                    <th class="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Peso</th>
                    <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reciclador</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">${rows}</tbody>
        </table>
    `;

    const total = paginacion?.total || 0;
    const totalPages = paginacion?.total_pages || 1;
    info.textContent = `Página ${currentPage} de ${totalPages} (${total} total)`;
    document.getElementById('btn-prev').disabled = currentPage <= 1;
    document.getElementById('btn-next').disabled = currentPage >= totalPages;
}

function exportarCSVReporte() {
    if (!lastCargas.length) { showToast('No hay datos para exportar', 'warning'); return; }
    const columns = ['fecha', 'camion', 'municipio', 'zona', 'material', 'peso_kg', 'calidad', 'reciclador'];
    exportToCSV(lastCargas, `reporte-${new Date().toISOString().split('T')[0]}.csv`, columns);
    showToast('CSV exportado', 'success');
}