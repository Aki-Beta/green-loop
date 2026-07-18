// ============================================================
// Green-Loop - Vista Reportes (Admin)
// ============================================================

async function renderReportes() {
    const app = document.getElementById('app');
    if (!app) return;

    // Asegurar que Icons esté disponible
    window.Icons = window.Icons || { get: (name) => '' };

    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.rol !== 'admin') {
        showToast('Acceso denegado: se requiere rol admin', 'error');
        navigate('/dashboard');
        return;
    }

    app.innerHTML = getReportesHTML();
    setupEventListeners(token);
    await loadReportesMensual(token);
}

function getReportesHTML() {
    return `
        <div class="max-w-7xl mx-auto">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 class="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        ${Icons.get('chart-bar')} Reportes
                    </h1>
                    <p class="text-gray-600 mt-1">Generación de reportes para autoridades ambientales (Resolución 2184/2019)</p>
                </div>
            </div>

            <!-- Filtros -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label class="form-label">Año</label>
                        <select id="reporte_anio" class="form-input">
                            ${Array.from({length: 5}, (_, i) => new Date().getFullYear() - i)
                                .map(y => `<option value="${y}" ${y === new Date().getFullYear() ? 'selected' : ''}>${y}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Mes</label>
                        <select id="reporte_mes" class="form-input">
                            <option value="">Todos los meses</option>
                            ${Array.from({length: 12}, (_, i) => 
                                `<option value="${i+1}">${new Date(2000, i).toLocaleString('es-CO', {month: 'long'})}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Fecha Inicio (Autoridad)</label>
                        <input type="date" id="reporte_fecha_inicio" class="form-input">
                    </div>
                    <div>
                        <label class="form-label">Fecha Fin (Autoridad)</label>
                        <input type="date" id="reporte_fecha_fin" class="form-input">
                    </div>
                </div>
                <div class="flex gap-3 mt-4">
                    <button onclick="generarReporteMensual()" class="btn btn-primary">
                        ${Icons.get('chart-line')} Reporte Mensual por Zona
                    </button>
                    <button onclick="generarReporteAutoridad()" class="btn btn-success">
                        ${Icons.get('file-alt')} Formato Autoridad Ambiental
                    </button>
                    <button onclick="exportarReporteAutoridadCSV()" class="btn btn-secondary">
                        ${Icons.get('file-csv')} Exportar CSV
                    </button>
                </div>
            </div>

            <!-- Reporte Mensual por Zona -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
                <div class="p-5 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                        ${Icons.get('map-marked-alt')} Resumen Mensual por Zona y Residuo
                    </h3>
                </div>
                <div class="overflow-x-auto" id="reporte-mensual-container">
                    <div class="p-8 text-center">
                        <div class="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent mx-auto"></div>
                    </div>
                </div>
            </div>

            <!-- Reporte Formato Autoridad -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100">
                <div class="p-5 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                        ${Icons.get('gavel')} Formato para Autoridad Ambiental (Resolución 2184/2019)
                    </h3>
                </div>
                <div class="overflow-x-auto" id="reporte-autoridad-container">
                    <div class="p-8 text-center text-gray-500">
                        ${Icons.get('info-circle')} <span style="font-size: 3rem;" class="block mb-3"></span>
                        <p>Seleccione un rango de fechas y presione "Formato Autoridad Ambiental"</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setupEventListeners(token) {
    document.getElementById('reporte_anio')?.addEventListener('change', () => loadReportesMensual(token));
    document.getElementById('reporte_mes')?.addEventListener('change', () => loadReportesMensual(token));
}

async function loadReportesMensual(token) {
    const anio = parseInt(document.getElementById('reporte_anio').value);
    const mes = document.getElementById('reporte_mes').value;
    
    const container = document.getElementById('reporte-mensual-container');
    container.innerHTML = '<div class="p-8 text-center"><div class="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent mx-auto"></div></div>';

    try {
        const data = await api.reportes.mensualZona({ anio, mes: mes || undefined }, token);
        renderReporteMensual(data);
    } catch (error) {
        container.innerHTML = `<div class="p-8 text-center text-red-600">Error: ${escapeHtml(error.message)}</div>`;
    }
}

function renderReporteMensual(data) {
    const container = document.getElementById('reporte-mensual-container');
    
    if (!data.length) {
        container.innerHTML = '<div class="p-8 text-center text-gray-500">No hay datos para el período seleccionado</div>';
        return;
    }

    // Agrupar por zona
    const porZona = {};
    data.forEach(row => {
        if (!porZona[row.zona]) porZona[row.zona] = [];
        porZona[row.zona].push(row);
    });

    container.innerHTML = Object.entries(porZona).map(([zona, items]) => `
        <div class="p-5 border-b border-gray-100 last:border-0">
            <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                ${Icons.get('map-marker-alt')} ${escapeHtml(zona)}
            </h4>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Mes</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Residuo</th>
                            <th class="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total Cargas</th>
                            <th class="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total Kg</th>
                            <th class="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Valor Estimado</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${items.map(item => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-4 py-2 text-gray-600">${formatDate(item.mes, {month: 'long', year: 'numeric'})}</td>
                                <td class="px-4 py-2 text-gray-600 capitalize">${escapeHtml(item.residuo)}</td>
                                <td class="px-4 py-2 text-right text-gray-600">${formatNumber(item.total_cargas)}</td>
                                <td class="px-4 py-2 text-right text-gray-600 font-medium">${formatNumber(item.total_kg)}</td>
                                <td class="px-4 py-2 text-right text-green-700 font-medium">$${formatCurrency(item.valor_estimado)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');
}

async function generarReporteMensual() {
    const token = localStorage.getItem('token');
    await loadReportesMensual(token);
}

async function generarReporteAutoridad() {
    const token = localStorage.getItem('token');
    const fechaInicio = document.getElementById('reporte_fecha_inicio').value;
    const fechaFin = document.getElementById('reporte_fecha_fin').value;
    
    const container = document.getElementById('reporte-autoridad-container');
    container.innerHTML = '<div class="p-8 text-center"><div class="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent mx-auto"></div></div>';

    try {
        const params = {};
        if (fechaInicio) params.fecha_inicio = fechaInicio;
        if (fechaFin) params.fecha_fin = fechaFin;
        
        const data = await api.reportes.formatoAutoridad(params, token);
        renderReporteAutoridad(data);
    } catch (error) {
        container.innerHTML = `<div class="p-8 text-center text-red-600">Error: ${escapeHtml(error.message)}</div>`;
    }
}

function renderReporteAutoridad(data) {
    const container = document.getElementById('reporte-autoridad-container');
    
    if (!data.length) {
        container.innerHTML = '<div class="p-8 text-center text-gray-500">No hay datos para el período seleccionado</div>';
        return;
    }

    container.innerHTML = `
        <div class="p-5">
            <div class="mb-4 text-sm text-gray-600">
                <span class="font-medium">Total registros:</span> ${data.length} | 
                <span class="font-medium ml-4">Total Kg:</span> ${formatNumber(data.reduce((sum, r) => sum + r.peso_kg, 0))} |
                <span class="font-medium ml-4">Total Incentivos:</span> $${formatCurrency(data.reduce((sum, r) => sum + (r.incentivo_cop || 0), 0))}
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-xs">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Radicado</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Hora</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Municipio</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Ruta</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Zona</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Camión</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">QR</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Residuo</th>
                            <th class="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Peso (kg)</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Calidad</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Reciclador</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                            <th class="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Incentivo (COP)</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Hash Verificación</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 font-mono text-sm">
                        ${data.map((r, i) => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-3 py-2 text-gray-500">${r.consecutivo}</td>
                                <td class="px-3 py-2 text-primary-700 font-medium">${escapeHtml(r.certificado_radicado)}</td>
                                <td class="px-3 py-2 text-gray-600">${escapeHtml(r.fecha_recoleccion)}</td>
                                <td class="px-3 py-2 text-gray-600">${escapeHtml(r.hora_recoleccion)}</td>
                                <td class="px-3 py-2 text-gray-600">${escapeHtml(r.municipio)}</td>
                                <td class="px-3 py-2 text-gray-600">${escapeHtml(r.ruta)}</td>
                                <td class="px-3 py-2">
                                    <span class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${r.zona === 'Rural' ? 'bg-amber-100 text-amber-800' : r.zona === 'Industrial' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'} capitalize">${r.zona.toLowerCase()}</span>
                                </td>
                                <td class="px-3 py-2 text-gray-600 font-medium">${escapeHtml(r.camion_placa)}</td>
                                <td class="px-3 py-2 text-gray-500">${escapeHtml(r.camion_qr)}</td>
                                <td class="px-3 py-2 text-gray-600 capitalize">${escapeHtml(r.tipo_residuo)}</td>
                                <td class="px-3 py-2 text-right text-gray-600">${formatNumber(r.peso_kg)}</td>
                                <td class="px-3 py-2">
                                    <span class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${r.calidad === 'alta' ? 'bg-green-100 text-green-800' : r.calidad === 'media' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">${r.calidad}</span>
                                </td>
                                <td class="px-3 py-2 text-gray-600">${escapeHtml(r.reciclador)}</td>
                                <td class="px-3 py-2 text-gray-500">${escapeHtml(r.reciclador_email)}</td>
                                <td class="px-3 py-2 text-right text-green-700 font-medium">$${formatCurrency(r.incentivo_cop)}</td>
                                <td class="px-3 py-2 text-gray-400 font-mono text-xs">${escapeHtml(r.hash_verificacion?.substring(0,16) || '-')}...</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function exportarReporteAutoridadCSV() {
    const token = localStorage.getItem('token');
    const fechaInicio = document.getElementById('reporte_fecha_inicio').value;
    const fechaFin = document.getElementById('reporte_fecha_fin').value;
    
    if (!fechaInicio || !fechaFin) {
        showToast('Seleccione fecha inicio y fin para exportar', 'warning');
        return;
    }
    
    const params = { fecha_inicio: fechaInicio, fecha_fin: fechaFin };
    
    api.reportes.formatoAutoridad(params, token)
        .then(data => {
            if (!data.length) {
                showToast('No hay datos para exportar', 'warning');
                return;
            }
            
            const columns = [
                'consecutivo', 'certificado_radicado', 'fecha_recoleccion', 'hora_recoleccion',
                'municipio', 'ruta', 'zona', 'camion_placa', 'camion_qr', 'tipo_residuo',
                'peso_kg', 'calidad', 'reciclador', 'reciclador_email', 'incentivo_cop', 'hash_verificacion'
            ];
            
            exportToCSV(data, `reporte_autoridad_${fechaInicio}_${fechaFin}.csv`, columns);
            showToast('CSV exportado correctamente', 'success');
        })
        .catch(error => {
            showToast('Error exportando: ' + error.message, 'error');
        });
}