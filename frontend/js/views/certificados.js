async function renderCertificados() {
    const app = document.getElementById('app');
    if (!app) return;
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    app.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 class="text-3xl font-extrabold text-gray-800">📜 Certificados</h1>
                    <p class="text-gray-500 text-sm mt-1">Garantía legal de aprovechamiento Res. 2184</p>
                </div>
                ${user.rol === 'admin' ? `<button onclick="abrirModalCertificado()" class="btn btn-primary">Emitir Certificado</button>` : ''}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="certificados-grid">
                <p class="text-gray-400 text-sm p-4 col-span-full text-center">Buscando certificados legales...</p>
            </div>
        </div>

        <div id="certificado-modal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 mx-4">
                <h3 class="text-lg font-bold text-gray-900 mb-4">Emitir Certificado Ambiental</h3>
                <form id="certificado-form" class="space-y-4">
                    <div>
                        <label class="form-label">Empresa Beneficiaria</label>
                        <select id="cert_empresa" required class="form-input">
                            <option value="">Selecciona una empresa...</option>
                        </select>
                    </div>
                    <p class="text-xs text-gray-500">
                        Se certificará la carga sin procesar más antigua disponible en el sistema.
                    </p>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" onclick="cerrarModalCertificado()" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Emitir Certificado</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    await loadCertificadosList(token);
    setupCertificadoEvents(token);
}

async function loadCertificadosList(token) {
    const grid = document.getElementById('certificados-grid');
    if (!grid) return;
    try {
        const certificados = await api.certificados.listar(token);
        if (!certificados.length) {
            grid.innerHTML = '<p class="text-gray-400 text-sm p-4 col-span-full text-center">Sin certificados en este periodo.</p>';
            return;
        }
        grid.innerHTML = certificados.map(c => `
            <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-start">
                        <span class="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md">Oficial</span>
                        <span class="text-xs font-mono text-gray-400">#${c.radicado || c.id}</span>
                    </div>
                    <h4 class="text-base font-bold text-gray-800 mt-4">${c.empresa_nombre || c.empresaEmail || 'Empresa'}</h4>
                </div>
                <div class="border-t border-gray-50 pt-4 mt-6 flex items-center justify-between">
                    <span class="text-xs text-gray-400">${formatDate(c.fecha_emision || new Date())}</span>
                    <button onclick="verificarCertificadoEnCadena('${c.hash_verificacion}')" class="text-xs font-semibold text-blue-600 hover:underline">Verificar</button>
                </div>
            </div>
        `).join('');
    } catch (err) { grid.innerHTML = `<p class="text-red-500 text-sm p-4 col-span-full text-center">Error: ${err.message}</p>`; }
}

async function abrirModalCertificado() {
    const token = localStorage.getItem('token');
    const select = document.getElementById('cert_empresa');
    try {
        const empresas = await api.catalogos.empresas(token);
        select.innerHTML =
            '<option value="">Selecciona una empresa...</option>' +
            empresas.map(e => `<option value="${e.email}">${e.razon_social}</option>`).join('');
    } catch (err) {
        showToast('No se pudieron cargar las empresas', 'error');
    }
    document.getElementById('certificado-modal')?.classList.replace('hidden', 'flex');
}

function cerrarModalCertificado() {
    document.getElementById('certificado-modal')?.classList.replace('flex', 'hidden');
}

function setupCertificadoEvents(token) {
    document.getElementById('certificado-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const empresaEmail = document.getElementById('cert_empresa').value;
        if (!empresaEmail) { showToast('Selecciona una empresa', 'warning'); return; }
        try {
            await api.certificados.crear({ empresa_email: empresaEmail }, token);
            showToast('Certificado firmado digitalmente', 'success');
            cerrarModalCertificado();
            await loadCertificadosList(token);
        } catch (err) { showToast(err.message, 'error'); }
    });
}

async function verificarCertificadoEnCadena(hash) {
    try {
        const res = await api.certificados.verificar(hash);
        alert(`🔒 Válido\nEstado: ${res.status || 'Auténtico'}`);
    } catch { alert("❌ Hash no concuerda con registros."); }
}

window.renderCertificados = renderCertificados;
window.abrirModalCertificado = abrirModalCertificado;
window.cerrarModalCertificado = cerrarModalCertificado;
window.verificarCertificadoEnCadena = verificarCertificadoEnCadena;
