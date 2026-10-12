import { obtenerPrestamosPagina, actualizarPrestamo } from "../services/prestamoService.js";
import { obtenerEstadosPrestamo } from "../services/estadoPrestamoService.js";
import { actualizarDetalleHerramienta } from "../services/detalleHerramientaService.js";
import { obtenerEstadosHerramienta } from "../services/estadoHerramientaService.js";
import { pintarPaginador, TAMANO_PAGINA } from "../utils/paginacion.js";
import { puedeGestionar } from "../utils/rol.js";

const cache = { estados: [], estadosHerramienta: [] };

const LISTAS = {
    prestamos: { estados: ["PENDIENTE", "APROBADO"], sinDevolucion: false, paginador: "loansPaginador", pagina: 0, filas: [], cargada: false },
    devoluciones: { estados: ["APROBADO", "ENTREGADO"], sinDevolucion: true, paginador: "devolucionesPaginador", pagina: 0, filas: [], cargada: false },
    historial: { estados: ["DEVUELTO", "RECHAZADO"], sinDevolucion: false, paginador: "historialPaginador", pagina: 0, filas: [], cargada: false },
};

let modalesListos = false;

function codigoPrestamo(id) {
    return "PR-" + String(id).padStart(3, "0");
}

function claseEstadoPrestamo(nombre) {
    const mapa = { PENDIENTE: "pendiente", APROBADO: "activo", ENTREGADO: "prestado", DEVUELTO: "devuelto", RECHAZADO: "daniado" };
    return mapa[nombre] || "";
}

async function cargarCatalogos() {
    const [estados, estadosHerramienta] = await Promise.all([
        obtenerEstadosPrestamo(),
        obtenerEstadosHerramienta(),
    ]);

    cache.estados = estados || [];
    cache.estadosHerramienta = estadosHerramienta || [];
}

function construirFila(dto) {
    const piezas = dto.piezas || [];
    const esHerramienta = dto.tipo === "Herramienta";

    let detalleTexto = "";
    if (esHerramienta && dto.idHerramienta) {
        detalleTexto = dto.piezasAsignadas && piezas.length > 0
            ? piezas.map((p) => p.codInv).join(", ")
            : "x" + dto.cantidad;
    }

    return {
        id: dto.id,
        codigo: codigoPrestamo(dto.id),
        idUsuario: dto.idUsuario,
        nombreUsuario: dto.nombreUsuario,
        fechaInicio: dto.fechaInicio,
        fechaEsperada: dto.fechaEsperada,
        fechaDevolucion: dto.fechaDevolucion,
        tipo: dto.tipo,
        productoArea: dto.nombreProducto,
        cantidad: dto.cantidad,
        detalleTexto,
        unidades: piezas.map((p) => ({
            idDetalle: p.idDetalle,
            idHerramienta: p.idHerramienta,
            idMarca: p.idMarca,
            codInv: p.codInv,
        })),
        idEstado: dto.idEstado,
        nombreEstado: dto.nombreEstado,
    };
}

function buscarFila(id) {
    for (const lista of Object.values(LISTAS)) {
        const fila = lista.filas.find((f) => f.id === id);
        if (fila) return fila;
    }
    return null;
}

function pintarLista(clave) {
    if (clave === "prestamos") pintarTablaPrestamos();
    if (clave === "devoluciones") pintarDevoluciones();
    if (clave === "historial") pintarHistorial();
}

async function cargarLista(clave, pagina = LISTAS[clave].pagina) {
    const lista = LISTAS[clave];
    const datos = await obtenerPrestamosPagina({
        page: pagina,
        size: TAMANO_PAGINA,
        estados: lista.estados,
        sinDevolucion: lista.sinDevolucion,
    });

    if (datos.content.length === 0 && pagina > 0) {
        return cargarLista(clave, pagina - 1);
    }

    lista.pagina = datos.page;
    lista.filas = datos.content.map(construirFila);
    lista.cargada = true;
    pintarLista(clave);
    pintarPaginador(document.getElementById(lista.paginador), datos, (destino) => cargarListaSegura(clave, destino));
}

async function cargarListaSegura(clave, pagina) {
    try {
        await cargarLista(clave, pagina);
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: "error", title: "No se pudo cargar la página", text: "Revisa tu conexión con el servidor." });
    }
}

