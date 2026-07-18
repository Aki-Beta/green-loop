// ============================================================
// Green-Loop - Vista Certificados
// ============================================================

function getFactorCalidad(calidad) { return { alta: 1.2, media: 1.0, baja: 0.7 }[calidad] || 1.0; }
function getFactorZona(zona) { return { urbana: 1.0, rural: 1.2, industrial: 1.15, centro_historico: 1.15 }[zona] || 1.0; }

async function renderCertificados(params) {
    const app = document.getElementById('app');
    if (!app) return;

    // Asegurar que Icons esté disponible
    window.Icons = window.Icons || { get: (name) => '' };

    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    const urlParams = new URLSearchParams(params.join('&'));
    const cargaId = urlParams.get('id');

    if (!cargaId) {
        app.innerHTML = `
            <div class="max-w-md mx-auto text-center py-12">
                ${Icons.get('exclamation-triangle')}
                <h2 class="text-xl font-semibold text-gray-800 mb-2">ID de carga requerido</h2>
                <button onclick="navigate('/cargas')" class="btn btn-primary mt-4">
                    ${Icons.get('arrow-left')} Volver a Cargas
                </button>
            </div>
        `;
        return;
    }
    }
    }

    try {
        const [carga, incentivo] = await Promise.all([
            api.cargas.obtener(cargaId, token),
            api.cargas.obtenerIncentivo(cargaId, token)
        ]);
        renderCertificadoHTML(carga, incentivo, cargaId);
    } catch (error) {
        app.innerHTML = `
            <div class="max-w-md mx-auto text-center py-12">
                ${Icons.get('exclamation-triangle')}
                <h2 class="text-xl font-semibold text-gray-800 mb-2">Error cargando certificado</h2>
                <p class="text-gray-600 mb-6">${escapeHtml(error.message)}</p>
                <button onclick="navigate('/cargas')" class="btn btn-primary">Volver</button>
            </div>
        `;
    }
}

function renderCertificadoHTML(carga, incentivo, cargaId) {
    const app = document.getElementById('app');
    const cert = carga.certificado;

    if (!cert) {
app.innerHTML = `
            <div class="max-w-md mx-auto text-center py-12">
                ${Icons.get('file-alt')}
                <h2 class="text-xl font-semibold text-gray-800 mb-2">Certificado no generado</h2>
                <button onclick="navigate('/cargas')" class="btn btn-primary mt-4">Volver</button>
            </div>
        `;
        return;
    }

    app.innerHTML = `
        <div class="max-w-3xl mx-auto">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        ${Icons.get('certificate')} Certificado de Gestión
                    </h1>
                    <p class="text-gray-600 mt-1">Consecutivo: <span class="font-mono font-medium">${cert.consecutivo}</span></p>
                </div>
                <div class="flex gap-3">
                    <button onclick="downloadPDF(${cargaId})" class="btn btn-primary">
                        ${Icons.get('download')} Descargar PDF
                    </button>
                    <button onclick="navigate('/cargas')" class="btn btn-secondary">Volver</button>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="bg-primary-700 text-white p-6">
                    <h2 class="text-xl font-bold">CERTIFICADO DE GESTIÓN DE RESIDUOS SÓLIDOS</h2>
                    <p class="text-primary-100 mt-1">Resolución 2184 de 2019 • Ley 1950 de 2019</p>
                </div>

                <div class="p-6 space-y-5">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-500 uppercase">Fecha Recolección</label>
                            <p class="text-gray-800 font-medium">${formatDate(carga.timestamp)}</p>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 uppercase">Camión</label>
                            <p class="text-gray-800 font-medium">${carga.camion?.placa} <span class="text-gray-500">(${carga.camion?.qr_code})</span></p>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 uppercase">Reciclador</label>
                            <p class="text-gray-800 font-medium">${carga.usuario?.nombre_completo}</p>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 uppercase">Ruta / Municipio</label>
                            <p class="text-gray-800 font-medium">${carga.ruta?.nombre || '-'} / ${carga.ruta?.municipio || '-'}</p>
                        </div>
                    </div>

                    <div class="border-t border-gray-100 pt-4"></div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="bg-gray-50 rounded-lg p-4">
                            <label class="block text-xs font-medium text-gray-500 uppercase">Material</label>
                            <p class="text-gray-800 font-medium capitalize">${carga.tipo_residuo?.nombre}</p>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-4">
                            <label class="block text-xs font-medium text-gray-500 uppercase">Peso</label>
                            <p class="text-gray-800 font-medium">${formatNumber(carga.peso_kg)} kg</p>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-4">
                            <label class="block text-xs font-medium text-gray-500 uppercase">Calidad</label>
                            <p class="text-gray-800 font-medium">${carga.calidad} (${getFactorCalidad(carga.calidad)}x)</p>
                        </div>
                    </div>

                    <div class="bg-primary-50 rounded-lg p-4">
                        <h3 class="text-sm font-semibold text-primary-800 mb-2">Desglose del Incentivo</h3>
                        <p class="text-sm text-primary-700">
                            ${formatNumber(carga.peso_kg)} kg × ${formatCurrency(incentivo.tarifa_base)}/kg × ${getFactorCalidad(carga.calidad)} × ${getFactorZona(carga.zona)}
                            = <span class="font-bold text-lg">${formatCurrency(incentivo.incentivo_total)}</span>
                        </p>
                    </div>

                    <div class="text-center">
                        <h3 class="text-sm font-semibold text-gray-700 mb-3">Código de Verificación</h3>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=VERIFICAR:${cert.hash_verificacion}" alt="QR" class="mx-auto border border-gray-200 rounded-lg p-2">
                        <p class="text-xs text-gray-500 mt-2 font-mono">${cert.hash_verificacion}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function downloadPDF(cargaId) {
    window.open(`http://localhost:5000/api/certificados/${cargaId}/pdf`, '_blank');
    showToast('Iniciando descarga del PDF...', 'success');
}