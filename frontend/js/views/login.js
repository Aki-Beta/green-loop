// 1. Registro global inmediato para evitar errores de búsqueda del router
window.renderLogin = renderLogin;
console.log("login.js cargado correctamente");

async function renderLogin() {
    const app = document.getElementById('app');
    if (!app) return;
    
    app.innerHTML = `
        <div class="caja-login">
            <svg viewBox="0 0 24 24" fill="none" class="logo-svg" style="width: 55px; height: 55px; margin: 0 auto 15px auto; display: block;">
                <path d="M7 17C4.23858 17 2 14.7614 2 12C2 9.23858 4.23858 7 7 7C9.11718 7 10.9238 8.30906 11.6441 10.134M17 7C19.7614 7 22 9.23858 22 12C22 14.7614 19.7614 17 17 17C14.8828 17 13.0762 15.6909 12.3559 13.866M11.6441 10.134C11.8741 10.7186 12 11.3446 12 12C12 12.6554 11.8741 13.2814 11.6441 13.866M11.6441 10.134C11.2332 11.178 11.2332 12.822 11.6441 13.866" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <h2>Green-Loop</h2>
            <p class="subtitulo">Ingresa a la plataforma de gestión de residuos</p>
            
            <div class="contenedor-roles">
                <div data-role-btn="reciclador" class="role-card active">
                    <p>Reciclador</p>
                </div>
                <div data-role-btn="empresa" class="role-card">
                    <p>Empresa</p>
                </div>
                <div data-role-btn="admin" class="role-card">
                    <p>Admin</p>
                </div>
            </div>

            <form id="login-form">
                <div class="grupo-input">
                    <label>Correo Electrónico</label>
                    <input id="email" type="email" required>
                </div>
                <div class="grupo-input">
                    <label>Contraseña</label>
                    <input id="password" type="password" required>
                </div>
                
                <div id="error-message" class="alerta-error" style="display: none;"></div>
                
                <button type="submit" id="btn-submit" class="btn-principal">Ingresar Plataforma</button>
            </form>
            
            <div style="margin-top: 20px;">
                <a href="#/register" data-link style="color: #a7f3d0; font-size: 13px; text-decoration: none; opacity: 0.8;">
                    ¿No tienes cuenta de Empresa? Regístrate aquí
                </a>
            </div>
        </div>
    `;
    setupLoginEvents();
}

function setupLoginEvents() {
    let rolSeleccionado = "reciclador";
    const botones = document.querySelectorAll('[data-role-btn]');
    
    botones.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const card = this.closest('.role-card');
            if (!card) return;
            
            botones.forEach(b => b.classList.remove('active'));
            card.classList.add('active');
            rolSeleccionado = card.getAttribute('data-role-btn');
        });
    });

    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const errMsg = document.getElementById('error-message');
        const btn = document.getElementById('btn-submit');
        const inputEmail = document.getElementById('email');
        const inputPass = document.getElementById('password');

        if (errMsg) { errMsg.style.display = 'none'; }
        inputEmail?.classList.remove('input-error');
        inputPass?.classList.remove('input-error');

        if (btn) { btn.disabled = true; btn.textContent = "Verificando..."; }

        try {
            // Nota: Asegúrate de que api.auth.login esté disponible globalmente
            const res = await api.auth.login(email, password);
            const token = res.access_token || res.token;
            if (!token) throw new Error("Token no recibido.");
            
            localStorage.setItem('token', token);
            const user = await api.auth.me(token);
            
            if (user.rol !== rolSeleccionado) {
                throw new Error(`El rol de esta cuenta es '${user.rol}' y no coincide.`);
            }
            
            localStorage.setItem('user', JSON.stringify(user));
            showToast(`Bienvenido`, 'success');
            navigate('/dashboard');
        } catch (err) {
            if (errMsg) { 
                errMsg.textContent = err.message || "Credenciales inválidas."; 
                errMsg.style.display = 'block'; 
            }
            inputEmail?.classList.add('input-error');
            inputPass?.classList.add('input-error');
            localStorage.clear();
        } finally { 
            if (btn) { btn.disabled = false; btn.textContent = "Ingresar Plataforma"; } 
        }
    });
}