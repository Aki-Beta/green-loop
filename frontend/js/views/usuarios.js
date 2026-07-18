
const UsuariosState = {
    currentPage: 1,
    perPage: 10,
    currentFilters: {}
};

async function renderUsuarios() {
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

    app.innerHTML = getUsuariosHTML();
    setupEventListeners(token);
    await loadUsuariosList(token);
}

function getUsuariosHTML() {
    return `
        <div class="max-w-7xl mx-auto">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 class="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        ${Icons.get('users')} Gestión de Usuarios
                    </h1>
                    <p class="text-gray-600 mt-1">Administre usuarios, roles y asignaciones</p>
                </div>
                <button onclick="showUsuarioModal()" class="btn btn-primary">
                    ${Icons.get('plus-circle')} Nuevo Usuario
                </button>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
                <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                        <label class="form-label">Buscar</label>
                        <input type="text" id="filtro_busqueda" class="form-input" placeholder="Documento, nombre, email...">
                    </div>
                    <div>
                        <label class="form-label">Rol</label>
                        <select id="filtro_rol" class="form-input">
                            <option value="">Todos</option>
                            <option value="admin">Admin</option>
                            <option value="reciclador">Reciclador</option>
                            <option value="empresa">Empresa</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Estado</label>
                        <select id="filtro_estado" class="form-input">
                            <option value="">Todos</option>
                            <option value="true">Activos</option>
                            <option value="false">Inactivos</option>
                        </select>
                    </div>
                    <div class="flex items-end">
                        <button onclick="aplicarFiltrosUsuarios()" class="btn btn-primary w-full">
                            ${Icons.get('filter')} Filtrar
                        </button>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="overflow-x-auto" id="usuarios-table-container">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Documento</th>
                                <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                                <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                                <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rol</th>
                                <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ruta / Empresa</th>
                                <th class="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Estado</th>
                                <th class="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100" id="usuarios-tbody">
                            <tr><td colspan="7" class="p-8 text-center"><div class="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent mx-auto"></div></td></tr>
                        </tbody>
                    </table>
                </div>

                <div class="p-5 border-t border-gray-100 flex justify-between items-center">
                    <span class="text-sm text-gray-500" id="pagination-info"></span>
                    <div class="flex gap-2">
                        <button id="btn-prev" class="btn btn-secondary text-sm" disabled>${Icons.get('chevron-left')}</button>
                        <button id="btn-next" class="btn btn-secondary text-sm" disabled>${Icons.get('chevron-right')}</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Usuario -->
        <div id="usuario-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50" onclick="closeModal('usuario-modal')">
            <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                <div class="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-semibold text-gray-800 flex items-center gap-2" id="usuario-modal-title">
                        ${Icons.get('user-plus')} Nuevo Usuario
                    </h3>
                    <button onclick="closeModal('usuario-modal')" class="text-gray-400 hover:text-gray-600">${Icons.get('times')}</button>
                </div>
                <form id="usuario-form" class="p-5 space-y-5" novalidate>
                    <input type="hidden" id="usuario_id" name="usuario_id">

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label class="form-label">Documento <span class="text-red-500">*</span></label>
                            <input type="text" id="documento" name="documento" required class="form-input" placeholder="Ej: 1000000000">
                        </div>
                        <div>
                            <label class="form-label">Nombre Completo <span class="text-red-500">*</span></label>
                            <input type="text" id="nombre_completo" name="nombre_completo" required class="form-input" placeholder="Juan Pérez">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label class="form-label">Email <span class="text-red-500">*</span></label>
                            <input type="email" id="email" name="email" required class="form-input" placeholder="juan@email.com">
                        </div>
                        <div>
                            <label class="form-label">Teléfono</label>
                            <input type="text" id="telefono" name="telefono" class="form-input" placeholder="3001234567">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label class="form-label">Rol <span class="text-red-500">*</span></label>
                            <select id="rol" name="rol" required class="form-input">
                                <option value="reciclador">Reciclador</option>
                                <option value="empresa">Empresa</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Ruta Asignada</label>
                            <select id="id_ruta_asignada" name="id_ruta_asignada" class="form-input">
                                <option value="">Sin asignar</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Empresa</label>
                            <select id="id_empresa" name="id_empresa" class="form-input">
                                <option value="">Sin asignar</option>
                            </select>
                        </div>
                    </div>

                    <div id="password-field">
                        <label class="form-label">Contraseña <span class="text-red-500">*</span></label>
                        <input type="password" id="password" name="password" minlength="6" class="form-input" placeholder="Mínimo 6 caracteres">
                    </div>

                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onclick="closeModal('usuario-modal')" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">
                            ${Icons.get('save')} Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function setupEventListeners(token) {
    const form = document.getElementById('usuario-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitUsuario(form, token);
        });
    }

    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    if (btnPrev) btnPrev.addEventListener('click', () => changePageUsuarios(-1));
    if (btnNext) btnNext.addEventListener('click', () => changePageUsuarios(1));

    const filtroBusqueda = document.getElementById('filtro_busqueda');
    if (filtroBusqueda) {
        filtroBusqueda.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') aplicarFiltrosUsuarios();
        });
    }
}

async function submitUsuario(form, token) {
    const btn = form.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = Icons.get('spinner') + ' Guardando...';

    const formData = new FormData(form);
    const data = {
        documento: formData.get('documento').trim(),
        nombre_completo: formData.get('nombre_completo').trim(),
        email: formData.get('email').trim() || null,
        telefono: formData.get('telefono').trim() || null,
        rol: formData.get('rol'),
        id_ruta_asignada: formData.get('id_ruta_asignada') ? parseInt(formData.get('id_ruta_asignada')) : null,
        id_empresa: formData.get('id_empresa') ? parseInt(formData.get('id_empresa')) : null
    };

    const password = formData.get('password');
    if (password) data.password = password;

    const id = formData.get('usuario_id');
    const isEdit = id && !isNaN(parseInt(id));

    try {
        if (isEdit) {
            await api.usuarios.actualizar(parseInt(id), data, token);
            showToast('Usuario actualizado', 'success');
        } else {
            await api.usuarios.crear(data, token);
            showToast('Usuario creado', 'success');
        }
        closeModal('usuario-modal');
        form.reset();
        await loadUsuariosList(token);
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

async function loadUsuariosList(token) {
    const tbody = document.getElementById('usuarios-tbody');
    if (!tbody) return;

    const params = new URLSearchParams({
        page: UsuariosState.currentPage,
        per_page: UsuariosState.perPage
    });

    if (UsuariosState.currentFilters.busqueda) params.append('busqueda', UsuariosState.currentFilters.busqueda);
    if (UsuariosState.currentFilters.rol) params.append('rol', UsuariosState.currentFilters.rol);
    if (UsuariosState.currentFilters.estado) params.append('activo', UsuariosState.currentFilters.estado);

    try {
        const response = await api.usuarios.listar(token, params.toString());
        const usuarios = response.usuarios || response;

        tbody.innerHTML = usuarios.map(u => `
            <tr class="hover:bg-gray-50">
                <td class="px-5 py-4 font-mono text-sm">${u.documento}</td>
                <td class="px-5 py-4">${u.nombre_completo}</td>
                <td class="px-5 py-4">${u.email || '-'}</td>
                <td class="px-5 py-4">
                    <span class="px-2 py-1 rounded text-xs font-medium ${getRolClass(u.rol)} capitalize">${u.rol}</span>
                </td>
                <td class="px-5 py-4 text-sm">
                    ${u.ruta_nombre ? `<span class="text-primary-600">Ruta: ${u.ruta_nombre}</span>` : ''}
                    ${u.id_empresa ? `<span class="text-blue-600 ml-2">Empresa ID: ${u.id_empresa}</span>` : ''}
                    ${!u.ruta_nombre && !u.id_empresa ? '<span class="text-gray-400">-</span>' : ''}
                </td>
                <td class="px-5 py-4 text-center">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="px-5 py-4 text-center">
                    <div class="flex justify-center gap-2">
                        <button onclick="editarUsuario(${u.id_usuario})" class="text-primary-600 hover:underline text-sm" title="Editar">
                            ${Icons.get('edit')}
                        </button>
                        <button onclick="toggleUsuario(${u.id_usuario}, ${!u.activo})" 
                                class="${u.activo ? 'text-yellow-600' : 'text-green-600'} hover:underline text-sm" 
                                title="${u.activo ? 'Desactivar' : 'Activar'}">
                            ${Icons.get(u.activo ? 'user-slash' : 'user-check')}
                        </button>
                        <button onclick="eliminarUsuario(${u.id_usuario})" class="text-red-600 hover:underline text-sm" title="Eliminar">
                            ${Icons.get('trash')}
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="7" class="p-8 text-center text-gray-500">No hay usuarios</td></tr>';

        updatePaginationUsuarios(response.total || usuarios.length);
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-500">Error: ${error.message}</td></tr>`;
    }
}

