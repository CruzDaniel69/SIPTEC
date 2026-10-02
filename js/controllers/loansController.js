import { obtenerPrestamos, actualizarPrestamo } from "../services/prestamoService.js";
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
let prestamoSeleccionado = null;
let modalesListos = false;

function codigoPrestamo(id) {
    return "PR-" + String(id).padStart(3, "0");
}

function claseEstadoPrestamo(nombre) {
    const mapa = { PENDIENTE: "pendiente", APROBADO: "activo", ENTREGADO: "prestado", DEVUELTO: "devuelto", RECHAZADO: "daniado" };
    return mapa[nombre] || "";
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

function construirFilaPrestamo(prestamo) {
    const usuario = cache.usuarios.find((u) => u.id === prestamo.usuario);
    const estado = cache.estados.find((e) => e.id === prestamo.estado);
    const detallesPrestamo = cache.detallesPrestamoHerramienta.filter((d) => d.prestamo === prestamo.id);
    const detalleHerramienta = detallesPrestamo[0];
    const detalleArea = cache.detallesPrestamoArea.find((d) => d.prestamoIdPrestamo === prestamo.id);

    let tipo = "Herramienta";
    let productoArea = "-";
    let cantidad = null;
    let detalleTexto = "";
    let unidades = [];

    if (detalleHerramienta) {
        const herramienta = cache.herramientas.find((h) => h.idHerramienta === detalleHerramienta.herramienta);
        tipo = "Herramienta";
        productoArea = herramienta ? herramienta.nombreHerramienta : "Herramienta #" + detalleHerramienta.herramienta;
        cantidad = detallesPrestamo.reduce((suma, d) => suma + (d.cantidad || 1), 0);
        unidades = unidadesDelPrestamo(detallesPrestamo);
        detalleTexto = detallesPrestamo.some((d) => d.detalleHerramienta)
            ? unidades.map((u) => u.codInv).join(", ")
            : "x" + cantidad;
    } else if (detalleArea) {
        const area = cache.areas.find((a) => a.id === detalleArea.areasIdArea);
        tipo = "Área";
        productoArea = area ? area.nombreArea : "Área #" + detalleArea.areasIdArea;
    }

    return {
        id: prestamo.id,
        codigo: codigoPrestamo(prestamo.id),
        nombreUsuario: usuario ? `${usuario.nombreUsuario} ${usuario.apellidoUsuario}` : "Usuario #" + prestamo.usuario,
        fechaInicio: prestamo.fechaInicio,
        fechaEsperada: prestamo.fechaEsperada,
        fechaDevolucion: prestamo.fechaDevolucion,
        tipo,
        productoArea,
        cantidad,
        detalleTexto,
        unidades,
        idEstado: prestamo.estado,
        nombreEstado: estado ? estado.nombreEstado : "DESCONOCIDO",
        detalleHerramienta,
    };
}

function unidadesDelPrestamo(detallesPrestamo) {
    const unidades = [];
    detallesPrestamo.forEach((detalle) => {
        const unidad = detalle.detalleHerramienta
            ? cache.detallesHerramienta.find((u) => u.idDetalle === detalle.detalleHerramienta)
            : cache.detallesHerramienta.find((u) => u.idHerramienta === detalle.herramienta);
        if (unidad && !unidades.some((u) => u.idDetalle === unidad.idDetalle)) unidades.push(unidad);
    });
    return unidades;
}

function construirFilas() {
    return cache.prestamos.map(construirFilaPrestamo);
}

function pintarTablaPrestamos() {
    const tbody = document.getElementById("loansTableBody");
    if (!tbody) return;

    const filas = construirFilas().filter((f) => f.nombreEstado === "PENDIENTE" || f.nombreEstado === "APROBADO");

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
            usuario: cache.prestamos.find((p) => p.id === fila.id).usuario,
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

    const filas = construirFilas().filter((f) => (f.nombreEstado === "APROBADO" || f.nombreEstado === "ENTREGADO") && !f.fechaDevolucion);

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

    const fila = construirFilas().find((f) => f.id === idPrestamo);
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
        const prestamoOriginal = cache.prestamos.find((p) => p.id === idPrestamo);
        await actualizarPrestamo(idPrestamo, {
            usuario: prestamoOriginal.usuario,
            fechaInicio: prestamoOriginal.fechaInicio,
            fechaEsperada: prestamoOriginal.fechaEsperada,
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

    const filas = construirFilas()
        .filter((f) => f.nombreEstado === "DEVUELTO" || f.nombreEstado === "RECHAZADO")
        .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));

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

        const fila = construirFilas().find((f) => f.id === Number(boton.dataset.prestamo));
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
            prestamoSeleccionado = construirFilas().find((f) => f.id === id);
            if (prestamoSeleccionado) pintarDetalle(prestamoSeleccionado);
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
}

function initModales() {
    if (modalesListos) return;
    modalesListos = true;
    initModalDamage();
}

async function recargarVista() {
    await cargarCatalogos();
    pintarTablaPrestamos();
    pintarDevoluciones();
    pintarHistorial();
    const panel = document.getElementById("loanDetailPanel");
    if (panel) panel.innerHTML = '<p class="atenuado">Selecciona un préstamo de la lista para ver el detalle.</p>';
}

async function renderLoansView() {
    const tbody = document.getElementById("loansTableBody");
    if (!tbody) return;

    try {
        await cargarCatalogos();
        pintarTablaPrestamos();
        pintarDevoluciones();
        pintarHistorial();
        initEventosTabla();
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
