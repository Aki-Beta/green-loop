const UsuariosState = { currentPage: 1, perPage: 10, currentFilters: {} };
async function renderUsuarios() {
    const app = document.getElementById('app');
    if (!app) return;
    window.Icons = window.Icons || { get: () => '' };
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.rol !== 'admin') { showToast('Acceso denegado', 'error'); navigate('/dashboard'); return; }
    app.innerHTML = getUsuariosHTML();
    setupEventListeners(token);
    await loadUsuariosList(token);
}
function getUsuariosHTML() {
    return `
        <div class="max-w-7xl mx-auto">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 class="text-3xl font-bold text-gray-800 flex items-center gap-3">${Icons.get('users')} Usuarios</h1>
                </div>
                <button onclick="showUsuarioModal()" class="btn btn-primary">${Icons.get('plus-circle')} Nuevo Usuario</button>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
                <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <input type="text" id="filtro_busqueda" class="form-input" placeholder="Buscar...">
                    <select id="filtro_rol" class="form-input"><option value="">Todos los Roles</option><option value="admin">Admin</option><option value="reciclador">Reciclador</option><option value="empresa">Empresa</option></select>
                    <select id="filtro_estado" class="form-input"><option value="">Todos los Estados</option><option value="true">Activos</option><option value="false">Inactivos</option></select>
                    <button onclick="aplicarFiltrosUsuarios()" class="btn btn-dark">${Icons.get('filter')} Filtrar</button>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50 border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500">
                        <tr><th class="p-4">Documento</th><th class="p-4">Nombre</th><th class="p-4">Email</th><th class="p-4">Rol</th><th class="p-4">Asignación</th><th class="p-4 text-center">Estado</th><th class="p-4 text-center">Acciones</th></tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100" id="usuarios-tbody">
                        <tr><td colspan="7" class="p-4 text-center">Cargando...</td></tr>
                    </tbody>
                </table>
                <div class="p-4 flex justify-between items-center bg-gray-50/50 text-xs font-semibold text-gray-500">
                    <span id="pagination-info">Página -- de --</span>
                    <div class="flex gap-1">
                        <button id="btn-prev" class="px-2 py-1 bg-white border rounded" disabled>${Icons.get('chevron-left')}</button>
                        <button id="btn-next" class="px-2 py-1 bg-white border rounded" disabled>${Icons.get('chevron-right')}</button>
                    </div>
                </div>
            </div>
        </div>
        <div id="usuario-modal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl max-w-xl w-full p-6 space-y-4">
                <h3 class="font-bold text-lg" id="usuario-modal-title">Formulario Usuario</h3>
                <form id="usuario-form" class="space-y-4">
                    <input type="hidden" id="usuario_id" name="usuario_id">
                    <div class="grid grid-cols-2 gap-4">
                        <input type="text" id="documento" name="documento" required class="form-input" placeholder="Documento">
                        <input type="text" id="nombre_completo" name="nombre_completo" required class="form-input" placeholder="Nombre completo">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <input type="email" id="email" name="email" required class="form-input" placeholder="Email">
                        <input type="text" id="telefono" name="telefono" class="form-input" placeholder="Teléfono">
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                        <select id="rol" name="rol" required class="form-input"><option value="reciclador">Reciclador</option><option value="empresa">Empresa</option><option value="admin">Admin</option></select>
                        <select id="id_ruta_asignada" name="id_ruta_asignada" class="form-input"><option value="">Sin ruta</option></select>
                        <select id="id_empresa" name="id_empresa" class="form-input"><option value="">Sin empresa</option></select>
                    </div>
                    <div id="password-field"><input type="password" id="password" name="password" class="form-input" placeholder="Contraseña"></div>
                    <div class="flex justify-end gap-2"><button type="button" onclick="closeModal('usuario-modal')" class="btn btn-secondary">Cerrar</button><button type="submit" class="btn btn-primary">Guardar</button></div>
                </form>
            </div>
        </div>
    `;
}
function setupEventListeners(token) {
    document.getElementById('usuario-form')?.addEventListener('submit', async (e) => { e.preventDefault(); await submitUsuario(e.target, token); });
    document.getElementById('btn-prev')?.addEventListener('click', () => changePageUsuarios(-1));
    document.getElementById('btn-next')?.addEventListener('click', () => changePageUsuarios(1));
}
async function submitUsuario(form, token) {
    const formData = new FormData(form);
    const data = {
        documento: formData.get('documento').trim(), nombre_completo: formData.get('nombre_completo').trim(),
        email: formData.get('email').trim() || null, telefono: formData.get('telefono').trim() || null, rol: formData.get('rol'),
        id_ruta_asignada: formData.get('id_ruta_asignada') ? parseInt(formData.get('id_ruta_asignada')) : null,
        id_empresa: formData.get('id_empresa') ? parseInt(formData.get('id_empresa')) : null
    };
    if (formData.get('password')) data.password = formData.get('password');
    const id = formData.get('usuario_id');
    try {
        if (id && !isNaN(parseInt(id))) { await api.usuarios.actualizar(parseInt(id), data, token); showToast('Actualizado', 'success'); }
        else { await api.usuarios.crear(data, token); showToast('Creado', 'success'); }
        closeModal('usuario-modal'); await loadUsuariosList(token);
    } catch (e) { showToast(e.message, 'error'); }
}
async function loadUsuariosList(token) {
    const tbody = document.getElementById('usuarios-tbody');
    if (!tbody) return;
    const params = new URLSearchParams({ page: UsuariosState.currentPage, per_page: UsuariosState.perPage });
    if (UsuariosState.currentFilters.busqueda) params.append('busqueda', UsuariosState.currentFilters.busqueda);
    if (UsuariosState.currentFilters.rol) params.append('rol', UsuariosState.currentFilters.rol);
    if (UsuariosState.currentFilters.estado) params.append('activo', UsuariosState.currentFilters.estado);
    try {
        const response = await api.usuarios.listar(token, params.toString());
        const usuarios = response.usuarios || response;
        tbody.innerHTML = usuarios.map(u => `
            <tr class="hover:bg-gray-50 text-xs">
                <td class="p-4 font-mono">${u.documento}</td>
                <td class="p-4 font-bold text-gray-800">${u.nombre_completo}</td>
                <td class="p-4">${u.email || '-'}</td>
                <td class="p-4 capitalize">${u.rol}</td>
                <td class="p-4">${u.ruta_nombre || u.id_empresa ? 'Asignado' : '-'}</td>
                <td class="p-4 text-center">${u.activo !== false ? '✅' : '❌'}</td>
                <td class="p-4 text-center">
                    <button onclick="editarUsuario(${u.id_usuario || u.id})" class="text-blue-600 font-bold px-1">Editar</button>
                    <button onclick="toggleUsuario(${u.id_usuario || u.id}, ${u.activo === false})" class="text-amber-600 font-bold px-1">Estado</button>
                    <button onclick="eliminarUsuario(${u.id_usuario || u.id})" class="text-red-600 font-bold px-1">Baja</button>
                </td>
            </tr>`).join('') || '<tr><td colspan="7" class="p-4 text-gray-400">Vacio.</td></tr>';
        updatePaginationUsuarios(response.total || usuarios.length);
    } catch (e) { tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-red-500">Error: ${e.message}</td></tr>`; }
}
function aplicarFiltrosUsuarios() {
    UsuariosState.currentFilters = { busqueda: document.getElementById('filtro_busqueda')?.value?.trim() || '', rol: document.getElementById('filtro_rol')?.value || '', estado: document.getElementById('filtro_estado')?.value || '' };
    UsuariosState.currentPage = 1; loadUsuariosList(localStorage.getItem('token'));
}
function changePageUsuarios(d) { UsuariosState.currentPage += d; loadUsuariosList(localStorage.getItem('token')); }
function updatePaginationUsuarios(t) {
    const pages = Math.max(1, Math.ceil(t / UsuariosState.perPage));
    document.getElementById('pagination-info').textContent = `Página ${UsuariosState.currentPage} de ${pages}`;
    document.getElementById('btn-prev').disabled = UsuariosState.currentPage <= 1;
    document.getElementById('btn-next').disabled = UsuariosState.currentPage >= pages;
}
function showUsuarioModal() {
    document.getElementById('usuario-form').reset(); document.getElementById('usuario_id').value = '';
    document.getElementById('password-field').style.display = 'block';
    loadRutasYEmpresasParaModal();
    document.getElementById('usuario-modal').classList.replace('hidden', 'flex');
}
async function editarUsuario(id) {
    try {
        const u = await api.usuarios.obtener(id, localStorage.getItem('token'));
        document.getElementById('usuario_id').value = u.id_usuario || u.id;
        document.getElementById('documento').value = u.documento;
        document.getElementById('nombre_completo').value = u.nombre_completo;
        document.getElementById('email').value = u.email || '';
        document.getElementById('telefono').value = u.telefono || '';
        document.getElementById('rol').value = u.rol;
        document.getElementById('password-field').style.display = 'none';
        await loadRutasYEmpresasParaModal(u.id_ruta_asignada, u.id_empresa);
        document.getElementById('usuario-modal').classList.replace('hidden', 'flex');
    } catch (e) { showToast(e.message, 'error'); }
}
async function loadRutasYEmpresasParaModal(rId = null, eId = null) {
    try {
        const [rutas, empresas] = await Promise.all([api.catalogos.zonas(localStorage.getItem('token')), api.catalogos.empresas(localStorage.getItem('token'))]);
        document.getElementById('id_ruta_asignada').innerHTML = '<option value="">Sin ruta</option>' + rutas.map(r => `<option value="${r.id}" ${r.id == rId ? 'selected':''}>${r.nombre}</option>`).join('');
        document.getElementById('id_empresa').innerHTML = '<option value="">Sin empresa</option>' + empresas.map(e => `<option value="${e.id}" ${e.id == eId ? 'selected':''}>${e.razon_social || e.nombre}</option>`).join('');
    } catch {}
}
async function toggleUsuario(id, act) { if (!confirm('¿Cambiar estado?')) return; try { await api.usuarios.toggle(id, act, localStorage.getItem('token')); showToast('Estado cambiado', 'success'); await loadUsuariosList(localStorage.getItem('token')); } catch (e) { showToast(e.message, 'error'); } }
async function eliminarUsuario(id) { if (!confirm('¿Eliminar permanentemente?')) return; try { await api.usuarios.eliminar(id, localStorage.getItem('token')); showToast('Eliminado', 'success'); await loadUsuariosList(localStorage.getItem('token')); } catch (e) { showToast(e.message, 'error'); } }
function closeModal(id) { document.getElementById(id).classList.replace('flex', 'hidden'); }
window.renderUsuarios = renderUsuarios; window.showUsuarioModal = showUsuarioModal; window.editarUsuario = editarUsuario; window.toggleUsuario = toggleUsuario; window.eliminarUsuario = eliminarUsuario; window.aplicarFiltrosUsuarios = aplicarFiltrosUsuarios; window.closeModal = closeModal;
