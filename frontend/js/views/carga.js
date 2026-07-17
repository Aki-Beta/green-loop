// frontend/js/views/carga.js - Vista formulario Registrar Carga

let tiposResiduoCache = [];

async function renderCarga() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
        <div class="max-w-2xl mx-auto">
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <i class="fas fa-qrcode text-primary-600"></i> Registrar Nueva Carga
                </h1>
                <p class="text-gray-600 mt-1">Escanee el QR del camión y complete la información</p>
            </div>

            <form id="carga-form" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6" novalidate>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Código QR del Camión <span class="text-red-500">*</span></label>
                    <input type="text" id="qr_code" name="qr_code" required autocomplete="off"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                           placeholder="Ej: QR-CAM-001" list="qr-suggestions">
                    <datalist id="qr-suggestions"></datalist>
                    <p class="text-xs text-gray-500 mt-1" id="peso-help">Ingrese el código QR del camión (simula escáner)</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Peso (kg) <span class="text-red-500">*</span></label>
                    <input type="number" id="peso_kg" name="peso_kg" required step="0.01" min="0.01"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                           placeholder="Ej: 1250.50">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Residuo <span class="text-red-500">*</span></label>
                    <select id="tipo_residuo_id" name="tipo_residuo_id" required
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white">
                        <option value="">Cargando...</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Calidad del Material <span class="text-red-500">*</span></label>
                    <div class="flex gap-3">
                        <label class="flex-1 border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary-300 hover:bg-primary-50 transition text-center" onclick="selectQuality(this, 'A')">
                            <input type="radio" name="calidad" value="A" class="sr-only" required>
                            <div class="font-semibold text-gray-800">A - Excelente</div>
                            <div class="text-sm text-gray-500 mt-1">Factor 1.2x</div>
                        </label>
                        <label class="flex-1 border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary-300 hover:bg-primary-50 transition text-center" onclick="selectQuality(this, 'B')">
                            <input type="radio" name="calidad" value="B" class="sr-only" checked>
                            <div class="font-semibold text-gray-800">B - Bueno</div>
                            <div class="text-sm text-gray-500 mt-1">Factor 1.0x</div>
                        </label>
                        <label class="flex-1 border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary-300 hover:bg-primary-50 transition text-center" onclick="selectQuality(this, 'C')">
                            <input type="radio" name="calidad" value="C" class="sr-only">
                            <div class="font-semibold text-gray-800">C - Regular</div>
                            <div class="text-sm text-gray-500 mt-1">Factor 0.7x</div>
                        </label>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Zona de Recolección <span class="text-red-500">*</span></label>
                    <select id="zona" name="zona" required
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white">
                        <option value="">Seleccione zona</option>
                        <option value="urbana">Urbana (Factor 1.0x)</option>
                        <option value="rural">Rural (Factor 1.3x)</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Reciclador Responsable <span class="text-red-500">*</span></label>
                    <select id="usuario_id" name="usuario_id" required
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white">
                        <option value="">Cargando...</option>
                    </select>
                </div>

                <div id="incentivo-preview" class="hidden bg-primary-50 border border-primary-200 rounded-lg p-4">
                    <div class="flex items-center justify-between">
                        <span class="font-medium text-primary-800">Incentivo Estimado:</span>
                        <span id="incentivo-value" class="text-2xl font-bold text-primary-700">$0 COP</span>
                    </div>
                    <p class="text-sm text-primary-600 mt-1">Cálculo: Peso × Tarifa × Factor Calidad × Factor Zona</p>
                </div>

                <div class="flex gap-4 pt-4 border-t border-gray-100">
                    <button type="submit" id="btn-submit" class="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-lg font-medium transition flex items-center justify-center gap-2">
                        <i class="fas fa-save"></i> Registrar Carga y Generar Certificado
                    </button>
                    <button type="button" onclick="navigate('/')" class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;

    await loadFormData();
    setupFormListeners();
}

