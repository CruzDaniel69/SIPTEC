import { formatearFechaHora as formatearFecha } from "../utils/fechas.js";
import { usuarioActual } from "../utils/sesion.js";
import { obtenerPrestamosPagina } from "../services/prestamoService.js";
import { obtenerResumenDashboard } from "../services/dashboardService.js";


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

function diasDeLaSemanaActual() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diasDesdeLunes = (hoy.getDay() + 6) % 7;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - diasDesdeLunes);

    return Array.from({ length: 7 }, (_, i) => {
        const dia = new Date(lunes);
        dia.setDate(lunes.getDate() + i);
        return fechaLocalISO(dia);
    });
}

function pintarGraficoSemanal(conteos, diasSemana) {
    const contenedor = document.getElementById("graficoSemanal");
    if (!contenedor) return;

    const maximo = Math.max(...conteos, 1);
    contenedor.innerHTML = conteos.map((cantidad) =>
        `<div class="barra" style="height:${cantidad === 0 ? 2 : Math.max(8, Math.round((cantidad / maximo) * 100))}%"><span>${cantidad}</span></div>`
    ).join("");

    const rango = document.getElementById("graficoSemanalRango");
    if (rango) {
        const formato = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("es-SV", { day: "2-digit", month: "short" });
        rango.textContent = `Semana del ${formato(diasSemana[0])} al ${formato(diasSemana[6])} (por fecha de inicio, sin rechazados)`;
    }
}

async function renderPanelView() {
    const statTotal = document.getElementById("statTotalImplementos");
    if (!statTotal) return;

    mostrarNombreBienvenida();

    try {
        const diasSemana = diasDeLaSemanaActual();

        const [resumen, recientes] = await Promise.all([
            obtenerResumenDashboard(diasSemana[0]),
            obtenerPrestamosPagina({ page: 0, size: 5, estados: ["APROBADO", "ENTREGADO", "DEVUELTO", "RECHAZADO"] }),
        ]);

        const cantDisponibles = resumen.disponibles;
        const cantPrestados = resumen.prestados;
        const cantDanados = resumen.danados;
        const totalDetalles = resumen.totalPiezas || 1;

        document.getElementById("statTotalImplementos").textContent = resumen.totalStock;
        document.getElementById("statPrestamosActivos").textContent = resumen.prestamosActivos;
        document.getElementById("statDevolucionesPendientes").textContent = cantPrestados;
        document.getElementById("statDisponibles").textContent = cantDisponibles;

        const badgePendientesAprobar = document.getElementById("badgePendientesAprobar");
        if (badgePendientesAprobar) {
            badgePendientesAprobar.textContent = resumen.pendientesAprobar;
            badgePendientesAprobar.hidden = resumen.pendientesAprobar === 0;
        }

        pintarGraficoSemanal(resumen.semana, diasSemana);

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
            if (recientes.content.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center atenuado">Aún no hay actividad registrada.</td></tr>';
            } else {
                const mapa = { PENDIENTE: "pendiente", APROBADO: "activo", ENTREGADO: "prestado", DEVUELTO: "devuelto", RECHAZADO: "daniado" };

                tbody.innerHTML = recientes.content.map((prestamo) => `
                    <tr>
                        <td><i class="bi bi-tools me-2"></i>${prestamo.nombreProducto}</td>
                        <td>${prestamo.nombreUsuario || "-"}</td>
                        <td>${formatearFecha(prestamo.fechaInicio)}</td>
                        <td>${formatearFecha(prestamo.fechaDevolucion)}</td>
                        <td><span class="estado ${mapa[prestamo.nombreEstado] || ""}">${prestamo.nombreEstado}</span></td>
                    </tr>`).join("");
            }
        }
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: "error", title: "No se pudo cargar el panel", text: "Revisa tu conexión con el servidor." });
        // Los números que no llegaron dejan de ser marcador de carga
        document.querySelectorAll(".tarjeta-estadistica strong:empty").forEach((numero) => { numero.textContent = "-"; });
    }
}

export function initPanelController() {
    document.addEventListener("view:loaded", (evento) => {
        if (evento.detail.view === "loadDashboard") {
            renderPanelView();
        }
    });
}
