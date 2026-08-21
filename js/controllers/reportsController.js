import { obtenerPrestamos } from "../services/prestamoService.js";
import { obtenerEstadosPrestamo } from "../services/estadoPrestamoService.js";
import { obtenerUsuarios } from "../services/usuarioService.js";
import { obtenerHerramientas } from "../services/herramientaService.js";
import { obtenerDetallesHerramienta, actualizarDetalleHerramienta } from "../services/detalleHerramientaService.js";
import { obtenerDetallePrestamoHerramientas } from "../services/detallePrestamoHerramientaService.js";
import { obtenerAreas } from "../services/areaService.js";
import { obtenerDetallePrestamoAreas } from "../services/detallePrestamoAreaService.js";
import { obtenerEstadosHerramienta } from "../services/estadoHerramientaService.js";
import { puedeGestionar } from "../utils/rol.js";

const cache = {
    prestamos: [], estados: [], usuarios: [], herramientas: [], detallesHerramienta: [],
    detallesPrestamoHerramienta: [], areas: [], detallesPrestamoArea: [], estadosHerramienta: [],
};
let modalListo = false;

function codigoPrestamo(id) {
    return "PR-" + String(id).padStart(3, "0");
}

async function cargarCatalogos() {
    const [prestamos, estados, usuarios, herramientas, detallesHerramienta, detallesPrestamoHerramienta, areas, detallesPrestamoArea, estadosHerramienta] = await Promise.all([
        obtenerPrestamos(),
        obtenerEstadosPrestamo(),
        obtenerUsuarios(),
        obtenerHerramientas(),
        obtenerDetallesHerramienta(),
        obtenerDetallePrestamoHerramientas(),
        obtenerAreas().catch(() => []),
        obtenerDetallePrestamoAreas().catch(() => []),
        obtenerEstadosHerramienta(),
    ]);

    cache.prestamos = prestamos || [];
    cache.estados = estados || [];
    cache.usuarios = usuarios || [];
    cache.herramientas = herramientas || [];
    cache.detallesHerramienta = detallesHerramienta || [];
    cache.detallesPrestamoHerramienta = detallesPrestamoHerramienta || [];
    cache.areas = areas || [];
    cache.detallesPrestamoArea = detallesPrestamoArea || [];
    cache.estadosHerramienta = estadosHerramienta || [];
}

function productoDePrestamo(prestamo) {
    const detalleHerramienta = cache.detallesPrestamoHerramienta.find((d) => d.prestamo === prestamo.id);
    if (detalleHerramienta) {
        const herramienta = cache.herramientas.find((h) => h.idHerramienta === detalleHerramienta.herramienta);
        return herramienta ? herramienta.nombreHerramienta : "Herramienta #" + detalleHerramienta.herramienta;
    }
    const detalleArea = cache.detallesPrestamoArea.find((d) => d.prestamoIdPrestamo === prestamo.id);
    if (detalleArea) {
        const area = cache.areas.find((a) => a.id === detalleArea.areasIdArea);
        return area ? area.nombreArea : "Área #" + detalleArea.areasIdArea;
    }
    return "Préstamo #" + prestamo.id;
}

function pintarHistorial() {
    const tbody = document.getElementById("reportesHistorialBody");
    if (!tbody) return;

    const filas = cache.prestamos
        .filter((p) => p.fechaDevolucion || (cache.estados.find((e) => e.id === p.estado) || {}).nombreEstado === "RECHAZADO")
        .map((p) => {
            const usuario = cache.usuarios.find((u) => u.id === p.usuario);
            const estado = cache.estados.find((e) => e.id === p.estado);
            return {
                titulo: `${codigoPrestamo(p.id)} — ${productoDePrestamo(p)}`,
                usuario: usuario ? `${usuario.nombreUsuario} ${usuario.apellidoUsuario}` : "-",
                fecha: p.fechaDevolucion || p.fechaInicio,
                tipo: estado ? estado.nombreEstado : "-",
            };
        })
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (filas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center atenuado">Aún no hay reportes generados.</td></tr>';
        return;
    }

    tbody.innerHTML = filas.map((fila) => `
        <tr>
            <td>${fila.titulo}</td>
            <td>${fila.usuario}</td>
            <td>${fila.fecha}</td>
            <td><span class="estado ${fila.tipo === "RECHAZADO" ? "daniado" : "activo"}">${fila.tipo}</span></td>
        </tr>
    `).join("");
}

