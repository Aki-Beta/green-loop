// ============================================================
// Green-Loop - Vista Login
// ============================================================

async function renderLogin() {
    const app = document.getElementById('app');
    if (!app) return;

    // Asegurar que Icons esté disponible
    window.Icons = window.Icons || { get: (name) => '' };

    if (localStorage.getItem('token')) { navigate('/dashboard'); return; }

    app.innerHTML = `
        <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
            <div class="max-w-md w-full space-y-8 animate-fade-in">
                <div class="text-center">
                    <h1 class="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
                        <span class="icon leaf" style="width: 2rem; height: 2rem; color: var(--primary-600);"></span> Green-Loop
                    </h1>
                    <p class="text-gray-600 mt-2">Inicia sesión para acceder al sistema</p>
                </div>

                <form id="login-form" class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-6" novalidate>
                    <!-- Alerta de error (se inyecta dinámicamente) -->
                    <div id="login-error-container"></div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Correo electrónico <span class="text-red-500">*</span></label>
                        <input type="email" id="email" name="email" required autocomplete="email"
                               class="form-input" placeholder="Ej: usuario@ejemplo.com">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Contraseña <span class="text-red-500">*</span></label>
                        <input type="password" id="password" name="password" required autocomplete="current-password"
                               class="form-input" placeholder="••••••••">
                    </div>

                    <button type="submit" class="btn btn-primary w-full py-3">
                        ${Icons.get('sign-in-alt')} Iniciar Sesión
                    </button>
                </form>

                <div class="text-center">
                    <p class="text-gray-600">¿No tienes cuenta? </p>
                    <button onclick="navigate('/register')" class="text-primary-600 hover:text-primary-800 font-medium">
                        Registrar empresa
                    </button>
                </div>
            </div>
        </div>
    `;

    setupLoginForm();
}

function setupLoginForm() {
    // Asegurar que Icons esté disponible
    const IconsObj = window.Icons || { get: (name) => '' };
    
    const form = document.getElementById('login-form');
    const errorContainer = document.getElementById('login-error-container');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        
        // Ocultar error previo
        if (errorContainer) {
            errorContainer.innerHTML = '';
            errorContainer.style.display = 'none';
        }
        
        const btn = form.querySelector('button[type="submit"]');
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = IconsObj.get('spinner') + ' Iniciando...';

        const data = {
            email: form.email.value.trim(),
            password: form.password.value
        };

        try {
            const result = await api.auth.login(data.email, data.password);
            localStorage.setItem('token', result.access_token);
            localStorage.setItem('user', JSON.stringify(result.usuario));
            showToast('¡Bienvenido! Sesión iniciada', 'success');
            setTimeout(() => { updateNavbar(result.usuario); navigate('/dashboard'); }, 800);
        } catch (err) {
            // Mostrar error en contenedor + toast
            if (errorContainer) {
                errorContainer.innerHTML = `
                    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm animate-fade-in">
                        ${IconsObj.get('exclamation-circle')}
                        <span>${err.message || 'Correo o contraseña incorrectos'}</span>
                    </div>
                `;
                errorContainer.style.display = 'block';
            }
            showToast(err.message, 'error');
            btn.disabled = false;
            btn.innerHTML = original;
            
            // Animar shake en el formulario
            form.classList.add('animate-shake');
            setTimeout(() => form.classList.remove('animate-shake'), 500);
        }
    });
}