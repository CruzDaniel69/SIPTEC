const API_AUTH = "https://siptec-1744e9407a56.herokuapp.com/api/auth";

const CLAVES_SESION = [
    "siptec-usuario-id",
    "siptec-role",
    "siptec-usuario-nombre",
    "siptec-usuario-apellido",
    "siptec-usuario-correo",
];

function limpiarSesionLocal() {
    CLAVES_SESION.forEach((clave) => localStorage.removeItem(clave));
}

export async function cerrarSesionCompleta(rutaLogin) {
    try {
        await fetch(`${API_AUTH}/logout`, { method: "POST", credentials: "include" });
    } catch (error) {
        console.error("No se pudo avisar al servidor del cierre de sesión: " + error);
    }

    limpiarSesionLocal();
    window.location.replace(rutaLogin);
}

export function exigirSesion(rutaLogin) {
    const irAlLogin = () => {
        limpiarSesionLocal();
        window.location.replace(rutaLogin);
    };

    async function comprobar() {
        if (!localStorage.getItem("siptec-usuario-id")) {
            irAlLogin();
            return;
        }

        try {
            const respuesta = await fetch(`${API_AUTH}/me`, { credentials: "include", cache: "no-store" });
            if (respuesta.status === 401) irAlLogin();
        } catch (error) {
            console.error("No se pudo verificar la sesión: " + error);
        }
    }

    if (!localStorage.getItem("siptec-usuario-id")) {
        irAlLogin();
        return;
    }

    comprobar();

    window.addEventListener("pageshow", (evento) => {
        if (evento.persisted) comprobar();
    });
}