function itemsDanados() {
    const idDanado = (cache.estadosHerramienta.find((e) => e.nombreEstadoHerramienta === "DAÑADO") || {}).id;
    return cache.detallesHerramienta
        .filter((d) => d.idEstadoHerramienta === idDanado)
        .map((detalle) => {
            const herramienta = cache.herramientas.find((h) => h.idHerramienta === detalle.idHerramienta);
            return { detalle, nombre: herramienta ? herramienta.nombreHerramienta : "Equipo #" + detalle.idHerramienta };
        });
}

function pintarGenerados() {
    const grid = document.getElementById("reportesGeneradosGrid");
    if (!grid) return;

    const items = itemsDanados();

    if (items.length === 0) {
        grid.innerHTML = '<p class="atenuado">No hay equipos dañados reportados.</p>';
        return;
    }

    const puedeResolver = puedeGestionar(["ADMINISTRADOR", "IT"]);

    grid.innerHTML = items.map(({ detalle, nombre }) => `
        <div class="tarjeta-devolucion">
            <div class="top-row">
                <h4 style="margin:0;">Daño reportado: ${nombre}</h4>
                <span class="estado daniado">Daño</span>
            </div>
            <p class="atenuado" style="margin-bottom:16px;">Código de inventario: ${detalle.codInv}</p>
            <div class="card-actions">
                <button type="button" class="boton-pastilla boton-contorno" data-ver-danio="${detalle.idDetalle}"><i class="bi bi-eye"></i> Ver</button>
                <div class="dropdown">
                    <button class="boton-pastilla boton-solido-azul dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="bi bi-download"></i> Exportar
                    </button>
                    <ul class="dropdown-menu">
                        <li><button class="dropdown-item" type="button" data-export="txt" data-iddetalle="${detalle.idDetalle}">TXT</button></li>
                        <li><button class="dropdown-item" type="button" data-export="pdf" data-iddetalle="${detalle.idDetalle}">PDF</button></li>
                        <li><button class="dropdown-item" type="button" data-export="csv" data-iddetalle="${detalle.idDetalle}">CSV</button></li>
                        <li><button class="dropdown-item" type="button" data-export="excel" data-iddetalle="${detalle.idDetalle}">Excel</button></li>
                    </ul>
                </div>
                ${puedeResolver ? `
                <button type="button" class="boton-pastilla boton-solido-rojo" title="Marcar como resuelto" data-resolver="${detalle.idDetalle}">
                    <img src="../img/icons8-trash-24.png" alt="Eliminar" class="icono-fila" style="filter:invert(1); opacity:1;">
                </button>` : ""}
            </div>
        </div>
    `).join("");
}

function contenidoReporte(detalle, nombre) {
    return `Reporte de daño\nEquipo: ${nombre}\nCódigo de inventario: ${detalle.codInv}\nEstado: DAÑADO`;
}

function descargarArchivo(nombre, contenido, tipoMime) {
    const blob = new Blob([contenido], { type: tipoMime });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
}

function exportarDanio(idDetalle, formato) {
    const item = itemsDanados().find(({ detalle }) => detalle.idDetalle === idDetalle);
    if (!item) return;

    const contenido = contenidoReporte(item.detalle, item.nombre);
    const base = `reporte-${item.detalle.codInv}`;

    if (formato === "txt") {
        descargarArchivo(`${base}.txt`, contenido, "text/plain");
    } else if (formato === "csv" || formato === "excel") {
        const csv = "Equipo,Código,Estado\n" + `"${item.nombre}","${item.detalle.codInv}","DAÑADO"`;
        descargarArchivo(`${base}.csv`, csv, "text/csv");
    } else if (formato === "pdf") {
        const ventana = window.open("", "_blank");
        if (ventana) {
            ventana.document.write(`<pre>${contenido}</pre>`);
            ventana.document.close();
            ventana.focus();
            ventana.print();
        }
    }
}

