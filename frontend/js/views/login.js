// frontend/js/views/login.js - Vista Login

async function renderLogin() {
    const app = document.getElementById('app');
    if (!app) return;

    const token = localStorage.getItem('token');
    if (token) {
        navigate('/dashboard');
        return;
    }

    app.innerHTML = `
        <div class="max-w-md mx-auto">
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
                    <i class="fas fa-leaf text-primary-600"></i> Green Loop
                </h1>
                <p class="text-gray-600 mt-2">Inicie sesión para acceder al sistema</p>
            </div>

            <form id="login-form" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6" novalidate>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico <span class="text-red-500">*</span></label>
                    <input type="email" id="email" name="email" required autocomplete="email"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                           placeholder="usuario@ejemplo.com">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Contraseña <span class="text-red-500">*</span></label>
                    <input type="password" id="password" name="password" required autocomplete="current-password"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                           placeholder="••••••••">
                </div>

                <div class="flex gap-4 pt-4 border-t border-gray-100">
                    <button type="submit" class="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-lg font-medium transition flex items-center justify-center gap-2">
                        <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                    </button>
                    <button type="button" onclick="navigate('/register')" class="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition">
                        Registrar Empresa
                    </button>
                </div>
            </form>
        </div>
    `;

    setupFormListeners();
}

function setupFormListeners() {
    const form = document.getElementById('login-form');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const btn = form.querySelector('button[type="submit"]');
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';

        const formData = new FormData(form);
        const data = {
            email: formData.get('email').trim(),
            password: formData.get('password')
        };

        try {
            const result = await api.auth.login(data);
            localStorage.setItem('token', result.access_token);
            localStorage.setItem('user', JSON.stringify(result.user));
            showToast('¡Bienvenido! Sesión iniciada', 'success');
            setTimeout(() => navigate('/dashboard'), 800);
        } catch (error) {
            showToast(error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    });
}