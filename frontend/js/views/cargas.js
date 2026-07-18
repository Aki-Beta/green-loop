// ============================================================
// Green-Loop - Vista Cargas (Registro y Listado)
// ============================================================

const CargasState = {
    currentPage: 1,
    perPage: 10,
    currentFilters: {},
    catalogoCache: {}
};

async function renderCargas() {
    const app = document.getElementById('app');
    if (!app) return;

    // Asegurar que Icons esté disponible
    window.Icons = window.Icons || { get: (name) => '' };

    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    app.innerHTML = getCargasHTML();
    await loadCatalogos(token);
    setupEventListeners(token);
    await loadCargasList(token);
}

function getCargasHTML() {
    return `
        <div class="max-w-7xl mx-auto">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 class="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        ${Icons.get('boxes')} Gestión de Cargas
                    </h1>
                    <p class="text-gray-600 mt-1">Registre y consulte las cargas de residuos recolectados</p>
                </div>
                <button onclick="showCreateModal()" class="btn btn-primary">
                    ${Icons.get('plus-circle')} Nueva Carga
                </button>
            </div>

            <!-- Filtros -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6" id="filtros-form">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label class="form-label">Fecha Inicio</label>
                        <input type="date" id="filtro_fecha_inicio" class="form-input">
                    </div>
                    <div>
                        <label class="form-label">Fecha Fin</label>
                        <input type="date" id="filtro_fecha_fin" class="form-input">
                    </div>
                    <div>
                        <label class="form-label">Residuo</label>
                        <select id="filtro_residuo" class="form-input">
                            <option value="">Todos</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Zona</label>
                        <select id="filtro_zona" class="form-input">
                            <option value="">Todas</option>
                        </select>
                    </div>
                    <div class="flex items-end">
                        <button onclick="aplicarFiltros()" class="btn btn-primary w-full">
                            ${Icons.get('filter')} Filtrar
                        </button>
                    </div>
                </div>
            </div>

            <!-- Lista -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="overflow-x-auto" id="cargas-table-container">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                                <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Camión</th>
                                <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Residuo</th>
                                <th class="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Peso (kg)</th>
                                <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Calidad</th>
                                <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Zona</th>
                                <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reciclador</th>
                                <th class="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100" id="cargas-tbody">
                            <tr><td colspan="8" class="p-8 text-center"><div class="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent mx-auto"></div></td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- Paginación -->
                <div class="p-5 border-t border-gray-100 flex justify-between items-center">
                    <span class="text-sm text-gray-500" id="pagination-info"></span>
                    <div class="flex gap-2">
                        <button id="btn-prev" class="btn btn-secondary text-sm" disabled>${Icons.get('chevron-left')}</button>
                        <button id="btn-next" class="btn btn-secondary text-sm" disabled>${Icons.get('chevron-right')}</button>
                    </div>
                </div>
            </div>

            <!-- Exportar -->
            <div class="mt-4 flex justify-end">
                <button onclick="exportarCSV()" class="btn btn-success">
                    ${Icons.get('file-csv')} Exportar CSV
                </button>
            </div>
        </div>

        <!-- Modal Crear/Editar -->
        <div id="carga-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50" onclick="closeModal('carga-modal')">
            <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                <div class="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-semibold text-gray-800 flex items-center gap-2" id="modal-title">
                        ${Icons.get('plus-circle')} Nueva Carga
                    </h3>
                    <button onclick="closeModal('carga-modal')" class="text-gray-400 hover:text-gray-600">${Icons.get('times')}</button>
                </div>
                <form id="carga-form" class="p-5 space-y-5" novalidate>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label class="form-label">Código QR Camión <span class="text-red-500">*</span></label>
                            <input type="text" id="qr_code" name="qr_code" required autocomplete="off"
                                   class="form-input" placeholder="Ej: CAMION-ZONA_NORTE-01" list="qr-suggestions">
                            <datalist id="qr-suggestions"></datalist>
                        </div>
                        <div>
                            <label class="form-label">Peso (kg) <span class="text-red-500">*</span></label>
                            <input type="number" id="peso_kg" name="peso_kg" required step="0.01" min="0.01"
                                   class="form-input" placeholder="Ej: 1250.50">
                        </div>
                    </div>

                    <div>
                        <label class="form-label">Tipo de Residuo <span class="text-red-500">*</span></label>
                        <select id="tipo_residuo_id" name="tipo_residuo_id" required class="form-input">
                            <option value="">Cargando...</option>
                        </select>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label class="form-label">Calidad <span class="text-red-500">*</span></label>
                            <select id="calidad" name="calidad" required class="form-input">
                                <option value="alta">Alta (1.2x)</option>
                                <option value="media" selected>Media (1.0x)</option>
                                <option value="baja">Baja (0.7x)</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Zona <span class="text-red-500">*</span></label>
                            <select id="zona_id" name="zona_id" required class="form-input">
                                <option value="">Cargando...</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Ruta <span class="text-red-500">*</span></label>
                            <select id="ruta_id" name="ruta_id" required class="form-input">
                                <option value="">Cargando...</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="form-label">Observaciones</label>
                        <textarea id="observaciones" name="observaciones" rows="2" class="form-input"></textarea>
                    </div>

                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onclick="closeModal('carga-modal')" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">
                            ${Icons.get('save')} Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

async function loadCatalogos(token) {
    try {
        const [residuos, zonas, rutas, camiones] = await Promise.all([
            api.catalogos.getResiduos(token),
            api.catalogos.getZonas(token),
            api.catalogos.getRutas(token),
            api.catalogos.getCamiones(token)
        ]);

        CargasState.catalogoCache = { residuos, zonas, rutas, camiones };

        const residuoSelect = document.getElementById('tipo_residuo_id');
        if (residuoSelect) {
            residuoSelect.innerHTML = '<option value="">Seleccionar residuo</option>' +
                residuos.map(r => `<option value="${r.id}" data-precio="${r.precio_base_kg}">${r.nombre} (${r.codigo}) - $${formatNumber(r.precio_base_kg)}/kg</option>`).join('');
        }

        const zonaSelect = document.getElementById('zona_id');
        if (zonaSelect) {
            zonaSelect.innerHTML = '<option value="">Seleccionar zona</option>' +
                zonas.map(z => `<option value="${z.id}" data-mult="${z.multiplicador}">${z.nombre} (${z.multiplicador}x)</option>`).join('');
        }

        const rutaSelect = document.getElementById('ruta_id');
        if (rutaSelect) {
            rutaSelect.innerHTML = '<option value="">Seleccionar ruta</option>' +
                rutas.map(r => `<option value="${r.id}" data-zona="${r.id_zona}">${r.codigo} - ${r.nombre}</option>`).join('');
        }

        const qrSuggestions = document.getElementById('qr-suggestions');
        if (qrSuggestions) {
            qrSuggestions.innerHTML = camiones.map(c => `<option value="${c.qr_code}">${c.placa} - ${c.qr_code}</option>`).join('');
        }

        const filtroResiduo = document.getElementById('filtro_residuo');
        if (filtroResiduo) {
            filtroResiduo.innerHTML = '<option value="">Todos</option>' +
                residuos.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('');
        }

        const filtroZona = document.getElementById('filtro_zona');
        if (filtroZona) {
            filtroZona.innerHTML = '<option value="">Todas</option>' +
                zonas.map(z => `<option value="${z.id}">${z.nombre}</option>`).join('');
        }
    } catch (error) {
        showToast('Error cargando catálogos: ' + error.message, 'error');
    }
}

function setupEventListeners(token) {
    const form = document.getElementById('carga-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitCarga(form, token);
        });
    }

    const filtroForm = document.getElementById('filtros-form');
    if (filtroForm) {
        filtroForm.addEventListener('submit', (e) => {
            e.preventDefault();
            aplicarFiltros();
        });
    }

    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    if (btnPrev) btnPrev.addEventListener('click', () => changePage(-1));
    if (btnNext) btnNext.addEventListener('click', () => changePage(1));

    document.getElementById('qr_code')?.addEventListener('input', async (e) => {
        const qr = e.target.value.trim().toUpperCase();
        if (qr.length >= 5) {
            try {
                const info = await api.cargas.simularQR({ qr_code: qr }, token);
                if (info.ruta) {
                    document.getElementById('ruta_id').value = info.ruta.id;
                    document.getElementById('zona_id').value = info.zona?.id || '';
                    showToast('Info cargada: ' + info.camion.placa, 'success');
                }
            } catch (err) {
                // QR no encontrado, ignorar
            }
        }
    });
}

async function submitCarga(form, token) {
    const btn = form.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = Icons.get('spinner') + ' Guardando...';

    const formData = new FormData(form);
    const data = {
        codigo_qr: formData.get('qr_code').trim().toUpperCase(),
        peso_kg: parseFloat(formData.get('peso_kg')),
        calidad: formData.get('calidad'),
        observaciones: formData.get('observaciones') || '',
        id_residuo: parseInt(formData.get('tipo_residuo_id')),
        id_ruta: parseInt(formData.get('ruta_id')),
        id_zona: parseInt(formData.get('zona_id'))
    };

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    data.id_reciclador = user.id_usuario;

    try {
        await api.cargas.crear(data, token);
        showToast('Carga registrada correctamente', 'success');
        closeModal('carga-modal');
        form.reset();
        await loadCargasList(token);
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

async function loadCargasList(token) {
    const tbody = document.getElementById('cargas-tbody');
    if (!tbody) return;

    const params = new URLSearchParams({
        page: CargasState.currentPage,
        per_page: CargasState.perPage
    });

    if (CargasState.currentFilters.fecha_inicio) params.append('fecha_inicio', CargasState.currentFilters.fecha_inicio);
    if (CargasState.currentFilters.fecha_fin) params.append('fecha_fin', CargasState.currentFilters.fecha_fin);
    if (CargasState.currentFilters.id_residuo) params.append('id_residuo', CargasState.currentFilters.id_residuo);
    if (CargasState.currentFilters.id_zona) params.append('id_zona', CargasState.currentFilters.id_zona);

    try {
        const response = await api.cargas.listar(token, params.toString());
        const cargas = response.cargas || response;

        tbody.innerHTML = cargas.map(c => `
            <tr class="hover:bg-gray-50">
                <td class="px-5 py-4">${formatDate(c.fecha_recoleccion, { hour: '2-digit', minute: '2-digit' })}</td>
                <td class="px-5 py-4">${c.codigo_qr}</td>
                <td class="px-5 py-4">${c.residuo_nombre}</td>
                <td class="px-5 py-4 text-right font-mono">${formatNumber(c.peso_kg)}</td>
                <td class="px-5 py-4">
                    <span class="px-2 py-1 rounded text-xs font-medium ${getCalidadClass(c.calidad)}">
                        ${c.calidad.charAt(0).toUpperCase() + c.calidad.slice(1)}
                    </span>
                </td>
                <td class="px-5 py-4">${c.zona_nombre || '-'}</td>
                <td class="px-5 py-4">${c.reciclador_nombre}</td>
                <td class="px-5 py-4 text-center">
                    <button onclick="verDetalleCarga(${c.id_carga})" class="text-primary-600 hover:underline text-sm">Ver</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="8" class="p-8 text-center text-gray-500">No hay cargas registradas</td></tr>';

        updatePagination(response.total || cargas.length);
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-500">Error: ${error.message}</td></tr>`;
    }
}

