import { formatearFechaHora } from "../utils/fechas.js";
import { obtenerPrestamosPagina } from "../services/prestamoService.js";
import { actualizarDetalleHerramienta } from "../services/detalleHerramientaService.js";
import { obtenerEstadosHerramienta } from "../services/estadoHerramientaService.js";
import { obtenerPiezasPagina } from "../services/inventarioService.js";
import { pintarPaginador, TAMANO_PAGINA } from "../utils/paginacion.js";
import { puedeGestionar } from "../utils/rol.js";

const cache = { estadosHerramienta: [], danados: [] };
let paginaHistorial = 0;
let paginaDanados = 0;
let danadosCargados = false;
let modalListo = false;
let modoSeleccion = false;
let seleccionados = new Set();
const informacionSeleccion = new Map();

function codigoPrestamo(id) {
    return "PR-" + String(id).padStart(3, "0");
}

async function cargarCatalogos() {
    cache.estadosHerramienta = (await obtenerEstadosHerramienta()) || [];
}

async function cargarHistorial(pagina = paginaHistorial) {
    const datos = await obtenerPrestamosPagina({ page: pagina, size: TAMANO_PAGINA, estados: ["DEVUELTO", "RECHAZADO"] });

    if (datos.content.length === 0 && pagina > 0) {
        return cargarHistorial(pagina - 1);
    }

    paginaHistorial = datos.page;
    pintarHistorial(datos.content);
    pintarPaginador(document.getElementById("reportesHistorialPaginador"), datos, cargarHistorialSeguro);
}

async function cargarHistorialSeguro(pagina) {
    try {
        await cargarHistorial(pagina);
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: "error", title: "No se pudo cargar la página", text: "Revisa tu conexión con el servidor." });
    }
}

function pintarHistorial(prestamos) {
    const tbody = document.getElementById("reportesHistorialBody");
    if (!tbody) return;

    if (prestamos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center atenuado">Aún no hay reportes generados.</td></tr>';
        return;
    }

    tbody.innerHTML = prestamos.map((p) => `
        <tr>
            <td>${codigoPrestamo(p.id)} — ${p.nombreProducto}</td>
            <td>${p.nombreUsuario || "-"}</td>
            <td>${formatearFechaHora(p.fechaDevolucion || p.fechaInicio)}</td>
            <td><span class="estado ${p.nombreEstado === "RECHAZADO" ? "daniado" : "activo"}">${p.nombreEstado}</span></td>
        </tr>
    `).join("");
}

function convertirItemDanado(pieza) {
    return {
        detalle: {
            idDetalle: pieza.idDetalle,
            idHerramienta: pieza.idHerramienta,
            idMarca: pieza.idMarca,
            idEstadoHerramienta: pieza.idEstadoHerramienta,
            codInv: pieza.codInv,
        },
        nombre: pieza.nombreHerramienta || "Equipo #" + pieza.idHerramienta,
    };
}

async function cargarDanados(pagina = paginaDanados) {
    const datos = await obtenerPiezasPagina({ page: pagina, size: TAMANO_PAGINA, estado: "DAÑADO" });

    if (datos.content.length === 0 && pagina > 0) {
        return cargarDanados(pagina - 1);
    }

    paginaDanados = datos.page;
    danadosCargados = true;
    cache.danados = datos.content.map(convertirItemDanado);
    pintarGenerados();
    pintarPaginador(document.getElementById("reportesGeneradosPaginador"), datos, cargarDanadosSeguro);
}

async function cargarDanadosSeguro(pagina) {
    try {
        await cargarDanados(pagina);
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: "error", title: "No se pudo cargar la página", text: "Revisa tu conexión con el servidor." });
    }
}

function buscarItemDanado(idDetalle) {
    return cache.danados.find(({ detalle }) => detalle.idDetalle === idDetalle) || informacionSeleccion.get(idDetalle) || null;
}

