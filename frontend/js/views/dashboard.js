// frontend/js/views/dashboard.js - Vista Dashboard (perfil + admin users)

async function renderDashboard() {
    const app = document.getElementById('app');
    if (!app) return;

    const token = localStorage.getItem('token');
    if (!token) {
        navigate('/login');
        return;
    }

    try {
        const user = await api.auth.me(token);
        renderDashboardHTML(user, token);
    } catch (error) {
        if (error.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
        } else {
            showToast('Error cargando dashboard: ' + error.message, 'error');
        }
    }
}

function renderDashboardHTML(user, token) {
    const app = document.getElementById('app');
    const isAdmin = user.role === 'admin';

    app.innerHTML = `
        <div class="space-y-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 class="text-3xl font-bold text-gray-800">Dashboard</h1>
                    <p class="text-gray-600 mt-1">Bienvenido, ${escapeHtml(user.email)} <span class="bg-primary-100 text-primary-800 px-2 py-0.5 rounded text-xs font-medium ml-2 capitalize">${user.role}</span></p>
                </div>
                <button onclick="logout()" class="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium transition flex items-center gap-2">
                    <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm font-medium">Rol</p>
                            <p class="text-3xl font-bold text-gray-800 mt-1 capitalize">${user.role}</p>
                        </div>
                        <div class="bg-primary-100 p-3 rounded-full">
                            <i class="fas fa-user-tag text-primary-600 text-2xl"></i>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm font-medium">Email</p>
                            <p class="text-2xl font-bold text-gray-800 mt-1 truncate">${escapeHtml(user.email)}</p>
                        </div>
                        <div class="bg-blue-100 p-3 rounded-full">
                            <i class="fas fa-envelope text-blue-600 text-2xl"></i>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm font-medium">Empresa</p>
                            <p class="text-2xl font-bold text-gray-800 mt-1">${escapeHtml(user.company_name || 'Sin empresa')}</p>
                        </div>
                        <div class="bg-green-100 p-3 rounded-full">
                            <i class="fas fa-building text-green-600 text-2xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            ${isAdmin ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                        <i class="fas fa-users-cog text-primary-600"></i> Gestión de Usuarios (Admin)
                    </h3>
                    <button onclick="showCreateUserModal()" class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-lg font-medium transition flex items-center gap-2 text-sm">
                        <i class="fas fa-plus"></i> Crear Usuario
                    </button>
                </div>
                <div class="overflow-x-auto" id="users-table">
                    <div class="p-8 text-center">
                        <div class="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent mx-auto"></div>
                    </div>
                </div>
            </div>
            ` : `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                <i class="fas fa-info-circle text-4xl text-primary-400 mb-3"></i>
                <h3 class="text-lg font-semibold text-gray-800 mb-2">Acceso de ${user.role === 'company' ? 'Empresa' : 'Usuario'}</h3>
                <p class="text-gray-600">Esta vista muestra las acciones disponibles para tu rol.</p>
            </div>
            `}
        </div>

        <!-- Modal Crear Usuario -->
        <div id="create-user-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">Crear Usuario</h3>
                <form id="create-user-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email <span class="text-red-500">*</span></label>
                        <input type="email" id="new-user-email" name="email" required autocomplete="email"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Contraseña <span class="text-red-500">*</span></label>
                        <input type="password" id="new-user-password" name="password" required autocomplete="new-password" minlength="6"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Rol <span class="text-red-500">*</span></label>
                        <select id="new-user-role" name="role" required class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500">
                            <option value="">Seleccione rol</option>
                            <option value="user">Usuario (Reciclador)</option>
                            <option value="company">Empresa</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Empresa (opcional)</label>
                        <input type="text" id="new-user-company" name="company_name" autocomplete="off"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                    </div>
                    <div class="flex gap-3 pt-4">
                        <button type="button" onclick="hideCreateUserModal()" class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition">Cancelar</button>
                        <button type="submit" class="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg font-medium transition">Crear</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    if (isAdmin) {
        loadUsers(token);
        setupCreateUserForm(token);
    }
}

async function loadUsers(token) {
    const container = document.getElementById('users-table');
    try {
        const users = await api.users.list(token);
        container.innerHTML = `
            <table class="w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                        <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rol</th>
                        <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Empresa</th>
                        <th class="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    ${users.map(u => `
                        <tr class="hover:bg-gray-50">
                            <td class="px-5 py-4 text-sm text-gray-600">${escapeHtml(u.email)}</td>
                            <td class="px-5 py-4 text-sm">
                                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(u.role)} capitalize">${u.role}</span>
                            </td>
                            <td class="px-5 py-4 text-sm text-gray-600">${escapeHtml(u.company_name || '-')}</td>
                            <td class="px-5 py-4 text-sm text-center">
                                <button onclick="deleteUser(${u.id}, '${escapeHtml(u.email)}')" class="text-red-600 hover:text-red-800 font-medium text-sm">
                                    <i class="fas fa-trash mr-1"></i> Eliminar
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        container.innerHTML = `<div class="p-8 text-center text-red-600">Error: ${escapeHtml(error.message)}</div>`;
    }
}

function getRoleColor(role) {
    const colors = {
        admin: 'bg-purple-100 text-purple-800',
        company: 'bg-blue-100 text-blue-800',
        user: 'bg-green-100 text-green-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
}

function showCreateUserModal() {
    document.getElementById('create-user-modal').classList.remove('hidden');
    document.getElementById('create-user-modal').classList.add('flex');
}

function hideCreateUserModal() {
    document.getElementById('create-user-modal').classList.add('hidden');
    document.getElementById('create-user-modal').classList.remove('flex');
    document.getElementById('create-user-form').reset();
}

function setupCreateUserForm(token) {
    const form = document.getElementById('create-user-form');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const btn = form.querySelector('button[type="submit"]');
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

        const formData = new FormData(form);
        const data = {
            email: formData.get('email').trim(),
            password: formData.get('password'),
            role: formData.get('role'),
            company_name: formData.get('company_name') || undefined
        };

        try {
            await api.auth.register(data, token);
            showToast('Usuario creado exitosamente', 'success');
            hideCreateUserModal();
            loadUsers(token);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    });
}

async function deleteUser(id, email) {
    if (!confirm(`¿Eliminar usuario ${email}?`)) return;

    try {
        await api.users.delete(id, localStorage.getItem('token'));
        showToast('Usuario eliminado', 'success');
        loadUsers(localStorage.getItem('token'));
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Sesión cerrada', 'success');
    setTimeout(() => navigate('/login'), 500);
}