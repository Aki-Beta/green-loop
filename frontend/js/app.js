// frontend/js/app.js - Bootstrap de la aplicación (SIN import/export)

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando Green Loop...');
    initRouter();
    checkAPIConnection();
    setInterval(checkAPIConnection, 30000);

    // Navegación SPA para links con data-link
    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('[data-link]');
        if (link) {
            e.preventDefault();
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) window.location.hash = href.slice(1);
        }
    });

    console.log('✅ App lista');
});