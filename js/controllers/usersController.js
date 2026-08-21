import { obtenerUsuarios, agregarUsuario, actualizarUsuario, eliminarUsuario } from "../services/usuarioService.js";
import { obtenerRoles } from "../services/rolService.js";
import { obtenerInstituciones } from "../services/institucionService.js";

const cache = { usuarios: [], roles: [], instituciones: [] };
let terminoBusqueda = "";
let modalesListos = false;

const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function cargarCatalogos() {
    const [usuarios, roles, instituciones] = await Promise.all([
        obtenerUsuarios(),
        obtenerRoles(),
        obtenerInstituciones(),
    ]);
    cache.usuarios = usuarios || [];
    cache.roles = roles || [];
    cache.instituciones = instituciones || [];
}

function usuariosFiltrados() {
    if (!terminoBusqueda.trim()) return cache.usuarios;
    const texto = terminoBusqueda.trim().toLowerCase();
    return cache.usuarios.filter((usuario) =>
        `${usuario.nombreUsuario} ${usuario.apellidoUsuario}`.toLowerCase().includes(texto) ||
        usuario.correoUsuario.toLowerCase().includes(texto));
}

function pintarTabla() {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    const usuarios = usuariosFiltrados();

    if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center atenuado">No se encontraron usuarios.</td></tr>';
        return;
    }

    tbody.innerHTML = usuarios.map((usuario) => {
        const rol = cache.roles.find((r) => r.id === usuario.rol);
        const institucion = cache.instituciones.find((i) => i.id === usuario.institucion);

        return `
        <tr>
            <td class="nombre-elemento"><span class="icono-elemento"><i class="bi bi-person"></i></span>${usuario.nombreUsuario} ${usuario.apellidoUsuario}</td>
            <td>${usuario.correoUsuario}</td>
            <td>${rol ? rol.nombreRol : "-"}</td>
            <td>${institucion ? institucion.nombreInstitucion : "-"}</td>
            <td><span class="estado activo">Activo</span></td>
            <td>
                <div class="acciones-fila">
                    <button type="button" title="Editar" data-bs-toggle="modal" data-bs-target="#userEditModal"
                        data-id="${usuario.id}" data-nombre="${usuario.nombreUsuario}" data-apellido="${usuario.apellidoUsuario}"
                        data-correo="${usuario.correoUsuario}" data-rol="${usuario.rol}" data-institucion="${usuario.institucion}">
                        <img src="../img/icons8-pencil-24.png" alt="Editar" class="icono-fila">
                    </button>
                    <button type="button" class="danger" title="Eliminar" data-eliminar="${usuario.id}">
                        <img src="../img/icons8-trash-24.png" alt="Eliminar" class="icono-fila">
                    </button>
                </div>
            </td>
        </tr>`;
    }).join("");
}

function idRolPorNombre(nombre) {
    const rol = cache.roles.find((r) => r.nombreRol === nombre);
    return rol ? rol.id : null;
}

function idInstitucionPorNombre(nombre) {
    const institucion = cache.instituciones.find((i) => i.nombreInstitucion === nombre);
    return institucion ? institucion.id : null;
}

function initModalCrear() {
    const userModal = document.getElementById("userModal");
    const form = document.getElementById("userForm");
    if (!userModal || !form) return;

    userModal.addEventListener("show.bs.modal", () => form.reset());

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const nombre = document.getElementById("userFirstName").value.trim();
        const apellido = document.getElementById("userLastName").value.trim();
        const correo = document.getElementById("userEmail").value.trim();
        const rolTexto = document.getElementById("userRole").value;
        const institucionTexto = document.getElementById("userInstitution").value;
        const password = document.getElementById("userPassword").value;

        if (!nombre || !apellido) {
            Swal.fire({ icon: "warning", title: "Datos incompletos", text: "Escribe el nombre y el apellido." });
            return;
        }
        if (!patronCorreo.test(correo)) {
            Swal.fire({ icon: "warning", title: "Correo inválido", text: "Ingresa un correo electrónico válido." });
            return;
        }
        if (!password || password.length < 4) {
            Swal.fire({ icon: "warning", title: "Contraseña muy corta", text: "La contraseña debe tener al menos 4 caracteres." });
            return;
        }
        if (cache.usuarios.some((u) => u.correoUsuario.toLowerCase() === correo.toLowerCase())) {
            Swal.fire({ icon: "warning", title: "Correo en uso", text: "Ya existe un usuario con ese correo." });
            return;
        }

        try {
            await agregarUsuario({
                nombreUsuario: nombre,
                apellidoUsuario: apellido,
                correoUsuario: correo,
                passwordHash: password,
                rol: idRolPorNombre(rolTexto),
                institucion: idInstitucionPorNombre(institucionTexto),
            });

            bootstrap.Modal.getOrCreateInstance(userModal).hide();
            Swal.fire({ icon: "success", title: "¡Usuario creado!", confirmButtonColor: "#28a745" });
            await recargarVista();
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "No se pudo crear el usuario", text: "Ocurrió un error al conectar con el servidor.", confirmButtonColor: "#dc3545" });
        }
    });
}

