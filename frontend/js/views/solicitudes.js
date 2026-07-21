async function renderSolicitudes() {
    const app = document.getElementById('app');
    if (!app) return;
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    app.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <div class="mb-8">
                <h1 class="text-3xl font-extrabold text-gray-800">📝 Solicitudes de Recolección</h1>
                <p class="text-gray-500 text-sm mt-1">
                    ${user.rol === 'empresa'
                        ? 'Cuéntanos qué residuos tienes disponibles para recolectar'
                        : 'Solicitudes de recolección hechas por las empresas'}
                </p>
            </div>

            ${user.rol === 'empresa' ? `
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
                <h3 class="text-lg font-bold text-gray-800 mb-4">Nueva Solicitud</h3>
                <form id="solicitud-form" class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="form-label">Tipo de Residuo</label>
                            <select id="sol_tipo" class="form-input">
                                <option value="plastico">Plástico (Aprovechable)</option>
                                <option value="carton">Cartón / Papel</option>
                                <option value="vidrio">Vidrio</option>
                                <option value="organico">Orgánico Biodegradable</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Cantidad Aproximada (Kg)</label>
                            <input type="number" step="0.1" min="0.1" id="sol_cantidad" required class="form-input" placeholder="Ej: 150">
                        </div>
                    </div>
                    <div>
                        <label class="form-label">Notas (opcional)</label>
                        <input type="text" id="sol_notas" class="form-input" placeholder="Ej: Disponible después de las 3pm, acceso por la bodega trasera...">
                    </div>
                    <button type="submit" class="btn btn-primary">Enviar Solicitud</button>
                </form>
            </div>
            ` : ''}

            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider">
                        <tr>
                            ${user.rol !== 'empresa' ? '<th class="p-4">Empresa</th>' : ''}
                            <th class="p-4">Tipo Residuo</th>
                            <th class="p-4 text-right">Cantidad</th>
                            <th class="p-4">Notas</th>
                            <th class="p-4 text-center">Estado</th>
                            <th class="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="solicitudes-tbody" class="divide-y divide-gray-100">
                        <tr><td colspan="6" class="p-4 text-center text-gray-400">Cargando solicitudes...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    await loadSolicitudesList(token, user);
    setupSolicitudEvents(token, user);
}

function badgeEstado(estado) {
    const map = {
        pendiente: 'bg-green-50 text-amber-600',
        atendida: 'bg-green-100 text-green-700',
        cancelada: 'bg-gray-100 text-gray-500',
    };
    const cls = map[estado] || 'bg-gray-100 text-gray-500';
    return `<span class="px-2 py-0.5 rounded-full text-xs font-semibold ${cls}">${estado}</span>`;
}

async function loadSolicitudesList(token, user) {
    const tbody = document.getElementById('solicitudes-tbody');
    if (!tbody) return;
    try {
        const solicitudes = await api.solicitudes.listar(token);
        const cols = user.rol !== 'empresa' ? 6 : 5;
        tbody.innerHTML = solicitudes.map(s => `
            <tr class="hover:bg-gray-50/50">
                ${user.rol !== 'empresa' ? `<td class="p-4 font-semibold text-gray-700">${s.empresa_nombre || '-'}</td>` : ''}
                <td class="p-4 capitalize">${s.tipo_residuo}</td>
                <td class="p-4 text-right font-bold text-gray-900">${formatNumber(s.cantidad_estimada_kg)} kg</td>
                <td class="p-4 text-gray-500 text-xs">${s.notas || '-'}</td>
                <td class="p-4 text-center">${badgeEstado(s.estado)}</td>
                <td class="p-4 text-center">
                    ${user.rol === 'admin' && s.estado === 'pendiente'
                        ? `<button onclick="marcarAtendida(${s.id})" class="btn-accion btn-aceptar">Atender</button>`
                        : ''}
                    ${user.rol === 'empresa' && s.estado === 'pendiente'
                        ? `<button onclick="cancelarSolicitud(${s.id})" class="btn-accion btn-eliminar">Cancelar</button>`
                        : ''}
                </td>
            </tr>
        `).join('') || `<tr><td colspan="${cols}" class="p-4 text-center text-gray-400">No hay solicitudes registradas.</td></tr>`;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Error: ${err.message}</td></tr>`;
    }
}

function setupSolicitudEvents(token, user) {
    document.getElementById('solicitud-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            tipo_residuo: document.getElementById('sol_tipo').value,
            cantidad_estimada_kg: parseFloat(document.getElementById('sol_cantidad').value),
            notas: document.getElementById('sol_notas').value.trim() || null,
        };
        try {
            await api.solicitudes.crear(data, token);
            showToast('Solicitud enviada con éxito', 'success');
            e.target.reset();
            await loadSolicitudesList(token, user);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

async function marcarAtendida(id) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    try {
        await api.solicitudes.atender(id, token);
        showToast('Solicitud marcada como atendida', 'success');
        await loadSolicitudesList(token, user);
    } catch (err) { showToast(err.message, 'error'); }
}

async function cancelarSolicitud(id) {
    if (!confirm('¿Cancelar esta solicitud?')) return;
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    try {
        await api.solicitudes.cancelar(id, token);
        showToast('Solicitud cancelada', 'success');
        await loadSolicitudesList(token, user);
    } catch (err) { showToast(err.message, 'error'); }
}

window.renderSolicitudes = renderSolicitudes;
window.marcarAtendida = marcarAtendida;
window.cancelarSolicitud = cancelarSolicitud;
