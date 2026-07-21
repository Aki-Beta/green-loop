async function renderCamiones() {
    const app = document.getElementById('app');
    if (!app) return;
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.rol !== 'admin') { showToast('Acceso denegado', 'error'); navigate('/dashboard'); return; }

    app.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <div class="mb-8">
                <h1 class="text-3xl font-extrabold text-gray-800">🚚 Camiones y Códigos QR</h1>
                <p class="text-gray-500 text-sm mt-1">Genera el QR de cada camión e imprímelo para que el reciclador lo escanee</p>
            </div>

            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
                <h3 class="text-lg font-bold text-gray-800 mb-4">Nuevo Camión</h3>
                <form id="camion-form" class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div>
                        <label class="form-label">Placa</label>
                        <input type="text" id="camion_placa" required class="form-input" placeholder="Ej: ABC-123">
                    </div>
                    <div>
                        <label class="form-label">Capacidad (Kg)</label>
                        <input type="number" step="0.1" id="camion_capacidad" required class="form-input" placeholder="Ej: 5000">
                    </div>
                    <div>
                        <label class="form-label">Ruta</label>
                        <select id="camion_ruta" class="form-input"></select>
                    </div>
                    <div class="sm:col-span-3">
                        <button type="submit" class="btn btn-primary">Crear Camión y Generar QR</button>
                    </div>
                </form>
            </div>

            <div id="camiones-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <p class="text-gray-400 text-sm p-4 col-span-full text-center">Cargando camiones...</p>
            </div>
        </div>

        <div id="qr-print-modal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 mx-4 text-center">
                <h3 id="qr-print-titulo" class="text-lg font-bold text-gray-900 mb-4"></h3>
                <img id="qr-print-imagen" src="" alt="Código QR" style="width:220px;height:220px;margin:0 auto;border-radius:8px;">
                <p id="qr-print-codigo" class="text-xs text-gray-500 font-mono mt-3"></p>
                <button type="button" onclick="cerrarModalQRPrint()" class="btn btn-secondary w-full mt-4">Cerrar</button>
            </div>
        </div>
    `;

    await cargarRutasParaSelect(token);
    await loadCamionesGrid(token);
    setupCamionEvents(token);
}

async function cargarRutasParaSelect(token) {
    try {
        const rutas = await api.catalogos.rutas(token);
        document.getElementById('camion_ruta').innerHTML =
            rutas.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('') ||
            '<option value="">No hay rutas — se creará una genérica</option>';
    } catch { /* silencioso, no bloquea el formulario */ }
}

async function loadCamionesGrid(token) {
    const grid = document.getElementById('camiones-grid');
    if (!grid) return;
    try {
        const camiones = await api.catalogos.camiones(token);
        if (!camiones.length) {
            grid.innerHTML = '<p class="text-gray-400 text-sm p-4 col-span-full text-center">Aún no hay camiones registrados.</p>';
            return;
        }
        grid.innerHTML = camiones.map(c => `
            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <p class="text-xs font-bold text-green-600 uppercase">${c.ruta_nombre || 'Sin ruta'}</p>
                <h4 class="text-lg font-bold text-gray-800 mt-1">${c.placa}</h4>
                <p class="text-xs text-gray-500 mt-1">Capacidad: ${formatNumber(c.capacidad_kg)} kg</p>
                <button onclick="verQRCamion(${c.id_camion})" class="btn btn-dark w-full mt-4">📷 Ver / Imprimir QR</button>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = `<p class="text-red-500 text-sm p-4 col-span-full text-center">Error: ${err.message}</p>`;
    }
}

function setupCamionEvents(token) {
    document.getElementById('camion-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rutaVal = document.getElementById('camion_ruta').value;
        const data = {
            placa: document.getElementById('camion_placa').value.trim(),
            capacidad_kg: parseFloat(document.getElementById('camion_capacidad').value),
            id_ruta: rutaVal ? parseInt(rutaVal) : null,
        };
        if (!data.id_ruta) { showToast('Selecciona (o crea primero) una ruta', 'warning'); return; }
        try {
            await api.catalogos.crearCamion(data, token);
            showToast('Camión creado con su QR', 'success');
            e.target.reset();
            await loadCamionesGrid(token);
        } catch (err) { showToast(err.message, 'error'); }
    });
}

async function verQRCamion(id) {
    const token = localStorage.getItem('token');
    try {
        const info = await api.catalogos.qrCamion(id, token);
        document.getElementById('qr-print-titulo').textContent = `Camión ${info.placa}`;
        document.getElementById('qr-print-imagen').src = info.qr_image_base64;
        document.getElementById('qr-print-codigo').textContent = info.qr_code;
        document.getElementById('qr-print-modal')?.classList.replace('hidden', 'flex');
    } catch (err) { showToast(err.message, 'error'); }
}

function cerrarModalQRPrint() { document.getElementById('qr-print-modal')?.classList.replace('flex', 'hidden'); }

window.renderCamiones = renderCamiones;
window.verQRCamion = verQRCamion;
window.cerrarModalQRPrint = cerrarModalQRPrint;
