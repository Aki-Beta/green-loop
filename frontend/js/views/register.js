// frontend/js/views/register.js - Vista Registro de Empresa

async function renderRegister() {
    const app = document.getElementById('app');
    if (!app) return;

    const token = localStorage.getItem('token');
    if (token) {
        navigate('/dashboard');
        return;
    }

    app.innerHTML = `
        <div class="max-w-2xl mx-auto">
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
                    <i class="fas fa-building text-primary-600"></i> Registro de Empresa
                </h1>
                <p class="text-gray-600 mt-2">Registre su empresa para acceder al sistema Green Loop</p>
            </div>

            <form id="register-form" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6" novalidate>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nombre de la Empresa <span class="text-red-500">*</span></label>
                        <input type="text" id="company_name" name="company_name" required autocomplete="off"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                               placeholder="Ej: Reciclajes del Norte SAS">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">NIT <span class="text-red-500">*</span></label>
                        <input type="text" id="nit" name="nit" required autocomplete="off"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                               placeholder="Ej: 900123456-1">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico <span class="text-red-500">*</span></label>
                        <input type="email" id="email" name="email" required autocomplete="email"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                               placeholder="contacto@empresa.com">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Teléfono <span class="text-red-500">*</span></label>
                        <input type="tel" id="phone" name="phone" required autocomplete="tel"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                               placeholder="Ej: +57 300 123 4567">
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Dirección <span class="text-red-500">*</span></label>
                    <input type="text" id="address" name="address" required autocomplete="street-address"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                           placeholder="Calle 123 #45-67, Bogotá">
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Municipio <span class="text-red-500">*</span></label>
                        <input type="text" id="municipality" name="municipality" required autocomplete="address-level2"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                               placeholder="Bogotá">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Departamento <span class="text-red-500">*</span></label>
                        <input type="text" id="department" name="department" required autocomplete="address-level1"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                               placeholder="Cundinamarca">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Contraseña <span class="text-red-500">*</span></label>
                        <input type="password" id="password" name="password" required autocomplete="new-password" minlength="6"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                               placeholder="Mínimo 6 caracteres">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Confirmar Contraseña <span class="text-red-500">*</span></label>
                        <input type="password" id="confirm_password" name="confirm_password" required autocomplete="new-password" minlength="6"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                               placeholder="Repita la contraseña">
                    </div>
                </div>

                <div class="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <h3 class="font-medium text-blue-800 flex items-center gap-2 mb-2">
                        <i class="fas fa-info-circle"></i> Información
                    </h3>
                    <p class="text-blue-700 text-sm">
                        Al registrarse, su empresa recibirá credenciales de administrador para acceder al sistema.
                        El registro es gratuito y no requiere aprobación previa.
                    </p>
                </div>

                <div class="flex gap-4 pt-4 border-t border-gray-100">
                    <button type="submit" class="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-lg font-medium transition flex items-center justify-center gap-2">
                        <i class="fas fa-user-plus"></i> Registrar Empresa
                    </button>
                    <button type="button" onclick="navigate('/login')" class="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition">
                        Ya tengo cuenta
                    </button>
                </div>
            </form>
        </div>
    `;

    setupFormListeners();
}

function setupFormListeners() {
    const form = document.getElementById('register-form');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const btn = form.querySelector('button[type="submit"]');
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

        const formData = new FormData(form);
        const data = {
            company_name: formData.get('company_name').trim(),
            nit: formData.get('nit').trim(),
            email: formData.get('email').trim(),
            phone: formData.get('phone').trim(),
            address: formData.get('address').trim(),
            municipality: formData.get('municipality').trim(),
            department: formData.get('department').trim(),
            password: formData.get('password'),
            confirm_password: formData.get('confirm_password')
        };

        const errors = validateFormData(data);
        if (errors.length) {
            showToast(errors[0], 'error');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            return;
        }

        // Remove confirm_password before sending
        delete data.confirm_password;

        try {
            const result = await api.auth.registerCompany(data);
            showToast('¡Empresa registrada exitosamente! Credenciales enviadas al correo.', 'success');
            if (result.credentials) {
                showToast(`Usuario: ${result.credentials.user} | Contraseña: ${result.credentials.password}`, 'info');
            }
            setTimeout(() => navigate('/login'), 2000);
        } catch (error) {
            showToast(error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    });
}

function validateFormData(data) {
    const errors = [];
    if (!data.company_name) errors.push('Nombre de la empresa es obligatorio');
    if (!data.nit) errors.push('NIT es obligatorio');
    if (!data.email || !data.email.includes('@')) errors.push('Correo electrónico válido es obligatorio');
    if (!data.phone) errors.push('Teléfono es obligatorio');
    if (!data.address) errors.push('Dirección es obligatoria');
    if (!data.municipality) errors.push('Municipio es obligatorio');
    if (!data.department) errors.push('Departamento es obligatorio');
    if (!data.password || data.password.length < 6) errors.push('Contraseña debe tener al menos 6 caracteres');
    if (data.password !== data.confirm_password) errors.push('Las contraseñas no coinciden');
    return errors;
}