function pintarTablaPrestamos() {
    const tbody = document.getElementById("loansTableBody");
    if (!tbody) return;

    const filas = LISTAS.prestamos.filas;

    if (filas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center atenuado">No hay préstamos por revisar.</td></tr>';
        return;
    }

    tbody.innerHTML = filas.map((fila) => `
        <tr data-fila="${fila.id}" style="cursor:pointer;">
            <td class="etiqueta-codigo">${fila.codigo}</td>
            <td>${fila.nombreUsuario}</td>
            <td>${fila.fechaInicio}</td>
            <td><span class="estado activo">${fila.tipo}</span></td>
            <td>${fila.productoArea}${fila.detalleTexto ? ` <span class="atenuado">(${fila.detalleTexto})</span>` : ""}</td>
            <td><span class="estado ${claseEstadoPrestamo(fila.nombreEstado)}">${fila.nombreEstado}</span></td>
            <td><button type="button" class="boton-pastilla boton-contorno" data-ver="${fila.id}">Ver</button></td>
        </tr>
    `).join("");
}

function pintarDetalle(fila) {
    const panel = document.getElementById("loanDetailPanel");
    if (!panel) return;

    const puedeGestionar = fila.nombreEstado === "PENDIENTE";

    panel.innerHTML = `
        <h3>Préstamo ${fila.codigo}</h3>
        <span class="estado ${claseEstadoPrestamo(fila.nombreEstado)}">${fila.nombreEstado}</span>
        <span class="field-label">Solicitante</span>
        <p style="margin:4px 0 12px; font-weight:600;">${fila.nombreUsuario}</p>
        <span class="field-label">Tipo de solicitud</span>
        <p style="margin:4px 0 12px; font-weight:600;">${fila.tipo} — ${fila.productoArea}${fila.detalleTexto ? ` (${fila.detalleTexto})` : ""}</p>
        <span class="field-label">Fecha esperada de devolución</span>
        <p style="margin:0 0 16px; font-weight:600;">${fila.fechaEsperada || "-"}</p>
        ${puedeGestionar ? `
        <div class="acciones-rapidas">
            <button type="button" class="boton-accion-rapida accion-rapida-verde" id="btnAprobarPrestamo"><i class="bi bi-check-lg"></i> Aprobar préstamo</button>
            <button type="button" class="boton-accion-rapida accion-rapida-rojo" id="btnRechazarPrestamo"><i class="bi bi-x-lg"></i> Rechazar préstamo</button>
        </div>` : '<p class="atenuado">Esta solicitud ya fue procesada.</p>'}
    `;

    const btnAprobar = document.getElementById("btnAprobarPrestamo");
    const btnRechazar = document.getElementById("btnRechazarPrestamo");

    if (btnAprobar) btnAprobar.addEventListener("click", () => cambiarEstadoPrestamo(fila, "APROBADO"));
    if (btnRechazar) btnRechazar.addEventListener("click", () => cambiarEstadoPrestamo(fila, "RECHAZADO"));
}

async function cambiarEstadoPrestamo(fila, nombreEstado) {
    const estado = cache.estados.find((e) => e.nombreEstado === nombreEstado);
    if (!estado) {
        Swal.fire({ icon: "error", title: "No se pudo actualizar", text: "No se encontró el estado " + nombreEstado + "." });
        return;
    }

    try {
        await actualizarPrestamo(fila.id, {
            usuario: fila.idUsuario,
            fechaInicio: fila.fechaInicio,
            fechaEsperada: fila.fechaEsperada,
            fechaDevolucion: fila.fechaDevolucion,
            estado: estado.id,
        });

        if (nombreEstado === "APROBADO") {
            const idEnPrestamo = (cache.estadosHerramienta.find((e) => e.nombreEstadoHerramienta === "EN PRESTAMO") || {}).id;
            if (idEnPrestamo) {
                for (const detalle of fila.unidades) {
                    await actualizarDetalleHerramienta(detalle.idDetalle, {
                        idHerramienta: detalle.idHerramienta,
                        idMarca: detalle.idMarca,
                        idEstadoHerramienta: idEnPrestamo,
                        codInv: detalle.codInv,
                    });
                }
            }
        }

        Swal.fire({ icon: "success", title: nombreEstado === "APROBADO" ? "¡Préstamo aprobado!" : "Préstamo rechazado", confirmButtonColor: "#28a745" });
        await recargarVista();
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: "error", title: "No se pudo actualizar el préstamo", text: "Ocurrió un error al conectar con el servidor.", confirmButtonColor: "#dc3545" });
    }
}

