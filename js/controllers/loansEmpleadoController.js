import { obtenerPrestamos, agregarPrestamo } from "../services/prestamoService.js";
import { obtenerEstadosPrestamo } from "../services/estadoPrestamoService.js";
import { obtenerHerramientas } from "../services/herramientaService.js";
import { obtenerAreas } from "../services/areaService.js";
import { obtenerDetallePrestamoHerramientas, agregarDetallePrestamoHerramienta } from "../services/detallePrestamoHerramientaService.js";
import { obtenerDetallePrestamoAreas, agregarDetallePrestamoArea } from "../services/detallePrestamoAreaService.js";

const cache = { herramientas: [], areas: [], estados: [], prestamos: [], detallesHerramienta: [], detallesArea: [] };
let listenersListos = false;

function idUsuarioActual() {
    return Number(localStorage.getItem("siptec-usuario-id")) || 1;
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

function fechasValidas(inicioTexto, esperadaTexto) {
    const inicio = new Date(inicioTexto);
    const esperada = new Date(esperadaTexto);

    if (esperada <= inicio) return { valido: false, mensaje: "La fecha esperada debe ser posterior a la fecha de inicio." };

    const unMesDespues = new Date(inicio);
    unMesDespues.setMonth(unMesDespues.getMonth() + 1);
    if (esperada > unMesDespues) return { valido: false, mensaje: "El préstamo no puede exceder 1 mes desde el inicio." };

    return { valido: true };
}

async function cargarCatalogos() {
    const [herramientas, areas, estados, prestamos, detallesHerramienta, detallesArea] = await Promise.all([
        obtenerHerramientas(),
        obtenerAreas().catch(() => []),
        obtenerEstadosPrestamo(),
        obtenerPrestamos(),
        obtenerDetallePrestamoHerramientas(),
        obtenerDetallePrestamoAreas().catch(() => []),
    ]);

    cache.herramientas = herramientas || [];
    cache.areas = areas || [];
    cache.estados = estados || [];
    cache.prestamos = prestamos || [];
    cache.detallesHerramienta = detallesHerramienta || [];
    cache.detallesArea = detallesArea || [];
}

function poblarDatalists() {
    const listaEquipo = document.getElementById("empEquipoOptions");
    const listaArea = document.getElementById("empAreaOptions");

    if (listaEquipo) {
        listaEquipo.innerHTML = cache.herramientas.map((h) => `<option value="${h.nombreHerramienta}"></option>`).join("");
    }
    if (listaArea) {
        listaArea.innerHTML = cache.areas.map((a) => `<option value="${a.nombreArea}"></option>`).join("");
    }
}

function pintarMisPrestamos() {
    const tbody = document.getElementById("misPrestamosTableBody");
    if (!tbody) return;

    const idUsuario = idUsuarioActual();
    const propios = cache.prestamos.filter((p) => p.usuario === idUsuario);

    if (propios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center atenuado">Aún no tienes préstamos registrados.</td></tr>';
        return;
    }

    tbody.innerHTML = propios
        .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio))
        .map((prestamo) => {
            const estado = cache.estados.find((e) => e.id === prestamo.estado);
            const detalleHerramienta = cache.detallesHerramienta.find((d) => d.prestamo === prestamo.id);
            const detalleArea = cache.detallesArea.find((d) => d.prestamoIdPrestamo === prestamo.id);

            let tipo = "Herramienta";
            let productoArea = "-";

            if (detalleHerramienta) {
                const herramienta = cache.herramientas.find((h) => h.idHerramienta === detalleHerramienta.herramienta);
                productoArea = (herramienta ? herramienta.nombreHerramienta : "Herramienta") + ` <span class="atenuado">(x${detalleHerramienta.cantidad})</span>`;
            } else if (detalleArea) {
                tipo = "Área";
                const area = cache.areas.find((a) => a.id === detalleArea.areasIdArea);
                productoArea = area ? area.nombreArea : "Área";
            }

            const mapa = { PENDIENTE: "pendiente", APROBADO: "activo", ENTREGADO: "prestado", DEVUELTO: "devuelto", RECHAZADO: "daniado" };
            const nombreEstado = estado ? estado.nombreEstado : "DESCONOCIDO";

            return `
            <tr>
                <td class="etiqueta-codigo">${codigoPrestamo(prestamo.id)}</td>
                <td>${prestamo.fechaInicio}</td>
                <td><span class="estado activo">${tipo}</span></td>
                <td>${productoArea}</td>
                <td><span class="estado ${mapa[nombreEstado] || ""}">${nombreEstado}</span></td>
            </tr>`;
        }).join("");
}