function getCalidadClass(calidad) {
    switch (calidad) {
        case 'alta': return 'bg-green-100 text-green-800';
        case 'media': return 'bg-yellow-100 text-yellow-800';
        case 'baja': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function aplicarFiltros() {
    CargasState.currentFilters = {
        fecha_inicio: document.getElementById('filtro_fecha_inicio')?.value || '',
        fecha_fin: document.getElementById('filtro_fecha_fin')?.value || '',
        id_residuo: document.getElementById('filtro_residuo')?.value || '',
        id_zona: document.getElementById('filtro_zona')?.value || ''
    };
    CargasState.currentPage = 1;
    const token = localStorage.getItem('token');
    loadCargasList(token);
}

function changePage(delta) {
    CargasState.currentPage += delta;
    const token = localStorage.getItem('token');
    loadCargasList(token);
}

function updatePagination(total) {
    const totalPages = Math.ceil(total / CargasState.perPage);
    const info = document.getElementById('pagination-info');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    if (info) info.textContent = `Página ${CargasState.currentPage} de ${totalPages} (${total} total)`;
    if (btnPrev) btnPrev.disabled = CargasState.currentPage <= 1;
    if (btnNext) btnNext.disabled = CargasState.currentPage >= totalPages;
}

function showCreateModal() {
    const form = document.getElementById('carga-form');
    if (form) form.reset();
    document.getElementById('modal-title').innerHTML = Icons.get('plus-circle') + ' Nueva Carga';
    document.getElementById('carga-modal').classList.remove('hidden');
    document.getElementById('carga-modal').classList.add('flex');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.getElementById(id).classList.remove('flex');
}

function exportarCSV() {
    const token = localStorage.getItem('token');
    api.cargas.exportarCSV(token).then(blob => {
        downloadBlob(blob, `cargas-${new Date().toISOString().split('T')[0]}.csv`);
    }).catch(err => showToast('Error exportando: ' + err.message, 'error'));
}

function verDetalleCarga(id) {
    showToast('Función en desarrollo', 'info');
}