function pintarGenerados() {
    const grid = document.getElementById("reportesGeneradosGrid");
    if (!grid) return;

    const items = cache.danados;

    if (items.length === 0) {
        grid.innerHTML = '<p class="atenuado">No hay equipos dañados reportados.</p>';
        return;
    }

    const puedeResolver = puedeGestionar(["ADMINISTRADOR", "IT"]);

    grid.innerHTML = items.map(({ detalle, nombre }) => `
        <div class="tarjeta-devolucion ${modoSeleccion ? "seleccionable" : ""} ${seleccionados.has(detalle.idDetalle) ? "seleccionada" : ""}" data-iddetalle="${detalle.idDetalle}">
            <input type="checkbox" class="check-seleccion-reporte" data-check-item="${detalle.idDetalle}" ${seleccionados.has(detalle.idDetalle) ? "checked" : ""}>
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
    const item = buscarItemDanado(idDetalle);
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
    const item = buscarItemDanado(idDetalle);
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
        seleccionados.delete(idDetalle);
        informacionSeleccion.delete(idDetalle);
        actualizarContadorSeleccion();
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

function actualizarContadorSeleccion() {
    const contador = document.getElementById("contadorSeleccionReportes");
    if (contador) contador.textContent = `${seleccionados.size} seleccionados`;
}

function alternarSeleccion(idDetalle, marcado) {
    const tarjeta = document.querySelector(`.tarjeta-devolucion[data-iddetalle="${idDetalle}"]`);
    if (marcado) {
        seleccionados.add(idDetalle);
        const item = buscarItemDanado(idDetalle);
        if (item) informacionSeleccion.set(idDetalle, item);
        if (tarjeta) tarjeta.classList.add("seleccionada");
    } else {
        seleccionados.delete(idDetalle);
        informacionSeleccion.delete(idDetalle);
        if (tarjeta) tarjeta.classList.remove("seleccionada");
    }
    actualizarContadorSeleccion();
}

function exportarSeleccionados(formato) {
    if (seleccionados.size === 0) {
        Swal.fire({ icon: "warning", title: "Selecciona al menos un reporte", text: "Marca uno o varios reportes de daño para exportarlos juntos." });
        return;
    }

    const items = Array.from(seleccionados).map((id) => informacionSeleccion.get(id)).filter(Boolean);
    const contenido = items.map(({ detalle, nombre }) => contenidoReporte(detalle, nombre)).join("\n\n---\n\n");

    if (formato === "txt") {
        descargarArchivo("reportes-danios.txt", contenido, "text/plain");
    } else if (formato === "csv") {
        const filasCsv = items.map(({ detalle, nombre }) => `"${nombre}","${detalle.codInv}","DAÑADO"`).join("\n");
        descargarArchivo("reportes-danios.csv", "Equipo,Código,Estado\n" + filasCsv, "text/csv");
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

function initBarraSeleccion() {
    const btnModo = document.getElementById("btnModoSeleccionReportes");
    const acciones = document.getElementById("accionesSeleccionReportes");
    const btnCancelar = document.getElementById("btnCancelarSeleccionReportes");
    if (!btnModo) return;

    function salirModoSeleccion() {
        modoSeleccion = false;
        seleccionados = new Set();
        informacionSeleccion.clear();
        if (acciones) {
            acciones.classList.add("d-none");
            acciones.classList.remove("d-flex");
        }
        btnModo.classList.remove("d-none");
        pintarGenerados();
    }

    function entrarModoSeleccion() {
        modoSeleccion = true;
        seleccionados = new Set();
        informacionSeleccion.clear();
        if (acciones) {
            acciones.classList.remove("d-none");
            acciones.classList.add("d-flex");
        }
        btnModo.classList.add("d-none");
        actualizarContadorSeleccion();
        pintarGenerados();
    }

    btnModo.addEventListener("click", entrarModoSeleccion);
    if (btnCancelar) btnCancelar.addEventListener("click", salirModoSeleccion);

    document.querySelectorAll("[data-export-seleccion]").forEach((boton) => {
        boton.addEventListener("click", () => exportarSeleccionados(boton.dataset.exportSeleccion));
    });
}

function initEventosGrid() {
    const grid = document.getElementById("reportesGeneradosGrid");
    if (!grid) return;

    grid.addEventListener("change", (evento) => {
        const check = evento.target.closest(".check-seleccion-reporte");
        if (!check) return;
        alternarSeleccion(Number(check.dataset.checkItem), check.checked);
    });

    grid.addEventListener("click", (evento) => {
        const tarjeta = evento.target.closest(".tarjeta-devolucion");
        const esCheckbox = evento.target.closest(".check-seleccion-reporte");
        const esAccion = evento.target.closest(".card-actions");

        if (modoSeleccion && tarjeta && !esCheckbox && !esAccion) {
            const check = tarjeta.querySelector(".check-seleccion-reporte");
            if (check) {
                check.checked = !check.checked;
                check.dispatchEvent(new Event("change", { bubbles: true }));
            }
            return;
        }

        const verBtn = evento.target.closest("[data-ver-danio]");
        const exportBtn = evento.target.closest("[data-export]");
        const resolverBtn = evento.target.closest("[data-resolver]");

        if (verBtn) {
            const idDetalle = Number(verBtn.dataset.verDanio);
            const item = buscarItemDanado(idDetalle);
            if (!item) return;
            document.getElementById("reportViewerTitle").textContent = "Daño reportado: " + item.nombre;
            document.getElementById("reportViewerContent").textContent = contenidoReporte(item.detalle, item.nombre);
            const modal = document.getElementById("reportViewerModal");
            modal.dataset.idDetalle = idDetalle;
            bootstrap.Modal.getOrCreateInstance(modal).show();
        }

        if (exportBtn) {
            exportarDanio(Number(exportBtn.dataset.iddetalle), exportBtn.dataset.export);
        }

        if (resolverBtn) {
            resolverDanio(Number(resolverBtn.dataset.resolver));
        }
    });

    // Los equipos dañados se cargan solo la primera vez que se abre esa pestaña.
    const radioGenerados = document.getElementById("tabGenerados");
    if (radioGenerados) {
        radioGenerados.addEventListener("change", () => {
            if (radioGenerados.checked && !danadosCargados) cargarDanadosSeguro(0);
        });
    }
}

async function recargarVista() {
    await cargarHistorial(paginaHistorial);
    if (danadosCargados) await cargarDanados(paginaDanados);
}

async function renderReportsView() {
    const tbody = document.getElementById("reportesHistorialBody");
    if (!tbody) return;

    modoSeleccion = false;
    seleccionados = new Set();
    informacionSeleccion.clear();
    paginaHistorial = 0;
    paginaDanados = 0;
    danadosCargados = false;
    cache.danados = [];

    try {
        await cargarCatalogos();
        await cargarHistorial(0);
        initModalVisor();
        initEventosGrid();
        initBarraSeleccion();

        const radioGenerados = document.getElementById("tabGenerados");
        if (radioGenerados && radioGenerados.checked) await cargarDanadosSeguro(0);
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
