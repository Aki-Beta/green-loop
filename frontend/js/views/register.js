// ============================================================
// Green-Loop - Vista Registro de Empresa
// ============================================================

async function renderRegister() {
    const app = document.getElementById('app');
    if (!app) return;

    // Asegurar que Icons esté disponible
    window.Icons = window.Icons || { get: (name) => '' };

    if (localStorage.getItem('token')) { navigate('/dashboard'); return; }

    app.innerHTML = `
        <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
            <div class="max-w-2xl w-full space-y-8 animate-fade-in">
                <div class="text-center">
                    <h1 class="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
                        <span class="icon" style="width: 2rem; height: 2rem; color: var(--primary-600);">${Icons.get('certificate')}</span> Registro de Empresa
                    </h1>
                    <p class="text-gray-600 mt-2">Registre su empresa para acceder a Green-Loop</p>
                </div>

                <form id="register-form" class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-6" novalidate>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="form-label">Nombre de la Empresa <span class="text-red-500">*</span></label>
                            <input type="text" id="razon_social" name="razon_social" required autocomplete="off"
                                   class="form-input" placeholder="Ej: Reciclajes del Norte SAS">
                        </div>
                        <div>
                            <label class="form-label">NIT <span class="text-red-500">*</span></label>
                            <input type="text" id="nit" name="nit" required autocomplete="off"
                                   class="form-input" placeholder="Ej: 900123456-7">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="form-label">Correo Electrónico <span class="text-red-500">*</span></label>
                            <input type="email" id="email" name="email" required autocomplete="email"
                                   class="form-input" placeholder="contacto@empresa.com">
                        </div>
                        <div>
                            <label class="form-label">Teléfono <span class="text-red-500">*</span></label>
                            <input type="tel" id="telefono" name="telefono" required autocomplete="tel"
                                   class="form-input" placeholder="Ej: +57 300 123 4567">
                        </div>
                    </div>

                    <div>
                        <label class="form-label">Dirección <span class="text-red-500">*</span></label>
                        <input type="text" id="direccion" name="direccion" required autocomplete="street-address"
                               class="form-input" placeholder="Calle 123 #45-67, Bogotá">
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="form-label">Contacto <span class="text-red-500">*</span></label>
                            <input type="text" id="contacto_nombre" name="contacto_nombre" required autocomplete="off"
                                   class="form-input" placeholder="Nombre del representante">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="form-label">Usuario Admin (Email) <span class="text-red-500">*</span></label>
                            <input type="email" id="admin_email" name="admin_email" required autocomplete="email"
                                   class="form-input" placeholder="admin@empresa.com">
                        </div>
                        <div>
                            <label class="form-label">Contraseña Admin <span class="text-red-500">*</span></label>
                            <input type="password" id="admin_password" name="admin_password" required autocomplete="new-password" minlength="6"
                                   class="form-input" placeholder="Mínimo 6 caracteres">
                        </div>
                    </div>

                    <div class="bg-blue-50 border border-blue-100 rounded-lg p-4">
                        <h3 class="font-medium text-blue-800 flex items-center gap-2 mb-2">
                            ${Icons.get('exclamation-circle')} Información
                        </h3>
                        <p class="text-blue-700 text-sm">
                            Se creará un usuario administrador para su empresa. El registro es gratuito y no requiere aprobación previa.
                        </p>
                    </div>

                    <div class="flex gap-4 pt-4 border-t border-gray-100">
                        <button type="submit" class="flex-1 btn btn-primary py-3">
                            ${Icons.get('plus-circle')} Registrar Empresa
                        </button>
                        <button type="button" onclick="navigate('/login')" class="flex-1 btn btn-secondary py-3">
                            Ya tengo cuenta
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    setupRegisterForm();
}

function setupRegisterForm() {
    // Asegurar que Icons esté disponible
    window.Icons = window.Icons || { get: (name) => '' };

    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();

        const btn = form.querySelector('button[type="submit"]');
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = Icons.get('spinner') + ' Registrando...';

        const data = {
            nit: form.nit.value.trim(),
            razon_social: form.razon_social.value.trim(),
            direccion: form.direccion.value.trim(),
            telefono: form.telefono.value.trim(),
            email: form.email.value.trim(),
            contacto_nombre: form.contacto_nombre.value.trim(),
            admin_email: form.admin_email.value.trim(),
            admin_password: form.admin_password.value
        };

        const errors = validateForm(data);
        if (errors.length) {
            showToast(errors[0], 'error');
            btn.disabled = false;
            btn.innerHTML = original;
            return;
        }

        try {
            // Crear usuario empresa directamente (el backend crea la empresa si no existe)
            await api.auth.register({
                email: data.admin_email,
                password: data.admin_password,
                nombre_completo: data.contacto_nombre,
                email: data.email,
                rol: 'empresa'
            });
            showToast('¡Empresa registrada exitosamente!', 'success');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            showToast(err.message, 'error');
            btn.disabled = false;
            btn.innerHTML = original;
        }
    });
}

function validateForm(d) {
    const e = [];
    if (!d.razon_social) e.push('Nombre de la empresa es obligatorio');
    if (!d.nit) e.push('NIT es obligatorio');
    if (!d.email || !d.email.includes('@')) e.push('Correo electrónico válido es obligatorio');
    if (!d.telefono) e.push('Teléfono es obligatorio');
    if (!d.direccion) e.push('Dirección es obligatoria');
    if (!d.contacto_nombre) e.push('Contacto es obligatorio');
    if (!d.admin_email) e.push('Email del admin es obligatorio');
    if (!d.admin_password || d.admin_password.length < 6) e.push('Contraseña mínimo 6 caracteres');
    return e;
}