function getRolClass(rol) {
    switch (rol) {
        case 'admin': return 'bg-purple-100 text-purple-800';
        case 'reciclador': return 'bg-green-100 text-green-800';
        case 'empresa': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function aplicarFiltrosUsuarios() {
    UsuariosState.currentFilters = {
        busqueda: document.getElementById('filtro_busqueda')?.value?.trim() || '',
        rol: document.getElementById('filtro_rol')?.value || '',
        estado: document.getElementById('filtro_estado')?.value || ''
    };
    UsuariosState.currentPage = 1;
    const token = localStorage.getItem('token');
    loadUsuariosList(token);
}

function changePageUsuarios(delta) {
    UsuariosState.currentPage += delta;
    const token = localStorage.getItem('token');
    loadUsuariosList(token);
}

function updatePaginationUsuarios(total) {
    const totalPages = Math.ceil(total / UsuariosState.perPage);
    const info = document.getElementById('pagination-info');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    if (info) info.textContent = `Página ${UsuariosState.currentPage} de ${totalPages} (${total} total)`;
    if (btnPrev) btnPrev.disabled = UsuariosState.currentPage <= 1;
    if (btnNext) btnNext.disabled = UsuariosState.currentPage >= totalPages;
}

function showUsuarioModal() {
    const form = document.getElementById('usuario-form');
    if (form) form.reset();
    document.getElementById('usuario_id').value = '';
    document.getElementById('password-field').style.display = 'block';
    document.getElementById('password').required = true;
    document.getElementById('usuario-modal-title').innerHTML = Icons.get('plus-circle') + ' Nuevo Usuario';
    loadRutasYEmpresasParaModal();
    document.getElementById('usuario-modal').classList.remove('hidden');
    document.getElementById('usuario-modal').classList.add('flex');
}

async function editarUsuario(id) {
    const token = localStorage.getItem('token');
    try {
        const usuario = await api.usuarios.obtener(id, token);
        document.getElementById('usuario_id').value = usuario.id_usuario;
        document.getElementById('documento').value = usuario.documento;
        document.getElementById('nombre_completo').value = usuario.nombre_completo;
        document.getElementById('email').value = usuario.email || '';
        document.getElementById('telefono').value = usuario.telefono || '';
        document.getElementById('rol').value = usuario.rol;
        document.getElementById('id_ruta_asignada').value = usuario.id_ruta_asignada || '';
        document.getElementById('id_empresa').value = usuario.id_empresa || '';
        document.getElementById('password-field').style.display = 'none';
        document.getElementById('password').required = false;
        document.getElementById('usuario-modal-title').innerHTML = Icons.get('user-edit') + ' Editar Usuario';
        await loadRutasYEmpresasParaModal(usuario.id_ruta_asignada, usuario.id_empresa);
        document.getElementById('usuario-modal').classList.remove('hidden');
        document.getElementById('usuario-modal').classList.add('flex');
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

async function loadRutasYEmpresasParaModal(selectedRuta = null, selectedEmpresa = null) {
    const token = localStorage.getItem('token');
    try {
        const [rutas, empresas] = await Promise.all([
            api.catalogos.getRutas(token),
            api.catalogos.getEmpresas(token)
        ]);

        const rutaSelect = document.getElementById('id_ruta_asignada');
        const empresaSelect = document.getElementById('id_empresa');

        if (rutaSelect) {
            rutaSelect.innerHTML = '<option value="">Sin asignar</option>' +
                rutas.map(r => `<option value="${r.id}" ${r.id == selectedRuta ? 'selected' : ''}>${r.codigo} - ${r.nombre}</option>`).join('');
        }

        if (empresaSelect) {
            empresaSelect.innerHTML = '<option value="">Sin asignar</option>' +
                empresas.map(e => `<option value="${e.id}" ${e.id == selectedEmpresa ? 'selected' : ''}>${e.razon_social} (${e.nit})</option>`).join('');
        }
    } catch (error) {
        console.error('Error cargando catálogos:', error);
    }
}

async function toggleUsuario(id, activar) {
    if (!confirm(activar ? '¿Activar usuario?' : '¿Desactivar usuario?')) return;
    const token = localStorage.getItem('token');
    try {
        await api.usuarios.toggleActivo(id, activar, token);
        showToast(activar ? 'Usuario activado' : 'Usuario desactivado', 'success');
        loadUsuariosList(token);
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

async function eliminarUsuario(id) {
    if (!confirm('¿Eliminar usuario permanentemente?')) return;
    const token = localStorage.getItem('token');
    try {
        await api.usuarios.eliminar(id, token);
        showToast('Usuario eliminado', 'success');
        loadUsuariosList(token);
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}
