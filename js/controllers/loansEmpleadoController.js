import { fechasPrestamoValidas as fechasValidas, formatearFechaHora, ahoraLocalISO, aValorInput } from "../utils/fechas.js";
import { idUsuarioActual } from "../utils/sesion.js";
import { obtenerPrestamosPagina, agregarPrestamo } from "../services/prestamoService.js";
import { obtenerEstadosPrestamo } from "../services/estadoPrestamoService.js";
import { obtenerAreas } from "../services/areaService.js";
import { agregarDetallePrestamoHerramienta } from "../services/detallePrestamoHerramientaService.js";
import { agregarDetallePrestamoArea } from "../services/detallePrestamoAreaService.js";
import { buscarHerramientas, obtenerPiezasDisponibles } from "../services/inventarioService.js";
import { pintarPaginador, retrasar, TAMANO_PAGINA } from "../utils/paginacion.js";
import { mostrarAvisosRechazo } from "../utils/avisos.js";

const cache = { areas: [], estados: [], sugerencias: [], unidades: [], herramientaElegida: null };
let paginaMisPrestamos = 0;
let listenersListos = false;

function pintarUnidades(herramienta) {
    const contenedor = document.getElementById("empUnidades");
    if (!contenedor) return;

    if (!herramienta) {
        contenedor.innerHTML = "";
        return;
    }

    if (cache.unidades.length === 0) {
        contenedor.innerHTML = '<small class="text-danger">No hay piezas disponibles de este equipo.</small>';
        return;
    }

    contenedor.innerHTML = cache.unidades.map((u) => `
        <label class="btn btn-outline-secondary btn-sm" style="cursor:pointer;">
            <input type="checkbox" class="form-check-input me-1" data-unidad="${u.idDetalle}"> ${u.codInv}
        </label>`).join("");
}


function codigoPrestamo(id) {
    return "PR-" + String(id).padStart(3, "0");
}

function resolverPorNombre(texto, lista, campoNombre) {
    if (!texto) return null;
    const buscado = texto.trim().toLowerCase();
    return lista.find((item) => item[campoNombre].toLowerCase() === buscado) ||
        lista.find((item) => item[campoNombre].toLowerCase().includes(buscado));
}


async function cargarCatalogos() {
    const [areas, estados] = await Promise.all([
        obtenerAreas().catch(() => []),
        obtenerEstadosPrestamo(),
    ]);

    cache.areas = areas || [];
    cache.estados = estados || [];
}

function poblarDatalistAreas() {
    const listaArea = document.getElementById("empAreaOptions");
    if (listaArea) {
        listaArea.innerHTML = cache.areas.map((a) => `<option value="${a.nombreArea}"></option>`).join("");
    }
}

function poblarDatalistEquipos() {
    const listaEquipo = document.getElementById("empEquipoOptions");
    if (listaEquipo) {
        listaEquipo.innerHTML = cache.sugerencias.map((h) => `<option value="${h.nombreHerramienta}"></option>`).join("");
    }
}

async function sugerirEquipos(texto) {
    try {
        cache.sugerencias = await buscarHerramientas(texto, 10);
        poblarDatalistEquipos();
    } catch (error) {
        console.error(error);
    }
}

async function resolverHerramienta(texto) {
    const buscado = (texto || "").trim().toLowerCase();
    if (!buscado) return null;

    let coincidencia = cache.sugerencias.find((h) => h.nombreHerramienta.toLowerCase() === buscado);
    if (coincidencia) return coincidencia;

    const encontradas = await buscarHerramientas(texto.trim(), 10);
    cache.sugerencias = encontradas;
    poblarDatalistEquipos();

    return encontradas.find((h) => h.nombreHerramienta.toLowerCase() === buscado) || encontradas[0] || null;
}

async function cargarMisPrestamos(pagina = paginaMisPrestamos) {
    const datos = await obtenerPrestamosPagina({
        page: pagina,
        size: TAMANO_PAGINA,
        estados: cache.estados.map((e) => e.nombreEstado),
        usuario: idUsuarioActual(),
    });

    if (datos.content.length === 0 && pagina > 0) {
        return cargarMisPrestamos(pagina - 1);
    }

    paginaMisPrestamos = datos.page;
    pintarMisPrestamos(datos.content);
    pintarPaginador(document.getElementById("misPrestamosPaginador"), datos, cargarMisPrestamosSeguro);
}

async function cargarMisPrestamosSeguro(pagina) {
    try {
        await cargarMisPrestamos(pagina);
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: "error", title: "No se pudo cargar la página", text: "Revisa tu conexión con el servidor." });
    }
}

