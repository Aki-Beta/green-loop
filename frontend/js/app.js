// Configuración de la API local (JSON Server)
const API_URL = 'http://localhost:5000/api/auth';

// Variables de Estado de la Aplicación
let selectedRole = localStorage.getItem('greenLoopRole') || 'user';
let currentUser = JSON.parse(localStorage.getItem('greenLoopSession')) || null;

// Selectores del DOM
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');
const submitRoleText = document.getElementById('submit-role-text');
const userDisplayInfo = document.getElementById('user-display-info');
const btnLogout = document.getElementById('btn-logout');
const roleButtons = document.querySelectorAll('.role-card');

const roleNames = { user: 'Usuarios', company: 'Empresas', admin: 'Admin' };

// --- NAVEGACIÓN SPA & PERSISTENCIA ---
function initSPA() {
    // Si ya existe una sesión guardada, saltamos directo al Dashboard
    if (currentUser) {
        showDashboardView();
    } else {
        showLoginView();
    }
}

function showLoginView() {
    dashboardScreen.classList.add('style-hidden');
    loginScreen.classList.remove('style-hidden');
    loginForm.reset();
    clearErrors();
    applyActiveRole(selectedRole);
}

function showDashboardView() {
    loginScreen.classList.add('style-hidden');
    dashboardScreen.classList.remove('style-hidden');
    userDisplayInfo.innerHTML = `Sesión activa como: <strong>${currentUser.email}</strong> <br> Rol: ${roleNames[currentUser.role]}`;
}

// --- SELECTOR DE ROLES ---
function applyActiveRole(role) {
    roleButtons.forEach(btn => {
        if (btn.getAttribute('data-role') === role) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    submitRoleText.textContent = roleNames[role];
}

roleButtons.forEach(button => {
    button.addEventListener('click', () => {
        selectedRole = button.getAttribute('data-role');
        localStorage.setItem('greenLoopRole', selectedRole);
        applyActiveRole(selectedRole);
    });
});

// --- VALIDACIÓN DE FORMULARIO DE CLIENTE ---
function validateForm() {
    clearErrors();
    let isValid = true;
    const emailValue = emailInput.value.trim();
    const passwordValue = passwordInput.value;

    // Validar correo estructurado
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValue || !emailRegex.test(emailValue)) {
        emailInput.classList.add('input-error');
        showErrorBanner('Por favor, ingresa un correo electrónico válido.');
        isValid = false;
    }

    // Validar longitud de contraseña
    if (passwordValue.length < 6) {
        passwordInput.classList.add('input-error');
        showErrorBanner('La contraseña debe tener al menos 6 caracteres.');
        isValid = false;
    }

    return isValid;
}

function showErrorBanner(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('style-hidden');
}

function clearErrors() {
    errorMessage.classList.add('style-hidden');
    emailInput.classList.remove('input-error');
    passwordInput.classList.remove('input-error');
}

// --- CONSUMO DE API (JSON-SERVER) ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const btnSubmit = document.getElementById('btn-submit');

    try {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Verificando...';

        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showErrorBanner(data.error || 'Credenciales incorrectas.');
            passwordInput.classList.add('input-error');
            return;
        }

        currentUser = data.user;
        localStorage.setItem('greenLoopSession', JSON.stringify(currentUser));
        localStorage.setItem('greenLoopToken', data.access_token);

        showDashboardView();

    } catch (error) {
        console.error(error);
        showErrorBanner('No se pudo conectar al servidor. Revisa si Flask está corriendo.');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = `Ingresar como ${roleNames[selectedRole]}`;
    }
});

// --- LOGOUT ---
btnLogout.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('greenLoopSession');
    showLoginView();
});

// Arrancar la app 
initSPA();

// --- REGISTRO ---
const registerScreen = document.getElementById('register-screen');
const registerForm = document.getElementById('register-form');
const registerEmailInput = document.getElementById('register-email');
const registerPasswordInput = document.getElementById('register-password');
const registerRoleSelect = document.getElementById('register-role');
const registerErrorMessage = document.getElementById('register-error-message');
const linkToRegister = document.getElementById('link-to-register');
const linkToLogin = document.getElementById('link-to-login');

function showRegisterView() {
    loginScreen.classList.add('style-hidden');
    dashboardScreen.classList.add('style-hidden');
    registerScreen.classList.remove('style-hidden');
    registerForm.reset();
    registerErrorMessage.classList.add('style-hidden');
}

linkToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    showRegisterView();
});

linkToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginView();
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = registerEmailInput.value.trim();
    const password = registerPasswordInput.value;
    const role = registerRoleSelect.value;

    registerErrorMessage.classList.add('style-hidden');

    if (password.length < 6) {
        registerErrorMessage.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        registerErrorMessage.classList.remove('style-hidden');
        return;
    }

    const btnRegister = document.getElementById('btn-register-submit');

    try {
        btnRegister.disabled = true;
        btnRegister.textContent = 'Creando cuenta...';

        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });

        const data = await response.json();

        if (!response.ok) {
            registerErrorMessage.textContent = data.error || 'No se pudo crear la cuenta.';
            registerErrorMessage.classList.remove('style-hidden');
            return;
        }

        // Registro exitoso: lo mandamos de vuelta al login para que entre
        alert('¡Cuenta creada! Ahora inicia sesión.');
        showLoginView();

    } catch (error) {
        console.error(error);
        registerErrorMessage.textContent = 'No se pudo conectar al servidor.';
        registerErrorMessage.classList.remove('style-hidden');
    } finally {
        btnRegister.disabled = false;
        btnRegister.textContent = 'Crear cuenta';
    }
});