function pintarDevoluciones() {
    const grid = document.getElementById("devolucionesGrid");
    if (!grid) return;

    const filas = LISTAS.devoluciones.filas;

    if (filas.length === 0) {
        grid.innerHTML = '<p class="atenuado">No hay devoluciones pendientes.</p>';
        return;
    }

    const hoy = new Date().toISOString().split("T")[0];
    const puedeRegistrarDevolucion = puedeGestionar(["ADMINISTRADOR", "IT"]);

    grid.innerHTML = filas.map((fila) => {
        const retrasado = fila.fechaEsperada && fila.fechaEsperada < hoy;
        return `
        <div class="tarjeta-devolucion">
            <div class="top-row">
                <span class="estado ${retrasado ? "pendiente" : "activo"}">${retrasado ? "Retrasado" : "En tiempo"}</span>
                <span class="etiqueta-codigo">${fila.codigo}</span>
            </div>
            <h4>${fila.nombreUsuario}</h4>
            <div class="tool-line"><i class="bi bi-box-seam"></i>${fila.productoArea}${fila.detalleTexto ? ` (${fila.detalleTexto})` : ""}</div>
            ${puedeRegistrarDevolucion ? `
            <div class="card-actions">
                <button type="button" class="boton-pastilla boton-solido-verde" data-devolver="${fila.id}"><i class="bi bi-check-lg"></i>Devuelto</button>
                <button type="button" class="boton-pastilla boton-solido-naranja" data-bs-toggle="modal" data-bs-target="#damageReportModal"
                    data-prestamo="${fila.id}" data-resumen="${fila.productoArea} — ${fila.nombreUsuario}">
                    <i class="bi bi-exclamation-triangle"></i>Reportar daño
                </button>
            </div>` : '<p class="atenuado" style="margin:8px 0 0; font-size:12px;">Solo un administrador o IT puede registrar esta devolución.</p>'}
        </div>`;
    }).join("");
}

async function marcarDevuelto(idPrestamo, idsUnidadesDanadas = []) {
    if (!puedeGestionar(["ADMINISTRADOR", "IT"])) {
        Swal.fire({ icon: "warning", title: "Acción no permitida", text: "Tu rol no tiene permiso para registrar devoluciones." });
        return;
    }

    const fila = buscarFila(idPrestamo);
    if (!fila) return;

    const estadoDevuelto = cache.estados.find((e) => e.nombreEstado === "DEVUELTO");
    if (!estadoDevuelto) {
        Swal.fire({ icon: "error", title: "No se pudo registrar la devolución", text: "No se encontró el estado DEVUELTO." });
        return;
    }

    const confirmacion = await Swal.fire({
        icon: "question",
        title: "¿Confirmar devolución?",
        text: "Vas a registrar esta devolución. ¿Deseas continuar?",
        showCancelButton: true,
        confirmButtonText: "Sí, registrar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#28a745",
    });

    if (!confirmacion.isConfirmed) {
        return;
    }

    try {
        await actualizarPrestamo(idPrestamo, {
            usuario: fila.idUsuario,
            fechaInicio: fila.fechaInicio,
            fechaEsperada: fila.fechaEsperada,
            fechaDevolucion: new Date().toISOString().split("T")[0],
            estado: estadoDevuelto.id,
        });

        const idDisponible = (cache.estadosHerramienta.find((e) => e.nombreEstadoHerramienta === "DISPONIBLE") || {}).id;
        const idDanado = (cache.estadosHerramienta.find((e) => e.nombreEstadoHerramienta === "DAÑADO") || {}).id;

        for (const detalle of fila.unidades) {
            const idEstadoDestino = idsUnidadesDanadas.includes(detalle.idDetalle) && idDanado ? idDanado : idDisponible;
            if (idEstadoDestino) {
                await actualizarDetalleHerramienta(detalle.idDetalle, {
                    idHerramienta: detalle.idHerramienta,
                    idMarca: detalle.idMarca,
                    idEstadoHerramienta: idEstadoDestino,
                    codInv: detalle.codInv,
                });
            }
        }

        Swal.fire({ icon: "success", title: "¡Devolución registrada!", confirmButtonColor: "#28a745" });
        await recargarVista();
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: "error", title: "No se pudo registrar la devolución", text: "Ocurrió un error al conectar con el servidor.", confirmButtonColor: "#dc3545" });
    }
}

function pintarHistorial() {
    const tbody = document.getElementById("historialTableBody");
    if (!tbody) return;

    const filas = LISTAS.historial.filas;

    if (filas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center atenuado">Aún no hay historial de préstamos.</td></tr>';
        return;
    }

    tbody.innerHTML = filas.map((fila) => `
        <tr>
            <td class="etiqueta-codigo">${fila.codigo}</td>
            <td class="nombre-elemento"><span class="icono-elemento"><i class="bi bi-tools"></i></span>${fila.productoArea}</td>
            <td>${fila.fechaInicio}</td>
            <td>${fila.fechaDevolucion || "-"}</td>
            <td>${fila.nombreUsuario}</td>
            <td><span class="estado ${claseEstadoPrestamo(fila.nombreEstado)}">${fila.nombreEstado}</span></td>
        </tr>
    `).join("");
}

