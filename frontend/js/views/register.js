async function renderRegister() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
        <div class="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div class="max-w-xl w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div class="text-center">
                    <h2 class="text-3xl font-extrabold text-gray-900">Registro Corporativo</h2>
                    <p class="mt-2 text-sm text-gray-600">Vincula tu empresa al ecosistema de economía circular</p>
                </div>
                <form id="register-form" class="space-y-4 mt-6">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="form-label">NIT o Documento</label>
                            <input id="reg_doc" type="text" required class="form-input">
                        </div>
                        <div>
                            <label class="form-label">Razón Social / Nombre</label>
                            <input id="reg_name" type="text" required class="form-input">
                        </div>
                    </div>
                    <div>
                        <label class="form-label">Correo Electrónico Corporativo</label>
                        <input id="reg_email" type="email" required class="form-input">
                    </div>
                    <div>
                        <label class="form-label">Establecer Contraseña (Min 6)</label>
                        <input id="reg_pass" type="password" required class="form-input">
                    </div>
                    <button type="submit" class="btn btn-primary w-full">Registrar Empresa y Cuenta</button>
                </form>
                <div class="text-center mt-4">
                    <a href="#/login" data-link class="text-sm text-gray-500 hover:underline">¿Ya tienes cuenta? Inicia sesión aquí</a>
                </div>
            </div>
        </div>
    `;
    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            documento: document.getElementById('reg_doc').value.trim(),
            nombre_completo: document.getElementById('reg_name').value.trim(),
            email: document.getElementById('reg_email').value.trim(),
            password: document.getElementById('reg_pass').value,
            rol: "empresa"
        };
        if(data.password.length < 6) { showToast('Mínimo 6 caracteres', 'error'); return; }
        try {
            await api.auth.register(data);
            showToast('Empresa registrada con éxito.', 'success');
            navigate('/login');
        } catch (err) { showToast(err.message || 'Error en el registro', 'error'); }
    });
}
window.renderRegister = renderRegister;