async function enviarSolicitud() {
    const tipoHerramienta = document.getElementById("empTipoHerramienta").checked;
    const fechaInicio = document.getElementById("empFechaInicio").value;
    const fechaEsperada = document.getElementById("empFechaEsperada").value;
    const equipoTexto = document.getElementById("empEquipo").value;
    const cantidad = Number(document.getElementById("empCantidad").value);
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
        herramienta = resolverPorNombre(equipoTexto, cache.herramientas, "nombreHerramienta");
        if (!herramienta) {
            Swal.fire({ icon: "warning", title: "Equipo no encontrado", text: "Busca y selecciona un equipo válido de la lista." });
            return;
        }
        if (!cantidad || cantidad < 1) {
            Swal.fire({ icon: "warning", title: "Cantidad inválida", text: "La cantidad debe ser al menos 1." });
            return;
        }
        if (cantidad > herramienta.stock) {
            Swal.fire({ icon: "warning", title: "Stock insuficiente", text: `Solo hay ${herramienta.stock} disponibles de ese equipo.` });
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
        });

        if (tipoHerramienta) {
            await agregarDetallePrestamoHerramienta({
                prestamo: nuevoPrestamo.id,
                herramienta: herramienta.idHerramienta,
                cantidad,
            });
        } else {
            await agregarDetallePrestamoArea({
                prestamoIdPrestamo: nuevoPrestamo.id,
                areasIdArea: area.id,
            });
        }

        Swal.fire({ icon: "success", title: "¡Préstamo enviado!", text: "Un administrador va a revisar tu solicitud.", confirmButtonColor: "#28a745" });
        document.getElementById("empEquipo").value = "";
        document.getElementById("empArea").value = "";
        document.getElementById("empCantidad").value = "1";
        document.getElementById("empObservaciones").value = "";

        await recargarVista();
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
        equipoInput.addEventListener("change", () => {
            const encontrada = resolverPorNombre(equipoInput.value, cache.herramientas, "nombreHerramienta");
            const aviso = document.getElementById("empEquipoAviso");
            if (!aviso) return;
            aviso.textContent = encontrada ? `Stock disponible: ${encontrada.stock}` : "No se encontró ese equipo en el inventario.";
        });
    }

    const fechaInicioInput = document.getElementById("empFechaInicio");
    if (fechaInicioInput) {
        const hoy = new Date().toISOString().split("T")[0];
        fechaInicioInput.min = hoy;
        fechaInicioInput.addEventListener("change", () => {
            const fechaEsperadaInput = document.getElementById("empFechaEsperada");
            if (!fechaEsperadaInput || !fechaInicioInput.value) return;

            fechaEsperadaInput.min = fechaInicioInput.value;

            const unMesDespues = new Date(fechaInicioInput.value);
            unMesDespues.setMonth(unMesDespues.getMonth() + 1);
            fechaEsperadaInput.max = unMesDespues.toISOString().split("T")[0];
        });
    }
}

async function recargarVista() {
    await cargarCatalogos();
    poblarDatalists();
    pintarMisPrestamos();
}

async function renderLoansEmpleadoView() {
    const tbody = document.getElementById("misPrestamosTableBody");
    if (!tbody) return;

    try {
        await cargarCatalogos();
        poblarDatalists();
        pintarMisPrestamos();
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