function pintarMisPrestamos(prestamos) {
    const tbody = document.getElementById("misPrestamosTableBody");
    if (!tbody) return;

    if (prestamos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center atenuado">Aún no tienes préstamos registrados.</td></tr>';
        return;
    }

    const mapa = { PENDIENTE: "pendiente", APROBADO: "activo", ENTREGADO: "prestado", DEVUELTO: "devuelto", RECHAZADO: "daniado" };

    tbody.innerHTML = prestamos.map((prestamo) => {
        let productoArea = prestamo.nombreProducto;

        if (prestamo.tipo === "Herramienta" && prestamo.idHerramienta) {
            const sufijo = prestamo.piezasAsignadas && prestamo.piezas.length > 0
                ? prestamo.piezas.map((p) => p.codInv).join(", ")
                : "x" + prestamo.cantidad;
            productoArea = `${prestamo.nombreProducto} <span class="atenuado">(${sufijo})</span>`;
        }

        return `
        <tr>
            <td class="etiqueta-codigo">${codigoPrestamo(prestamo.id)}</td>
            <td>${formatearFechaHora(prestamo.fechaInicio)}</td>
            <td><span class="estado activo">${prestamo.tipo}</span></td>
            <td>${productoArea}</td>
            <td><span class="estado ${mapa[prestamo.nombreEstado] || ""}">${prestamo.nombreEstado}</span></td>
        </tr>`;
    }).join("");
}

async function enviarSolicitud() {
    const tipoHerramienta = document.getElementById("empTipoHerramienta").checked;
    const fechaInicio = document.getElementById("empFechaInicio").value;
    const fechaEsperada = document.getElementById("empFechaEsperada").value;
    const equipoTexto = document.getElementById("empEquipo").value;
    const unidadesElegidas = Array.from(document.querySelectorAll("#empUnidades input[data-unidad]:checked"))
        .map((casilla) => Number(casilla.dataset.unidad));
    const areaTexto = document.getElementById("empArea").value;

    if (!fechaInicio || !fechaEsperada) {
        Swal.fire({ icon: "warning", title: "Datos incompletos", text: "Selecciona la fecha de inicio y la fecha esperada." });
        return;
    }

    const validacionFechas = fechasValidas(fechaInicio, fechaEsperada);
    if (!validacionFechas.valido) {
        Swal.fire({ icon: "warning", title: "Fechas inválidas", text: validacionFechas.mensaje });
        return;
    }

    let herramienta = null;
    let area = null;

    if (tipoHerramienta) {
        try {
            herramienta = await resolverHerramienta(equipoTexto);
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "No se pudo buscar el equipo", text: "Revisa tu conexión con el servidor." });
            return;
        }

        if (!herramienta) {
            Swal.fire({ icon: "warning", title: "Equipo no encontrado", text: "Busca y selecciona un equipo válido de la lista." });
            return;
        }
        if (unidadesElegidas.length === 0) {
            Swal.fire({ icon: "warning", title: "Elige una pieza", text: "Marca al menos una pieza disponible (por ejemplo EQ-21)." });
            return;
        }

        try {
            const disponiblesAhora = await obtenerPiezasDisponibles(herramienta.idHerramienta);
            const idsPermitidos = new Set(disponiblesAhora.map((u) => u.idDetalle));
            if (unidadesElegidas.some((id) => !idsPermitidos.has(id))) {
                Swal.fire({ icon: "warning", title: "Pieza no disponible", text: "Alguna pieza elegida ya no está disponible (prestada, dañada o solicitada)." });
                cache.unidades = disponiblesAhora;
                pintarUnidades(herramienta);
                return;
            }
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "No se pudo verificar la disponibilidad", text: "Revisa tu conexión con el servidor." });
            return;
        }
    } else {
        area = resolverPorNombre(areaTexto, cache.areas, "nombreArea");
        if (!area) {
            Swal.fire({ icon: "warning", title: "Área no encontrada", text: "Busca y selecciona un área válida de la lista." });
            return;
        }
    }

    const estadoPendiente = cache.estados.find((e) => e.nombreEstado === "PENDIENTE");
    if (!estadoPendiente) {
        Swal.fire({ icon: "error", title: "No se pudo enviar la solicitud", text: "No se encontró el estado PENDIENTE." });
        return;
    }

    try {
        const nuevoPrestamo = await agregarPrestamo({
            usuario: idUsuarioActual(),
            fechaInicio,
            fechaEsperada,
            fechaDevolucion: null,
            estado: estadoPendiente.id,
            observaciones: document.getElementById("empObservaciones").value.trim(),
        });

        if (tipoHerramienta) {
            for (const idUnidad of unidadesElegidas) {
                await agregarDetallePrestamoHerramienta({
                    prestamo: nuevoPrestamo.id,
                    herramienta: herramienta.idHerramienta,
                    detalleHerramienta: idUnidad,
                    cantidad: 1,
                });
            }
        } else {
            await agregarDetallePrestamoArea({
                prestamoIdPrestamo: nuevoPrestamo.id,
                areasIdArea: area.id,
            });
        }

        Swal.fire({ icon: "success", title: "¡Préstamo enviado!", text: "Un administrador va a revisar tu solicitud.", confirmButtonColor: "#28a745" });
        document.getElementById("empEquipo").value = "";
        document.getElementById("empArea").value = "";
        cache.unidades = [];
        pintarUnidades(null);
        document.getElementById("empEquipoAviso").textContent = "";
        document.getElementById("empObservaciones").value = "";
        document.getElementById("empFechaInicio").value = "";
        const empFechaEsperada = document.getElementById("empFechaEsperada");
        empFechaEsperada.value = "";
        empFechaEsperada.classList.remove("fecha-invalida");

        await cargarMisPrestamos(0);
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: "error", title: "No se pudo enviar la solicitud", text: "Ocurrió un error al conectar con el servidor. Intenta de nuevo.", confirmButtonColor: "#dc3545" });
    }
}

