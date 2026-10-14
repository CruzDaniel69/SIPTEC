import { formatearFechaHora as formatearFecha } from "../utils/fechas.js";
import { usuarioActual, idUsuarioActual } from "../utils/sesion.js";
import { obtenerPrestamosPagina } from "../services/prestamoService.js";
import { pintarPaginador, TAMANO_PAGINA } from "../utils/paginacion.js";
import { mostrarAvisosRechazo } from "../utils/avisos.js";

let paginaActivos = 0;



function claseEstadoPrestamo(nombreEstado) {
    const mapa = { PENDIENTE: "pendiente", APROBADO: "activo", ENTREGADO: "prestado", DEVUELTO: "devuelto", RECHAZADO: "daniado" };
    return mapa[nombreEstado] || "";
}

function mostrarNombreBienvenida() {
    const titulo = document.getElementById("tituloBienvenida");
    if (!titulo) return;

    const { nombreUsuario: nombre, apellidoUsuario: apellido } = usuarioActual() || {};

    if (nombre) {
        titulo.textContent = `¡Bienvenido, ${nombre}${apellido ? " " + apellido : ""}!`;
    }
}

function fechaLocalISO(fecha) {
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function consultaActivos(extra = {}) {
    return obtenerPrestamosPagina({
        estados: ["APROBADO", "ENTREGADO"],
        usuario: idUsuarioActual(),
        sinDevolucion: true,
        ...extra,
    });
}

function pintarActivos(prestamos) {
    const tbody = document.getElementById("misPrestamosActivosBody");
    if (!tbody) return;

    if (prestamos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center atenuado">No tienes préstamos activos.</td></tr>';
        return;
    }

    tbody.innerHTML = prestamos.map((prestamo) => {
        let recurso = prestamo.nombreProducto;
        if (prestamo.tipo === "Herramienta" && prestamo.idHerramienta) {
            recurso += ` (x${prestamo.cantidad})`;
        }

        return `
        <tr>
            <td>${recurso}</td>
            <td>${formatearFecha(prestamo.fechaInicio)}</td>
            <td>${formatearFecha(prestamo.fechaEsperada)}</td>
            <td><span class="estado ${claseEstadoPrestamo(prestamo.nombreEstado)}">${prestamo.nombreEstado}</span></td>
        </tr>`;
    }).join("");
}

async function cargarActivos(pagina = paginaActivos) {
    const datos = await consultaActivos({ page: pagina, size: TAMANO_PAGINA });

    if (datos.content.length === 0 && pagina > 0) {
        return cargarActivos(pagina - 1);
    }

    paginaActivos = datos.page;
    pintarActivos(datos.content);
    pintarPaginador(document.getElementById("misActivosPaginador"), datos, async (destino) => {
        try {
            await cargarActivos(destino);
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "No se pudo cargar la página", text: "Revisa tu conexión con el servidor." });
        }
    });
    return datos;
}

async function renderPanelEmpleadoView() {
    const statActivos = document.getElementById("statMisPrestamosActivos");
    if (!statActivos) return;

    mostrarAvisosRechazo();
    mostrarNombreBienvenida();
    paginaActivos = 0;

    try {
        const limite = new Date();
        limite.setDate(limite.getDate() + 3);

        const [activos, porVencer, pendientes] = await Promise.all([
            cargarActivos(0),
            consultaActivos({ size: 5, vencenAntesDe: fechaLocalISO(limite) }),
            obtenerPrestamosPagina({ size: 5, estados: ["PENDIENTE"], usuario: idUsuarioActual() }),
        ]);

        statActivos.textContent = activos.totalElements;
        document.getElementById("statPorVencer").textContent = porVencer.totalElements;
        document.getElementById("statMisPendientes").textContent = pendientes.totalElements;
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: "error", title: "No se pudo cargar el panel", text: "Revisa tu conexión con el servidor." });
    }
}

export function initPanelEmpleadoController() {
    document.addEventListener("view:loaded", (evento) => {
        if (evento.detail.real === "loadDashboard-empleado") {
            renderPanelEmpleadoView();
        }
    });
}
