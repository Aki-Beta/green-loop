let almacenamientoReporteLocal = [];
async function renderReportes() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <div>
                <h1 class="text-3xl font-extrabold text-gray-800">Reportes Consolidados</h1>
            </div>
            <div class="bg-white rounded-2xl border border-gray-100 p-5 my-6 shadow-sm">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label class="form-label">Año</label>
                        <input type="number" id="rep_anio" class="form-input" value="${new Date().getFullYear()}">
                    </div>
                    <div>
                        <label class="form-label">Mes</label>
                        <input type="number" id="rep_mes" class="form-input" placeholder="Ej: 08">
                    </div>
                    <div>
                        <label class="form-label">Rango Inicial</label>
                        <input type="date" id="rep_inicio" class="form-input">
                    </div>
                    <div>
                        <label class="form-label">Rango Final</label>
                        <input type="date" id="rep_fin" class="form-input">
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 mt-4 pt-2 border-t border-gray-50">
                    <button onclick="ejecutarConsultaMensual()" class="btn btn-primary text-xs">Consultar Zonas</button>
                    <button onclick="ejecutarConsultaAutoridad()" class="btn btn-dark text-xs">Formato Gubernamental</button>
                    <button onclick="descargarCSVReporte()" class="btn btn-secondary text-xs">Descargar CSV</button>
                </div>
            </div>
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 p-4">
                <div id="container-mensual-zona" class="text-sm text-gray-400">Presiona 'Consultar Zonas'</div>
            </div>
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div id="container-autoridad" class="text-sm text-gray-400">Sin registros en pantalla.</div>
            </div>
        </div>
    `;
}
async function ejecutarConsultaMensual() {
    const container = document.getElementById('container-mensual-zona');
    if (!container) return;
    const token = localStorage.getItem('token');
    const params = { anio: document.getElementById('rep_anio').value, mes: document.getElementById('rep_mes').value };
    try {
        const data = await api.reportes.mensual(params, token);
        if(!data.length) { container.innerHTML = 'No hay datos.'; return; }
        container.innerHTML = `
            <table class="w-full text-left text-xs">
                <thead><tr class="text-gray-400 border-b"><th class="p-2">Zona</th><th class="p-2">Residuo</th><th class="p-2 text-right">Peso</th></tr></thead>
                <tbody>
                    ${data.map(d => `<tr class="border-b"><td class="p-2 font-semibold">${d.zona || 'Norte'}</td><td class="p-2 capitalize">${d.residuo || d.tipo_residuo}</td><td class="p-2 text-right font-bold">${formatNumber(d.total_kg || d.peso_kg || 0)} kg</td></tr>`).join('')}
                </tbody>
            </table>`;
    } catch (err) { container.innerHTML = `Error: ${err.message}`; }
}
async function ejecutarConsultaAutoridad() {
    const container = document.getElementById('container-autoridad');
    if (!container) return;
    const token = localStorage.getItem('token');
    const params = { fecha_inicio: document.getElementById('rep_inicio').value, fecha_fin: document.getElementById('rep_fin').value };
    if(!params.fecha_inicio || !params.fecha_fin) { showToast('Elige un rango', 'warning'); return; }
    try {
        const data = await api.reportes.autoridad(params, token);
        almacenamientoReporteLocal = data;
        if(!data.length) { container.innerHTML = 'Sin coincidencias.'; return; }
        container.innerHTML = `
            <table class="w-full text-left text-xs font-mono">
                <thead><tr class="bg-gray-50"><th class="p-2">ID</th><th class="p-2">Fecha</th><th class="p-2">Residuo</th><th class="p-2 text-right">Masa</th></tr></thead>
                <tbody>
                    ${data.map(r => `<tr class="border-b"><td class="p-2 text-blue-600 font-bold">#${r.id || r.certificado_radicado}</td><td class="p-2">${r.fecha || r.fecha_recoleccion}</td><td class="p-2">${r.tipo_residuo || r.residuo}</td><td class="p-2 text-right font-bold">${r.peso_kg || r.peso} kg</td></tr>`).join('')}
                </tbody>
            </table>`;
    } catch (err) { container.innerHTML = `Error: ${err.message}`; }
}
function descargarCSVReporte() {
    if (!almacenamientoReporteLocal.length) { showToast('Ejecuta la consulta primero', 'warning'); return; }
    let csv = "\uFEFFID,Fecha,Tipo_Residuo,Peso_KG\n";
    almacenamientoReporteLocal.forEach(r => { csv += `${r.id || r.certificado_radicado},"${r.fecha || r.fecha_recoleccion}","${r.tipo_residuo || r.residuo}",${r.peso_kg || r.peso}\n`; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "reporte_greenloop.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
window.renderReportes = renderReportes;
window.ejecutarConsultaMensual = ejecutarConsultaMensual;
window.ejecutarConsultaAutoridad = ejecutarConsultaAutoridad;
window.descargarCSVReporte = descargarCSVReporte;
