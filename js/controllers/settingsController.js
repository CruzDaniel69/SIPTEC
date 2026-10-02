import { obtenerUsuarioPorId, actualizarUsuario } from "../services/usuarioService.js";
import { cerrarSesionCompleta } from "../utils/sesion.js";

function idUsuarioActual() {
    return Number(localStorage.getItem("siptec-usuario-id")) || 1;
}

function cerrarSesion() {
    return cerrarSesionCompleta("../index.html");
}

function conectarLogout(boton) {
    if (!boton || boton.dataset.logoutConectado) return;
    boton.dataset.logoutConectado = "true";

    boton.addEventListener("click", async () => {
        const confirmacion = await Swal.fire({
            icon: "question",
            title: "¿Cerrar sesión?",
            showCancelButton: true,
            confirmButtonText: "Sí, salir",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#dc3545",
        });
        if (confirmacion.isConfirmed) cerrarSesion();
    });
}

function initLogout() {
    conectarLogout(document.getElementById("logoutBtn"));
    conectarLogout(document.getElementById("logoutBtnSettings"));
}

async function cargarPerfil() {
    const nombreInput = document.getElementById("settingsFirstName");
    const apellidoInput = document.getElementById("settingsLastName");
    if (!nombreInput || !apellidoInput) return;

    try {
        const usuario = await obtenerUsuarioPorId(idUsuarioActual());
        if (usuario) {
            nombreInput.value = usuario.nombreUsuario;
            apellidoInput.value = usuario.apellidoUsuario;
        }
    } catch (error) {
        console.error(error);
    }
}

function initGuardarPerfil() {
    const btnGuardar = document.getElementById("btnGuardarPerfil");
    if (!btnGuardar) return;

    btnGuardar.addEventListener("click", async () => {
        const nombre = document.getElementById("settingsFirstName").value.trim();
        const apellido = document.getElementById("settingsLastName").value.trim();

        if (!nombre || !apellido) {
            Swal.fire({ icon: "warning", title: "Datos incompletos", text: "Escribe tu nombre y apellido." });
            return;
        }

        try {
            const usuarioActual = await obtenerUsuarioPorId(idUsuarioActual());
            await actualizarUsuario(idUsuarioActual(), {
                nombreUsuario: nombre,
                apellidoUsuario: apellido,
                correoUsuario: usuarioActual.correoUsuario,
                passwordHash: usuarioActual.passwordHash,
                rol: usuarioActual.rol,
                institucion: usuarioActual.institucion,
            });
            Swal.fire({ icon: "success", title: "¡Perfil actualizado!", confirmButtonColor: "#28a745" });
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "No se pudo guardar el perfil", text: "Ocurrió un error al conectar con el servidor.", confirmButtonColor: "#dc3545" });
        }
    });
}

async function renderSettingsView() {
    await cargarPerfil();
    initGuardarPerfil();
    initLogout();
}

export function initSettingsController() {
    initLogout();

    document.addEventListener("view:loaded", (evento) => {
        if (evento.detail.view === "settings") {
            renderSettingsView();
        }
    });
}
