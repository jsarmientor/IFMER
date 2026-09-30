(function() {
    // Clave ofuscada en Base64 (101211)
    const SECRET = 'MTAxMjEx'; 
    // Flag de autorización (guardado en sessionStorage para no pedirlo repetidamente)
    const AUTH_KEY = 'ifmer_auth_granted';

    document.addEventListener('DOMContentLoaded', () => {
        // Bloquear clic derecho (ContextMenu)
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });

        // Bloquear atajos de teclado de DevTools (F12, Ctrl+Shift+I, Ctrl+U)
        document.addEventListener('keydown', function(e) {
            // F12
            if (e.key === 'F12') {
                e.preventDefault();
            }
            // Ctrl + Shift + I (Inspeccionar) o Ctrl + Shift + J (Consola) o Ctrl + U (Código fuente)
            if (e.ctrlKey && (e.key === 'u' || e.key === 'U' || (e.shiftKey && (e.key === 'i' || e.key === 'I' || e.key === 'j' || e.key === 'J')))) {
                e.preventDefault();
            }
        });

        // Interceptar clicks en los toggles del menú lateral
        const toggles = document.querySelectorAll('.sidebar-item-toggle');
        
        toggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
                
                // Si está intentando expandir (abrir)
                if (!isExpanded) {
                    // Si ya se autenticó en esta sesión, dejarlo pasar
                    if (sessionStorage.getItem(AUTH_KEY) === 'true') {
                        return;
                    }

                    // Detener la expansión por defecto
                    e.preventDefault();
                    e.stopPropagation();

                    // Pedir la clave
                    const password = prompt("Seguridad del Curso: Por favor, ingrese el PIN de acceso para expandir los contenidos.");
                    
                    if (password) {
                        // Validar clave (codificamos lo ingresado a base64 para comparar)
                        if (btoa(password) === SECRET) {
                            alert("¡Acceso concedido!");
                            sessionStorage.setItem(AUTH_KEY, 'true');
                            
                            // Disparar el click de nuevo para abrirlo, ahora que está autorizado
                            setTimeout(() => {
                                toggle.click();
                            }, 100);
                        } else {
                            alert("Clave incorrecta. Acceso denegado.");
                        }
                    } else {
                        // Cancelado o vacío
                        alert("Acceso cancelado.");
                    }
                }
            }, true); // Use capture phase para interceptar antes que Bootstrap
        });
    });
})();
