import { obtenerDetallesHerramienta } from "../services/detalleHerramientaService.js";
import { obtenerEstadosHerramienta } from "../services/estadoHerramientaService.js";
import { obtenerPrestamos } from "../services/prestamoService.js";
import { obtenerEstadosPrestamo } from "../services/estadoPrestamoService.js";
import { obtenerDetallePrestamoHerramientas } from "../services/detallePrestamoHerramientaService.js";
import { obtenerHerramientas } from "../services/herramientaService.js";
import { obtenerUsuarios } from "../services/usuarioService.js";

function formatearFecha(fechaISO) {
    if (!fechaISO) return "-";
    const fecha = new Date(fechaISO + "T00:00:00");
    return fecha.toLocaleDateString("es-SV");
}

function mostrarNombreBienvenida() {
    const titulo = document.getElementById("tituloBienvenida");
    if (!titulo) return;

    const nombre = localStorage.getItem("siptec-usuario-nombre");
    const apellido = localStorage.getItem("siptec-usuario-apellido");

    if (nombre) {
        titulo.textContent = `¡Bienvenido, ${nombre}${apellido ? " " + apellido : ""}!`;
    }
}

async function renderPanelView() {
    const statTotal = document.getElementById("statTotalImplementos");
    if (!statTotal) return;

    mostrarNombreBienvenida();

    try {
        const [detalles, estadosHerramienta, prestamos, estadosPrestamo, detallesPrestamo, herramientas, usuarios] = await Promise.all([
            obtenerDetallesHerramienta(),
            obtenerEstadosHerramienta(),
            obtenerPrestamos(),
            obtenerEstadosPrestamo(),
            obtenerDetallePrestamoHerramientas(),
            obtenerHerramientas(),
            obtenerUsuarios(),
        ]);

        const idEstado = (nombre) => (estadosHerramienta.find((e) => e.nombreEstadoHerramienta === nombre) || {}).id;
        const idDisponible = idEstado("DISPONIBLE");
        const idEnPrestamo = idEstado("EN PRESTAMO");
        const idDanado = idEstado("DAÑADO");

        const totalStock = herramientas.reduce((suma, h) => suma + (h.stock || 0), 0);
        const cantDisponibles = detalles.filter((d) => d.idEstadoHerramienta === idDisponible).length;
        const cantPrestados = detalles.filter((d) => d.idEstadoHerramienta === idEnPrestamo).length;
        const cantDanados = detalles.filter((d) => d.idEstadoHerramienta === idDanado).length;
        const totalDetalles = detalles.length || 1;

        const estadosActivos = ["PENDIENTE", "APROBADO", "ENTREGADO"];
        const prestamosActivos = prestamos.filter((p) => {
            if (p.fechaDevolucion) return false;
            const estado = estadosPrestamo.find((e) => e.id === p.estado);
            return estado && estadosActivos.includes(estado.nombreEstado);
        });

        document.getElementById("statTotalImplementos").textContent = totalStock;
        document.getElementById("statPrestamosActivos").textContent = prestamosActivos.length;
        document.getElementById("statDevolucionesPendientes").textContent = cantPrestados;
        document.getElementById("statDisponibles").textContent = cantDisponibles;

        const badgePendientesAprobar = document.getElementById("badgePendientesAprobar");
        if (badgePendientesAprobar) {
            const cantPendientesAprobar = prestamos.filter((p) => {
                const estado = estadosPrestamo.find((e) => e.id === p.estado);
                return estado && estado.nombreEstado === "PENDIENTE";
            }).length;

            badgePendientesAprobar.textContent = cantPendientesAprobar;
            badgePendientesAprobar.hidden = cantPendientesAprobar === 0;
        }

        const pctDisponibles = Math.round((cantDisponibles / totalDetalles) * 100);
        const pctPrestados = Math.round((cantPrestados / totalDetalles) * 100);
        const pctDanados = Math.max(0, 100 - pctDisponibles - pctPrestados);

        document.getElementById("leyendaDisponibles").textContent = `${cantDisponibles} (${pctDisponibles}%)`;
        document.getElementById("leyendaPrestados").textContent = `${cantPrestados} (${pctPrestados}%)`;
        document.getElementById("leyendaDanados").textContent = `${cantDanados} (${pctDanados}%)`;

        const grafico = document.getElementById("graficoCircularInventario");
        if (grafico) {
            const corte1 = pctDisponibles;
            const corte2 = pctDisponibles + pctPrestados;
            grafico.style.background = `conic-gradient(#33c24d 0 ${corte1}%, var(--blue) ${corte1}% ${corte2}%, #ffdd28 ${corte2}% 100%)`;
        }

        const tbody = document.getElementById("actividadRecienteBody");
        if (tbody) {
            const recientes = prestamos
                .filter((p) => {
                    const estado = estadosPrestamo.find((e) => e.id === p.estado);
                    return estado && estado.nombreEstado !== "PENDIENTE";
                })
                .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio))
                .slice(0, 5);

            if (recientes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center atenuado">Aún no hay actividad registrada.</td></tr>';
            } else {
                tbody.innerHTML = recientes.map((prestamo) => {
                    const usuario = usuarios.find((u) => u.id === prestamo.usuario);
                    const detallePrestamo = detallesPrestamo.find((d) => d.prestamo === prestamo.id);
                    const herramienta = detallePrestamo ? herramientas.find((h) => h.idHerramienta === detallePrestamo.herramienta) : null;
                    const estado = estadosPrestamo.find((e) => e.id === prestamo.estado);
                    const mapa = { PENDIENTE: "pendiente", APROBADO: "activo", ENTREGADO: "prestado", DEVUELTO: "devuelto", RECHAZADO: "daniado" };

                    return `
                    <tr>
                        <td><i class="bi bi-tools me-2"></i>${herramienta ? herramienta.nombreHerramienta : "Área asignada"}</td>
                        <td>${usuario ? `${usuario.nombreUsuario} ${usuario.apellidoUsuario}` : "-"}</td>
                        <td>${formatearFecha(prestamo.fechaInicio)}</td>
                        <td>${formatearFecha(prestamo.fechaDevolucion)}</td>
                        <td><span class="estado ${mapa[estado ? estado.nombreEstado : ""] || ""}">${estado ? estado.nombreEstado : "-"}</span></td>
                    </tr>`;
                }).join("");
            }
        }
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: "error", title: "No se pudo cargar el panel", text: "Revisa tu conexión con el servidor." });
    }
}

export function initPanelController() {
    document.addEventListener("view:loaded", (evento) => {
        if (evento.detail.view === "loadDashboard") {
            renderPanelView();
        }
    });
}