function initModalEditar() {
    const editModal = document.getElementById("userEditModal");
    const form = document.getElementById("userEditForm");
    if (!editModal || !form) return;

    editModal.addEventListener("show.bs.modal", (evento) => {
        const boton = evento.relatedTarget;
        if (!boton) return;

        document.getElementById("editUserId").value = boton.dataset.id;
        document.getElementById("editUserFirstName").value = boton.dataset.nombre;
        document.getElementById("editUserLastName").value = boton.dataset.apellido;
        document.getElementById("editUserEmail").value = boton.dataset.correo;
        document.getElementById("editUserPassword").value = "";

        const rol = cache.roles.find((r) => String(r.id) === boton.dataset.rol);
        if (rol) document.getElementById("editUserRole").value = rol.nombreRol;

        const institucion = cache.instituciones.find((i) => String(i.id) === boton.dataset.institucion);
        if (institucion) document.getElementById("editUserInstitution").value = institucion.nombreInstitucion;
    });

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const id = Number(document.getElementById("editUserId").value);
        const nombre = document.getElementById("editUserFirstName").value.trim();
        const apellido = document.getElementById("editUserLastName").value.trim();
        const correo = document.getElementById("editUserEmail").value.trim();
        const rolTexto = document.getElementById("editUserRole").value;
        const institucionTexto = document.getElementById("editUserInstitution").value;
        const password = document.getElementById("editUserPassword").value;

        if (!nombre || !apellido) {
            Swal.fire({ icon: "warning", title: "Datos incompletos", text: "Escribe el nombre y el apellido." });
            return;
        }
        if (!patronCorreo.test(correo)) {
            Swal.fire({ icon: "warning", title: "Correo inválido", text: "Ingresa un correo electrónico válido." });
            return;
        }
        if (password && password.length < 4) {
            Swal.fire({ icon: "warning", title: "Contraseña muy corta", text: "La contraseña debe tener al menos 4 caracteres." });
            return;
        }

        try {
            await actualizarUsuario(id, {
                nombreUsuario: nombre,
                apellidoUsuario: apellido,
                correoUsuario: correo,
                passwordHash: password,
                rol: idRolPorNombre(rolTexto),
                institucion: idInstitucionPorNombre(institucionTexto),
            });

            bootstrap.Modal.getOrCreateInstance(editModal).hide();
            Swal.fire({ icon: "success", title: "¡Cambios guardados!", confirmButtonColor: "#28a745" });
            await recargarVista();
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "No se pudo actualizar el usuario", text: "Ocurrió un error al conectar con el servidor.", confirmButtonColor: "#dc3545" });
        }
    });
}

function initModales() {
    if (modalesListos) return;
    modalesListos = true;
    initModalCrear();
    initModalEditar();
}

function initAccionesTabla() {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    tbody.addEventListener("click", async (evento) => {
        const botonEliminar = evento.target.closest("[data-eliminar]");
        if (!botonEliminar) return;

        const id = Number(botonEliminar.dataset.eliminar);

        const confirmacion = await Swal.fire({
            icon: "warning",
            title: "¿Eliminar usuario?",
            text: "Esta acción no se puede deshacer.",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            confirmButtonColor: "#dc3545",
            cancelButtonText: "Cancelar",
        });

        if (!confirmacion.isConfirmed) return;

        try {
            await eliminarUsuario(id);
            Swal.fire({ icon: "success", title: "Usuario eliminado", confirmButtonColor: "#28a745" });
            await recargarVista();
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "No se pudo eliminar", text: "Ocurrió un error al conectar con el servidor.", confirmButtonColor: "#dc3545" });
        }
    });
}

function initBusqueda() {
    const buscador = document.getElementById("usersSearch");
    if (!buscador) return;
    buscador.addEventListener("input", () => {
        terminoBusqueda = buscador.value;
        pintarTabla();
    });
}

async function recargarVista() {
    try {
        await cargarCatalogos();
        pintarTabla();
    } catch (error) {
        console.error(error);
    }
}

async function renderUsersView() {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    terminoBusqueda = "";

    try {
        await cargarCatalogos();
        pintarTabla();
        initAccionesTabla();
        initBusqueda();
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">No se pudo cargar la lista de usuarios. Revisa tu conexión con el servidor.</td></tr>';
        Swal.fire({ icon: "error", title: "No se pudo cargar la lista de usuarios", text: "Revisa tu conexión con el servidor." });
    }
}

export function initUsersController() {
    initModales();

    document.addEventListener("view:loaded", (evento) => {
        if (evento.detail.view === "users") {
            renderUsersView();
        }
    });
}