async function loadFormData() {
    try {
        const [tipos, usuarios, camiones] = await Promise.all([
            api.catalogos.getTiposResiduo(),
            api.catalogos.getUsuarios(),
            api.catalogos.getCamiones()
        ]);
        tiposResiduoCache = tipos;

        document.getElementById('tipo_residuo_id').innerHTML =
            '<option value="">Seleccione material</option>' +
            tipos.map(t => `<option value="${t.id}">${t.nombre.capitalize()} ($${formatNumber(t.tarifa_base)}/kg)</option>`).join('');

        document.getElementById('usuario_id').innerHTML =
            '<option value="">Seleccione reciclador</option>' +
            usuarios.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('');

        document.getElementById('qr-suggestions').innerHTML =
            camiones.map(c => `<option value="${c.qr_code}">${c.qr_code} (${c.placa})</option>`).join('');

    } catch (error) {
        console.error('Error cargando datos formulario:', error);
        showToast('Error cargando catálogos: ' + error.message, 'error');
    }
}

function setupFormListeners() {
    const form = document.getElementById('carga-form');

    ['peso_kg', 'tipo_residuo_id', 'zona'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculatePreview);
        document.getElementById(id)?.addEventListener('change', calculatePreview);
    });
    document.querySelectorAll('input[name="calidad"]').forEach(r => r.addEventListener('change', calculatePreview));

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const btn = document.getElementById('btn-submit');
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

        const formData = new FormData(form);
        const data = {
            qr_code: formData.get('qr_code').trim(),
            peso_kg: parseFloat(formData.get('peso_kg')),
            tipo_residuo_id: parseInt(formData.get('tipo_residuo_id')),
            calidad: formData.get('calidad'),
            zona: formData.get('zona'),
            usuario_id: parseInt(formData.get('usuario_id'))
        };

        const errors = validateFormData(data);
        if (errors.length) {
            showToast(errors[0], 'error');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            return;
        }

        try {
            const result = await api.cargas.crear(data);
            showToast('¡Carga registrada! Certificado generado automáticamente.', 'success');
            setTimeout(() => navigate(`/certificado?id=${result.carga_id}`), 1200);
        } catch (error) {
            showToast(error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    });
}

async function calculatePreview() {
    const peso = parseFloat(document.getElementById('peso_kg').value) || 0;
    const tipoId = document.getElementById('tipo_residuo_id').value;
    const calidad = document.querySelector('input[name="calidad"]:checked')?.value;
    const zona = document.getElementById('zona').value;

    const preview = document.getElementById('incentivo-preview');
    const valueEl = document.getElementById('incentivo-value');

    if (peso > 0 && tipoId && calidad && zona) {
        const tipo = tiposResiduoCache.find(t => t.id == tipoId);
        if (tipo) {
            const factoresCalidad = { A: 1.2, B: 1.0, C: 0.7 };
            const factoresZona = { urbana: 1.0, rural: 1.3 };
            const incentivo = peso * tipo.tarifa_base * factoresCalidad[calidad] * factoresZona[zona];
            valueEl.textContent = formatCurrency(incentivo);
            preview.classList.remove('hidden');
            return;
        }
    }
    preview.classList.add('hidden');
}

function validateFormData(data) {
    const errors = [];
    if (!data.qr_code) errors.push('Código QR es obligatorio');
    if (!data.peso_kg || data.peso_kg <= 0) errors.push('Peso debe ser mayor a 0');
    if (!data.tipo_residuo_id) errors.push('Seleccione tipo de residuo');
    if (!data.calidad) errors.push('Seleccione calidad');
    if (!data.zona) errors.push('Seleccione zona');
    if (!data.usuario_id) errors.push('Seleccione reciclador');
    return errors;
}

function selectQuality(labelEl, value) {
    document.querySelectorAll('input[name="calidad"]').forEach(r => { r.checked = r.value === value; });
    document.querySelectorAll('[onclick^="selectQuality"]').forEach(l => {
        l.classList.remove('border-primary-500', 'bg-primary-50', 'ring-2', 'ring-primary-200');
        l.classList.add('border-gray-200');
    });
    labelEl.classList.add('border-primary-500', 'bg-primary-50', 'ring-2', 'ring-primary-200');
    labelEl.classList.remove('border-gray-200');
    calculatePreview();
}