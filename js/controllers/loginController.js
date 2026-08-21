import { iniciarSesion } from "../services/authService.js";

function mostrarError(elementoError, mensaje) {
    elementoError.textContent = mensaje;
    elementoError.classList.remove("d-none");
}

function ocultarError(elementoError) {
    elementoError.classList.add("d-none");
}

export function initLoginController() {
    const formulario = document.getElementById("loginForm");
    const campoCorreo = document.getElementById("email");
    const campoContrasena = document.getElementById("password");
    const botonIngresar = document.getElementById("loginBtn");
    const cajaError = document.getElementById("loginError");

    if (!formulario) return;

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        ocultarError(cajaError);

        const correo = campoCorreo.value.trim();
        const clave = campoContrasena.value;

        if (!correo || !clave) {
            mostrarError(cajaError, "Ingresa tu correo y tu contraseña.");
            return;
        }

        botonIngresar.classList.add("disabled");
        const textoOriginalBoton = botonIngresar.textContent;
        botonIngresar.textContent = "Ingresando...";

        try {
            const usuario = await iniciarSesion(correo, clave);

            if (!usuario) {
                mostrarError(cajaError, "Correo o contraseña incorrectos.");
                return;
            }

            localStorage.setItem("siptec-usuario-id", usuario.id);
            localStorage.setItem("siptec-role", usuario.nombreRol);

            window.location.href = "pages/dashboard.html";
        }
        catch (error) {
            console.error(error);
            mostrarError(cajaError, "No se pudo conectar con el servidor. Intenta de nuevo.");
        }
        finally {
            botonIngresar.classList.remove("disabled");
            botonIngresar.textContent = textoOriginalBoton;
        }
    });
}

initLoginController();