function initFormulario() {
    if (listenersListos) return;
    listenersListos = true;

    const btnEnviar = document.getElementById("btnEnviarSolicitud");
    if (btnEnviar) btnEnviar.addEventListener("click", enviarSolicitud);

    const equipoInput = document.getElementById("empEquipo");
    if (equipoInput) {
        const sugerirRetrasado = retrasar(() => sugerirEquipos(equipoInput.value.trim()), 250);
        equipoInput.addEventListener("input", sugerirRetrasado);

        equipoInput.addEventListener("change", async () => {
            const aviso = document.getElementById("empEquipoAviso");
            if (!aviso) return;

            try {
                const encontrada = await resolverHerramienta(equipoInput.value);
                cache.herramientaElegida = encontrada;
                cache.unidades = encontrada ? await obtenerPiezasDisponibles(encontrada.idHerramienta) : [];
                aviso.textContent = encontrada ? `Piezas disponibles: ${cache.unidades.length}` : "No se encontró ese equipo en el inventario.";
                pintarUnidades(encontrada);
            } catch (error) {
                console.error(error);
                aviso.textContent = "No se pudo consultar el equipo. Revisa tu conexión.";
            }
        });
    }

    const fechaInicioInput = document.getElementById("empFechaInicio");
    const fechaEsperadaInput = document.getElementById("empFechaEsperada");

    function validarFechasEnVivo() {
        if (!fechaEsperadaInput) return;
        if (!fechaInicioInput.value || !fechaEsperadaInput.value) {
            fechaEsperadaInput.classList.remove("fecha-invalida");
            return;
        }
        const resultado = fechasValidas(fechaInicioInput.value, fechaEsperadaInput.value);
        fechaEsperadaInput.classList.toggle("fecha-invalida", !resultado.valido);
    }

    if (fechaInicioInput) {
        // Se puede pedir un préstamo para hoy mismo: el mínimo es el momento actual
        fechaInicioInput.min = ahoraLocalISO();
        fechaInicioInput.addEventListener("change", () => {
            if (!fechaEsperadaInput || !fechaInicioInput.value) return;

            fechaEsperadaInput.min = fechaInicioInput.value;

            const unMesDespues = new Date(fechaInicioInput.value);
            unMesDespues.setMonth(unMesDespues.getMonth() + 1);
            fechaEsperadaInput.max = aValorInput(unMesDespues);
            validarFechasEnVivo();
        });
    }

    if (fechaEsperadaInput) {
        fechaEsperadaInput.addEventListener("change", validarFechasEnVivo);
    }
}

async function renderLoansEmpleadoView() {
    const tbody = document.getElementById("misPrestamosTableBody");
    if (!tbody) return;

    mostrarAvisosRechazo();
    listenersListos = false;
    paginaMisPrestamos = 0;
    cache.sugerencias = [];
    cache.unidades = [];

    try {
        await cargarCatalogos();
        poblarDatalistAreas();
        await cargarMisPrestamos(0);
        initFormulario();
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">No se pudieron cargar tus préstamos. Revisa tu conexión con el servidor.</td></tr>';
        Swal.fire({ icon: "error", title: "No se pudieron cargar tus préstamos", text: "Revisa tu conexión con el servidor." });
    }
}

export function initLoansEmpleadoController() {
    document.addEventListener("view:loaded", (evento) => {
        if (evento.detail.real === "loans-empleado") {
            renderLoansEmpleadoView();
        }
    });
}
