let camionEscaneado = null;

async function renderCargas() {
    const app = document.getElementById('app');
    if (!app) return;
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    app.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 class="text-3xl font-extrabold text-gray-800">📋 Bitácora de Cargas</h1>
                    <p class="text-gray-500 text-sm mt-1">Control de pesajes físicos ingresados al sistema</p>
                </div>
                ${user.rol === 'reciclador' ? `
                    <div class="flex gap-2">
                        <button onclick="abrirModalCarga()" class="btn btn-primary">Nueva Carga</button>
                        <button onclick="escanearQR()" class="btn btn-dark">Escanear QR del Camión</button>
                    </div>
                ` : ''}
            </div>
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider">
                        <tr><th class="p-4">ID</th><th class="p-4">Empresa Origen</th><th class="p-4">Tipo Residuo</th><th class="p-4 text-right">Peso</th><th class="p-4 text-center">Estado</th></tr>
                    </thead>
                    <tbody id="cargas-tbody" class="divide-y divide-gray-100">
                        <tr><td colspan="5" class="p-4 text-center text-gray-400">Cargando registros...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div id="carga-modal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 mx-4">
                <h3 class="text-lg font-bold text-gray-900 mb-4">Registrar Entrega de Residuos</h3>
                <div id="carga-camion-info" class="hidden mb-4 p-3 rounded-md" style="background:rgba(16,185,129,0.12);border:1px solid #10b981;">
                    <p class="text-xs text-green-600 font-bold">🚚 CAMIÓN ESCANEADO</p>
                    <p id="carga-camion-texto" class="text-sm text-gray-800 font-semibold"></p>
                </div>
                <form id="carga-form" class="space-y-4">
                    <div>
                        <label class="form-label">Tipo de Residuo</label>
                        <select id="carga_residuo" class="form-input">
                            <option value="plastico">Plástico (Aprovechable)</option>
                            <option value="carton">Cartón / Papel</option>
                            <option value="vidrio">Vidrio</option>
                            <option value="organico">Orgánico Biodegradable</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Peso Reportado (Kg)</label>
                        <input type="number" step="0.1" id="carga_peso" required class="form-input">
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" onclick="cerrarModalCarga()" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Carga</button>
                    </div>
                </form>
            </div>
        </div>

        <div id="qr-modal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 mx-4 text-center">
                <h3 class="text-lg font-bold text-gray-900 mb-2">📷 Escanear QR del Camión</h3>
                <p class="text-xs text-gray-500 mb-4">Pídele al admin el código QR impreso del camión</p>
                <video id="qr-video" class="w-full rounded-md mb-4" style="display:none;background:#000;"></video>
                <p id="qr-status" class="text-sm text-gray-500 mb-4"></p>
                <button type="button" onclick="cerrarModalQR()" class="btn btn-secondary w-full">Cancelar</button>
            </div>
        </div>
    `;
    await loadCargasList(token);
    setupCargaEvents(token);
}

async function loadCargasList(token) {
    const tbody = document.getElementById('cargas-tbody');
    if (!tbody) return;
    try {
        const cargas = await api.cargas.listar(token);
        tbody.innerHTML = cargas.map(c => `
            <tr class="hover:bg-gray-50/50">
                <td class="p-4 font-mono text-xs text-blue-600 font-bold">#${c.id_carga || c.id}</td>
                <td class="p-4 text-gray-700">${c.empresa_email || 'Particular / Ruta'}</td>
                <td class="p-4 capitalize"><span class="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs">${c.tipo_residuo || 'Materia'}</span></td>
                <td class="p-4 text-right font-bold text-gray-900">${formatNumber(c.peso_kg || c.peso || 0)} kg</td>
                <td class="p-4 text-center"><span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Procesado</span></td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="p-4 text-center text-gray-400">No se encontraron cargas.</td></tr>';
    } catch (err) { tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Error: ${err.message}</td></tr>`; }
}

function setupCargaEvents(token) {
    document.getElementById('carga-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            tipo_residuo: document.getElementById('carga_residuo').value,
            peso_kg: parseFloat(document.getElementById('carga_peso').value),
        };
        if (camionEscaneado) data.id_camion = camionEscaneado.id_camion;
        try {
            await api.cargas.crear(data, token);
            showToast('Carga guardada con éxito', 'success');
            cerrarModalCarga();
            await loadCargasList(token);
        } catch (err) { showToast(err.message, 'error'); }
    });
}

// ============================================================
// ESCANEO DE QR
// Intenta usar la cámara (BarcodeDetector) si el navegador la
// soporta; si no (ej. Firefox no lo soporta hoy), cae a pedir el
// código a mano. En ambos casos se valida contra un camión REAL
// creado por el admin — ya no es una simulación.
// ============================================================
async function escanearQR() {
    document.getElementById('qr-modal')?.classList.replace('hidden', 'flex');
    const statusEl = document.getElementById('qr-status');
    const videoEl = document.getElementById('qr-video');

    if ('BarcodeDetector' in window) {
        try {
            await iniciarEscaneoConCamara(videoEl, statusEl);
            return;
        } catch (err) {
            console.warn('No se pudo usar la cámara, usando entrada manual:', err);
        }
    }

    statusEl.textContent = 'Tu navegador no soporta escaneo por cámara. Escribe el código manualmente.';
    cerrarModalQR();
    const codigo = prompt('Código QR del camión (ej: CAMION-A1B2C3D4):');
    if (!codigo) return;
    await procesarCodigoQR(codigo.trim());
}

async function iniciarEscaneoConCamara(videoEl, statusEl) {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    videoEl.srcObject = stream;
    videoEl.style.display = 'block';
    await videoEl.play();
    statusEl.textContent = 'Apunta la cámara al código QR...';

    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const intervalo = setInterval(async () => {
        try {
            const codigos = await detector.detect(videoEl);
            if (codigos.length > 0) {
                clearInterval(intervalo);
                stream.getTracks().forEach(t => t.stop());
                cerrarModalQR();
                await procesarCodigoQR(codigos[0].rawValue);
            }
        } catch { /* seguir intentando */ }
    }, 500);

    // Si cierran el modal manualmente, detener la cámara
    document.getElementById('qr-modal')?.addEventListener('click', function stopOnClose(e) {
        if (e.target.id === 'qr-modal') {
            clearInterval(intervalo);
            stream.getTracks().forEach(t => t.stop());
            this.removeEventListener('click', stopOnClose);
        }
    });
}

async function procesarCodigoQR(codigo) {
    const token = localStorage.getItem('token');
    try {
        const camion = await api.cargas.verificarQR(codigo, token);
        camionEscaneado = camion;
        showToast(`Camión ${camion.placa} verificado ✅`, 'success');
        const infoBox = document.getElementById('carga-camion-info');
        const infoTexto = document.getElementById('carga-camion-texto');
        if (infoBox && infoTexto) {
            infoTexto.textContent = `${camion.placa} — Ruta: ${camion.ruta_nombre || 'N/A'}`;
            infoBox.classList.remove('hidden');
        }
        abrirModalCarga();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function abrirModalCarga() { document.getElementById('carga-modal')?.classList.replace('hidden', 'flex'); }
function cerrarModalCarga() {
    document.getElementById('carga-modal')?.classList.replace('flex', 'hidden');
    document.getElementById('carga-camion-info')?.classList.add('hidden');
    camionEscaneado = null;
}
function cerrarModalQR() {
    document.getElementById('qr-modal')?.classList.replace('flex', 'hidden');
    const videoEl = document.getElementById('qr-video');
    if (videoEl) { videoEl.style.display = 'none'; videoEl.srcObject = null; }
}

window.renderCargas = renderCargas;
window.abrirModalCarga = abrirModalCarga;
window.cerrarModalCarga = cerrarModalCarga;
window.cerrarModalQR = cerrarModalQR;
window.escanearQR = escanearQR;