async function resolverDanio(idDetalle) {
    const item = itemsDanados().find(({ detalle }) => detalle.idDetalle === idDetalle);
    if (!item) return;

    const confirmacion = await Swal.fire({
        icon: "warning",
        title: "¿Marcar como resuelto?",
        text: "El equipo volverá a estar disponible en el inventario.",
        showCancelButton: true,
        confirmButtonText: "Sí, resolver",
        confirmButtonColor: "#28a745",
        cancelButtonText: "Cancelar",
    });

    if (!confirmacion.isConfirmed) return;

    const estadoDisponible = cache.estadosHerramienta.find((e) => e.nombreEstadoHerramienta === "DISPONIBLE");
    if (!estadoDisponible) return;

    try {
        await actualizarDetalleHerramienta(item.detalle.idDetalle, {
            idHerramienta: item.detalle.idHerramienta,
            idMarca: item.detalle.idMarca,
            idEstadoHerramienta: estadoDisponible.id,
            codInv: item.detalle.codInv,
        });
        Swal.fire({ icon: "success", title: "Equipo actualizado", confirmButtonColor: "#28a745" });
        await recargarVista();
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: "error", title: "No se pudo actualizar el equipo", text: "Ocurrió un error al conectar con el servidor.", confirmButtonColor: "#dc3545" });
    }
}

function initModalVisor() {
    if (modalListo) return;
    modalListo = true;

    const modal = document.getElementById("reportViewerModal");
    if (!modal) return;

    const copiarBtn = document.getElementById("copyReportBtn");
    if (copiarBtn) {
        copiarBtn.addEventListener("click", () => {
            const contenido = document.getElementById("reportViewerContent").textContent;
            navigator.clipboard.writeText(contenido);
            Swal.fire({ icon: "success", title: "Copiado al portapapeles", timer: 1200, showConfirmButton: false });
        });
    }

    modal.querySelectorAll("[data-export-viewed]").forEach((boton) => {
        boton.addEventListener("click", () => {
            const idDetalle = Number(modal.dataset.idDetalle);
            exportarDanio(idDetalle, boton.dataset.exportViewed);
        });
    });
}

function initEventosGrid() {
    const grid = document.getElementById("reportesGeneradosGrid");
    if (!grid) return;

    grid.addEventListener("click", (evento) => {
        const verBtn = evento.target.closest("[data-ver-danio]");
        const exportBtn = evento.target.closest("[data-export]");
        const resolverBtn = evento.target.closest("[data-resolver]");

        if (verBtn) {
            const idDetalle = Number(verBtn.dataset.verDanio);
            const item = itemsDanados().find(({ detalle }) => detalle.idDetalle === idDetalle);
            if (!item) return;
            document.getElementById("reportViewerTitle").textContent = "Daño reportado: " + item.nombre;
            document.getElementById("reportViewerContent").textContent = contenidoReporte(item.detalle, item.nombre);
            document.getElementById("reportViewerModal").dataset.idDetalle = idDetalle;
        }

        if (exportBtn) {
            exportarDanio(Number(exportBtn.dataset.iddetalle), exportBtn.dataset.export);
        }

        if (resolverBtn) {
            resolverDanio(Number(resolverBtn.dataset.resolver));
        }
    });
}

async function recargarVista() {
    await cargarCatalogos();
    pintarHistorial();
    pintarGenerados();
}

async function renderReportsView() {
    const tbody = document.getElementById("reportesHistorialBody");
    if (!tbody) return;

    try {
        await cargarCatalogos();
        pintarHistorial();
        pintarGenerados();
        initModalVisor();
        initEventosGrid();
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">No se pudieron cargar los reportes. Revisa tu conexión con el servidor.</td></tr>';
        Swal.fire({ icon: "error", title: "No se pudieron cargar los reportes", text: "Revisa tu conexión con el servidor." });
    }
}

export function initReportsController() {
    document.addEventListener("view:loaded", (evento) => {
        if (evento.detail.view === "reports") {
            renderReportsView();
        }
    });
}
