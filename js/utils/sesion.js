const API_AUTH = "https://siptec-1744e9407a56.herokuapp.com/api/auth";

// Claves que versiones anteriores guardaban en el navegador; se borran para no dejar datos de usuario ahí
const CLAVES_ANTIGUAS = [
    "siptec-usuario-id",
    "siptec-role",
    "siptec-usuario-nombre",
    "siptec-usuario-apellido",
    "siptec-usuario-correo",
];

// Datos del usuario de la sesión. Viven solo en memoria: al recargar la página se vuelven a pedir a la API.
let usuario = null;

export function limpiarDatosAntiguos() {
    try {
        CLAVES_ANTIGUAS.forEach((clave) => localStorage.removeItem(clave));
    } catch (error) {
        console.error("No se pudo limpiar el almacenamiento local: " + error);
    }
}

export function usuarioActual() {
    return usuario;
}

export function idUsuarioActual() {
    return usuario ? usuario.id : null;
}

export function rolActual() {
    return usuario && usuario.nombreRol ? usuario.nombreRol.toUpperCase() : "";
}

async function pedirSesion() {
    const respuesta = await fetch(`${API_AUTH}/me`, { credentials: "include", cache: "no-store" });
    if (respuesta.status === 401) return null;
    if (!respuesta.ok) throw new Error("Error al verificar la sesión: " + respuesta.status);

    const resultado = await respuesta.json();
    return resultado.data;
}

export async function cerrarSesionCompleta(rutaLogin) {
    try {
        await fetch(`${API_AUTH}/logout`, { method: "POST", credentials: "include" });
    } catch (error) {
        console.error("No se pudo avisar al servidor del cierre de sesión: " + error);
    }

    usuario = null;
    limpiarDatosAntiguos();
    window.location.replace(rutaLogin);
}

/**
 * Pregunta a la API quién es el usuario de la cookie y lo guarda en memoria.
 * Si no hay sesión válida manda al login y no resuelve nunca, para que la página no siga cargando.
 */
export async function cargarSesion(rutaLogin) {
    limpiarDatosAntiguos();

    const irAlLogin = () => {
        usuario = null;
        window.location.replace(rutaLogin);
        return new Promise(() => {});
    };

    try {
        usuario = await pedirSesion();
    } catch (error) {
        console.error("No se pudo verificar la sesión: " + error);
        return irAlLogin();
    }

    if (!usuario) return irAlLogin();

    // Al volver con "atrás" el navegador puede mostrar la página de memoria: se revalida la sesión
    window.addEventListener("pageshow", async (evento) => {
        if (!evento.persisted) return;
        try {
            if (!(await pedirSesion())) irAlLogin();
        } catch (error) {
            console.error("No se pudo verificar la sesión: " + error);
        }
    });

    return usuario;
}