function initModalDamage() {
    const modal = document.getElementById("damageReportModal");
    const form = document.getElementById("damageReportForm");
    if (!modal || !form) return;

    modal.addEventListener("show.bs.modal", (evento) => {
        const boton = evento.relatedTarget;
        if (!boton) return;
        document.getElementById("damageReturnId").value = boton.dataset.prestamo || "";
        document.getElementById("damageItemSummary").textContent = boton.dataset.resumen || "";
        document.getElementById("damageDescription").value = "";

        const fila = buscarFila(Number(boton.dataset.prestamo));
        const lista = document.getElementById("damageUnitsList");
        const unidades = fila ? fila.unidades : [];
        lista.innerHTML = unidades.map((u) => `
            <label class="btn btn-outline-danger btn-sm" style="cursor:pointer;">
                <input type="checkbox" class="form-check-input me-1" data-unidad-danada="${u.idDetalle}" ${unidades.length === 1 ? "checked" : ""}> ${u.codInv}
            </label>`).join("");
    });

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const descripcion = document.getElementById("damageDescription").value.trim();
        const idPrestamo = Number(document.getElementById("damageReturnId").value);

        if (!descripcion) {
            Swal.fire({ icon: "warning", title: "Describe el daño", text: "Escribe el daño presentado antes de enviar el reporte." });
            return;
        }

        const idsDanadas = Array.from(document.querySelectorAll("#damageUnitsList input[data-unidad-danada]:checked"))
            .map((casilla) => Number(casilla.dataset.unidadDanada));

        if (document.querySelectorAll("#damageUnitsList input").length > 0 && idsDanadas.length === 0) {
            Swal.fire({ icon: "warning", title: "Elige la pieza dañada", text: "Marca al menos una pieza que llegó dañada." });
            return;
        }

        bootstrap.Modal.getOrCreateInstance(modal).hide();
        await marcarDevuelto(idPrestamo, idsDanadas);
    });
}

function initEventosTabla() {
    const tbody = document.getElementById("loansTableBody");
    if (tbody) {
        tbody.addEventListener("click", (evento) => {
            const fila = evento.target.closest("[data-fila], [data-ver]");
            if (!fila) return;
            const id = Number(fila.dataset.fila || fila.dataset.ver);
            const prestamo = LISTAS.prestamos.filas.find((f) => f.id === id);
            if (prestamo) pintarDetalle(prestamo);
        });
    }

    const grid = document.getElementById("devolucionesGrid");
    if (grid) {
        grid.addEventListener("click", (evento) => {
            const boton = evento.target.closest("[data-devolver]");
            if (!boton) return;
            marcarDevuelto(Number(boton.dataset.devolver), []);
        });
    }

    // Las pestañas Devoluciones e Historial se cargan solo la primera vez que se abren.
    [["tabDevoluciones", "devoluciones"], ["tabHistorial", "historial"]].forEach(([idRadio, clave]) => {
        const radio = document.getElementById(idRadio);
        if (!radio) return;
        radio.addEventListener("change", () => {
            if (radio.checked && !LISTAS[clave].cargada) cargarListaSegura(clave, 0);
        });
    });
}

function initModales() {
    if (modalesListos) return;
    modalesListos = true;
    initModalDamage();
}

async function recargarVista() {
    const cargadas = Object.keys(LISTAS).filter((clave) => LISTAS[clave].cargada);
    await Promise.all(cargadas.map((clave) => cargarLista(clave)));

    const panel = document.getElementById("loanDetailPanel");
    if (panel) panel.innerHTML = '<p class="atenuado">Selecciona un préstamo de la lista para ver el detalle.</p>';
}

async function renderLoansView() {
    const tbody = document.getElementById("loansTableBody");
    if (!tbody) return;

    Object.values(LISTAS).forEach((lista) => {
        lista.pagina = 0;
        lista.filas = [];
        lista.cargada = false;
    });

    try {
        await cargarCatalogos();
        await cargarLista("prestamos", 0);
        initEventosTabla();

        const tabDevoluciones = document.getElementById("tabDevoluciones");
        const tabHistorial = document.getElementById("tabHistorial");
        if (tabDevoluciones && tabDevoluciones.checked) await cargarListaSegura("devoluciones", 0);
        if (tabHistorial && tabHistorial.checked) await cargarListaSegura("historial", 0);
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">No se pudieron cargar los préstamos. Revisa tu conexión con el servidor.</td></tr>';
        Swal.fire({ icon: "error", title: "No se pudieron cargar los préstamos", text: "Revisa tu conexión con el servidor." });
    }
}

export function initLoansController() {
    initModales();

    document.addEventListener("view:loaded", (evento) => {
        if (evento.detail.real === "loans") {
            renderLoansView();
        }
    });
}
