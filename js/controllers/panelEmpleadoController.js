import { obtenerPrestamos } from "../services/prestamoService.js";
import { obtenerEstadosPrestamo } from "../services/estadoPrestamoService.js";
import { obtenerHerramientas } from "../services/herramientaService.js";
import { obtenerDetallePrestamoHerramientas } from "../services/detallePrestamoHerramientaService.js";
import { obtenerAreas } from "../services/areaService.js";
import { obtenerDetallePrestamoAreas } from "../services/detallePrestamoAreaService.js";

function idUsuarioActual() {
    return Number(localStorage.getItem("siptec-usuario-id")) || 1;
}

function formatearFecha(fechaISO) {
    if (!fechaISO) return "-";
    const fecha = new Date(fechaISO + "T00:00:00");
    return fecha.toLocaleDateString("es-SV");
}

function claseEstadoPrestamo(nombreEstado) {
    const mapa = { PENDIENTE: "pendiente", APROBADO: "activo", ENTREGADO: "prestado", DEVUELTO: "devuelto", RECHAZADO: "daniado" };
    return mapa[nombreEstado] || "";
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

async function renderPanelEmpleadoView() {
    const statActivos = document.getElementById("statMisPrestamosActivos");
    if (!statActivos) return;

    mostrarNombreBienvenida();

    try {
        const [prestamos, estados, herramientas, detallesHerramienta, areas, detallesArea] = await Promise.all([
            obtenerPrestamos(),
            obtenerEstadosPrestamo(),
            obtenerHerramientas(),
            obtenerDetallePrestamoHerramientas(),
            obtenerAreas().catch(() => []),
            obtenerDetallePrestamoAreas().catch(() => []),
        ]);

        const idUsuario = idUsuarioActual();
        const misPrestamos = prestamos.filter((p) => p.usuario === idUsuario);

        const estadoPorId = (id) => estados.find((e) => e.id === id);
        const activos = misPrestamos.filter((p) => {
            const estado = estadoPorId(p.estado);
            return !p.fechaDevolucion && estado && ["APROBADO", "ENTREGADO"].includes(estado.nombreEstado);
        });
        const pendientes = misPrestamos.filter((p) => (estadoPorId(p.estado) || {}).nombreEstado === "PENDIENTE");

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const porVencer = activos.filter((p) => {
            if (!p.fechaEsperada) return false;
            const dias = Math.round((new Date(p.fechaEsperada) - hoy) / 86400000);
            return dias <= 3;
        });

        statActivos.textContent = activos.length;
        document.getElementById("statPorVencer").textContent = porVencer.length;
        document.getElementById("statMisPendientes").textContent = pendientes.length;

        const tbody = document.getElementById("misPrestamosActivosBody");
        if (tbody) {
            if (activos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center atenuado">No tienes préstamos activos.</td></tr>';
            } else {
                tbody.innerHTML = activos.map((prestamo) => {
                    const estado = estadoPorId(prestamo.estado);
                    const detalleHerramienta = detallesHerramienta.find((d) => d.prestamo === prestamo.id);
                    const detalleArea = detallesArea.find((d) => d.prestamoIdPrestamo === prestamo.id);

                    let recurso = "-";
                    if (detalleHerramienta) {
                        const herramienta = herramientas.find((h) => h.idHerramienta === detalleHerramienta.herramienta);
                        const totalPiezas = detallesHerramienta
                            .filter((d) => d.prestamo === prestamo.id)
                            .reduce((suma, d) => suma + (d.cantidad || 1), 0);
                        recurso = (herramienta ? herramienta.nombreHerramienta : "Herramienta") + ` (x${totalPiezas})`;
                    } else if (detalleArea) {
                        const area = areas.find((a) => a.id === detalleArea.areasIdArea);
                        recurso = area ? area.nombreArea : "Área";
                    }

                    return `
                    <tr>
                        <td>${recurso}</td>
                        <td>${formatearFecha(prestamo.fechaInicio)}</td>
                        <td>${formatearFecha(prestamo.fechaEsperada)}</td>
                        <td><span class="estado ${claseEstadoPrestamo(estado ? estado.nombreEstado : "")}">${estado ? estado.nombreEstado : "-"}</span></td>
                    </tr>`;
                }).join("");
            }
        }
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
