import { obtenerHerramientas, agregarHerramienta, actualizarHerramienta, eliminarHerramienta } from "../services/herramientaService.js";
import { obtenerDetallesHerramienta, agregarDetalleHerramienta, actualizarDetalleHerramienta, eliminarDetalleHerramienta } from "../services/detalleHerramientaService.js";
import { obtenerMarcas, agregarMarca } from "../services/marcaService.js";
import { obtenerCategorias, agregarCategoria } from "../services/categoriaService.js";
import { obtenerHerramientaCategorias, agregarHerramientaCategoria, eliminarHerramientaCategoria } from "../services/herramientaCategoriaService.js";
import { obtenerEstadosHerramienta } from "../services/estadoHerramientaService.js";
import { obtenerAreas, agregarArea, actualizarArea, eliminarArea } from "../services/areaService.js";
import { obtenerTiposArea, agregarTipoArea } from "../services/tipoAreaService.js";
import { puedeGestionar } from "../utils/rol.js";

const cache = { herramientas: [], detalles: [], marcas: [], categorias: [], relCategorias: [], estados: [], areas: [], tiposArea: [] };
let filtroActual = "todo";
let terminoBusqueda = "";
let terminoBusquedaAreas = "";
let modalesListos = false;

const patronCodigo = /^[A-Za-z0-9-]+$/;
const patronTexto = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.,()\-\s]+$/;

function puedeGestionarInventario() {
    return puedeGestionar(["ADMINISTRADOR", "IT"]);
}

function claseEstado(nombreEstado) {
    if (nombreEstado === "DISPONIBLE") return "disponible";
    if (nombreEstado === "EN PRESTAMO") return "prestado";
    if (nombreEstado === "DAÑADO") return "daniado";
    return "";
}

async function cargarCatalogos() {
    const [herramientas, detalles, marcas, categorias, relCategorias, estados, areas, tiposArea] = await Promise.all([
        obtenerHerramientas(),
        obtenerDetallesHerramienta(),
        obtenerMarcas(),
        obtenerCategorias(),
        obtenerHerramientaCategorias(),
        obtenerEstadosHerramienta(),
        obtenerAreas().catch(() => []),
        obtenerTiposArea().catch(() => []),
    ]);

    cache.herramientas = herramientas || [];
    cache.detalles = detalles || [];
    cache.marcas = marcas || [];
    cache.categorias = categorias || [];
    cache.relCategorias = relCategorias || [];
    cache.estados = estados || [];
    cache.areas = areas || [];
    cache.tiposArea = tiposArea || [];
}

function construirFilas() {
    return cache.herramientas.map((herramienta) => {
        const detalle = cache.detalles.find((d) => d.idHerramienta === herramienta.idHerramienta);
        const marca = detalle ? cache.marcas.find((m) => m.id === detalle.idMarca) : null;
        const estado = detalle ? cache.estados.find((e) => e.id === detalle.idEstadoHerramienta) : null;
        const relCategoria = cache.relCategorias.find((r) => r.idHerramienta === herramienta.idHerramienta);
        const categoria = relCategoria ? cache.categorias.find((c) => c.id === relCategoria.idCategoria) : null;
        const area = herramienta.idArea ? cache.areas.find((a) => a.id === herramienta.idArea) : null;

        return {
            idHerramienta: herramienta.idHerramienta,
            idDetalle: detalle ? detalle.idDetalle : null,
            codInv: detalle ? detalle.codInv : "-",
            nombre: herramienta.nombreHerramienta,
            stock: herramienta.stock,
            idArea: herramienta.idArea || "",
            nombreArea: area ? area.nombreArea : "Sin asignar",
            idMarca: detalle ? detalle.idMarca : "",
            nombreMarca: marca ? marca.nombreMarca : "Sin marca",
            idCategoria: categoria ? categoria.id : "",
            nombreCategoria: categoria ? categoria.nombreCategoria : "Sin categoría",
            idEstadoHerramienta: detalle ? detalle.idEstadoHerramienta : "",
            nombreEstado: estado ? estado.nombreEstadoHerramienta : "DESCONOCIDO",
        };
    });
}

function filasFiltradas() {
    let filas = construirFilas();

    if (filtroActual !== "todo") {
        const mapa = { disponible: "DISPONIBLE", prestado: "EN PRESTAMO", daniado: "DAÑADO" };
        filas = filas.filter((fila) => fila.nombreEstado === mapa[filtroActual]);
    }

    if (terminoBusqueda.trim()) {
        const texto = terminoBusqueda.trim().toLowerCase();
        filas = filas.filter((fila) => fila.codInv.toLowerCase().includes(texto) || fila.nombre.toLowerCase().includes(texto));
    }

    return filas;
}

function pintarTabla() {
    const tbody = document.getElementById("inventoryTableBody");
    if (!tbody) return;

    const filas = filasFiltradas();
    const puedeGestionarAqui = puedeGestionarInventario();
    const totalColumnas = puedeGestionarAqui ? 8 : 7;

    if (filas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${totalColumnas}" class="text-center atenuado">No se encontraron herramientas.</td></tr>`;
        return;
    }

    tbody.innerHTML = filas.map((fila) => `
        <tr>
            <td class="etiqueta-codigo">${fila.codInv}</td>
            <td class="nombre-elemento"><span class="icono-elemento"><i class="bi bi-tools"></i></span>${fila.nombre}</td>
            <td>${fila.nombreMarca}</td>
            <td>${fila.nombreCategoria}</td>
            <td>${fila.stock}</td>
            <td>${fila.nombreArea}</td>
            <td><span class="estado ${claseEstado(fila.nombreEstado)}">${fila.nombreEstado}</span></td>
            ${puedeGestionarAqui ? `
            <td>
                <div class="acciones-fila">
                    <button type="button" title="Editar" data-bs-toggle="modal" data-bs-target="#itemEditModal"
                        data-id="${fila.idHerramienta}" data-detalle="${fila.idDetalle}" data-cod="${fila.codInv}"
                        data-nombre="${fila.nombre}" data-stock="${fila.stock}" data-idarea="${fila.idArea}"
                        data-idmarca="${fila.idMarca}" data-idcategoria="${fila.idCategoria}" data-idestado="${fila.idEstadoHerramienta}">
                        <img src="../img/icons8-pencil-24.png" alt="Editar" class="icono-fila">
                    </button>
                    <button type="button" class="danger" title="Eliminar" data-eliminar="${fila.idHerramienta}" data-detalle-eliminar="${fila.idDetalle}">
                        <img src="../img/icons8-trash-24.png" alt="Eliminar" class="icono-fila">
                    </button>
                </div>
            </td>` : ""}
        </tr>
    `).join("");
}

function poblarSelect(select, lista, campoNombre, valorSeleccionado) {
    if (!select) return;
    select.innerHTML = '<option value="" disabled' + (valorSeleccionado ? "" : " selected") + '>Selecciona una opción</option>' +
        lista.map((item) => `<option value="${item.id}" ${String(item.id) === String(valorSeleccionado) ? "selected" : ""}>${item[campoNombre]}</option>`).join("");
}

async function resolverTipoArea(nombre) {
    const nombreNormalizado = (nombre || "").trim();
    if (!nombreNormalizado) return null;

    const existente = cache.tiposArea.find((t) => t.nombreTipoArea.toLowerCase() === nombreNormalizado.toLowerCase());
    if (existente) return existente.id;

    const creado = await agregarTipoArea({ nombreTipoArea: nombreNormalizado });
    cache.tiposArea.push(creado);
    return creado.id;
}


function poblarSelectConAgregar(select, lista, campoNombre, valorSeleccionado, etiquetaAgregar) {
    if (!select) return;
    const opciones = lista.map((item) =>
        `<option value="${item.id}" ${String(item.id) === String(valorSeleccionado) ? "selected" : ""}>${item[campoNombre]}</option>`
    ).join("");
    select.innerHTML = '<option value="" disabled' + (valorSeleccionado ? "" : " selected") + '>Selecciona una opción</option>' +
        opciones +
        `<option value="__nuevo__">+ ${etiquetaAgregar}</option>`;
}

async function manejarAgregarNuevaOpcion(config) {
    const { value: nombre } = await Swal.fire({
        title: config.titulo,
        input: "text",
        inputPlaceholder: config.placeholder,
        showCancelButton: true,
        confirmButtonText: "Agregar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#001f3d",
        inputValidator: (value) => {
            const texto = (value || "").trim();
            if (!texto) return "Escribe un nombre.";
            if (!patronTexto.test(texto)) return "Ese nombre tiene símbolos no permitidos.";
            return null;
        },
    });

    if (!nombre) return null;

    try {
        return await config.crear(nombre.trim());
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: "error", title: "No se pudo agregar", text: "Ocurrió un error al conectar con el servidor.", confirmButtonColor: "#dc3545" });
        return null;
    }
}

function conectarSelectConAgregar(select, config) {
    if (!select) return;
    select.addEventListener("change", async () => {
        if (select.value !== "__nuevo__") return;

        const creado = await manejarAgregarNuevaOpcion(config);
        poblarSelectConAgregar(select, config.obtenerLista(), config.campoNombre, creado ? creado.id : "", config.etiquetaAgregar);
    });
}

function areasFiltradas() {
    if (!terminoBusquedaAreas.trim()) return cache.areas;
    const texto = terminoBusquedaAreas.trim().toLowerCase();
    return cache.areas.filter((area) => area.nombreArea.toLowerCase().includes(texto));
}

function pintarTablaAreas() {
    const tbody = document.getElementById("areasTableBody");
    if (!tbody) return;

    const areas = areasFiltradas();
    const puedeGestionarAqui = puedeGestionarInventario();
    const totalColumnas = puedeGestionarAqui ? 4 : 3;

    if (areas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${totalColumnas}" class="text-center atenuado">No se encontraron áreas.</td></tr>`;
        return;
    }

    tbody.innerHTML = areas.map((area) => {
        const tipo = cache.tiposArea.find((t) => t.id === area.tipoArea);
        const cantidadAsignadas = cache.herramientas.filter((h) => h.idArea === area.id).length;

        return `
        <tr>
            <td class="nombre-elemento"><span class="icono-elemento"><i class="bi bi-geo-alt"></i></span>${area.nombreArea}</td>
            <td>${tipo ? tipo.nombreTipoArea : "-"}</td>
            <td>${cantidadAsignadas}</td>
            ${puedeGestionarAqui ? `
            <td>
                <div class="acciones-fila">
                    <button type="button" title="Editar" data-bs-toggle="modal" data-bs-target="#areaEditModal"
                        data-id="${area.id}" data-nombre="${area.nombreArea}" data-idtipo="${area.tipoArea}">
                        <img src="../img/icons8-pencil-24.png" alt="Editar" class="icono-fila">
                    </button>
                    <button type="button" class="danger" title="Eliminar" data-eliminar-area="${area.id}">
                        <img src="../img/icons8-trash-24.png" alt="Eliminar" class="icono-fila">
                    </button>
                </div>
            </td>` : ""}
        </tr>`;
    }).join("");
}

function initModalCrearArea() {
    const areaModal = document.getElementById("areaModal");
    const form = document.getElementById("areaForm");
    if (!areaModal || !form) return;

    areaModal.addEventListener("show.bs.modal", () => {
        form.reset();
        const lista = document.getElementById("areaTipoOptions");
        if (lista) lista.innerHTML = cache.tiposArea.map((t) => `<option value="${t.nombreTipoArea}"></option>`).join("");
    });

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const nombre = document.getElementById("areaName").value.trim();
        const tipoTexto = document.getElementById("areaTipo").value.trim();

        if (!nombre) {
            Swal.fire({ icon: "warning", title: "Datos incompletos", text: "Escribe el nombre del área." });
            return;
        }
        if (!patronTexto.test(nombre)) {
            Swal.fire({ icon: "warning", title: "Nombre inválido", text: "El nombre del área tiene símbolos no permitidos." });
            return;
        }
        if (!tipoTexto) {
            Swal.fire({ icon: "warning", title: "Datos incompletos", text: "Escribe el tipo de área." });
            return;
        }
        if (cache.areas.some((a) => a.nombreArea.toLowerCase() === nombre.toLowerCase())) {
            Swal.fire({ icon: "warning", title: "Área existente", text: "Ya existe un área con ese nombre." });
            return;
        }

        try {
            const idTipoArea = await resolverTipoArea(tipoTexto);
            const nuevaArea = await agregarArea({ nombreArea: nombre, tipoArea: idTipoArea });
            cache.areas.push(nuevaArea);

            bootstrap.Modal.getOrCreateInstance(areaModal).hide();
            Swal.fire({ icon: "success", title: "¡Área guardada!", confirmButtonColor: "#28a745" });
            pintarTablaAreas();
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "No se pudo guardar el área", text: "Ocurrió un error al conectar con el servidor.", confirmButtonColor: "#dc3545" });
        }
    });
}

function initModalEditarArea() {
    const editModal = document.getElementById("areaEditModal");
    const form = document.getElementById("areaEditForm");
    if (!editModal || !form) return;

    editModal.addEventListener("show.bs.modal", (evento) => {
        const boton = evento.relatedTarget;
        if (!boton) return;

        const lista = document.getElementById("editAreaTipoOptions");
        if (lista) lista.innerHTML = cache.tiposArea.map((t) => `<option value="${t.nombreTipoArea}"></option>`).join("");

        document.getElementById("editAreaId").value = boton.dataset.id;
        document.getElementById("editAreaName").value = boton.dataset.nombre;

        const tipo = cache.tiposArea.find((t) => String(t.id) === boton.dataset.idtipo);
        document.getElementById("editAreaTipo").value = tipo ? tipo.nombreTipoArea : "";
    });

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const id = Number(document.getElementById("editAreaId").value);
        const nombre = document.getElementById("editAreaName").value.trim();
        const tipoTexto = document.getElementById("editAreaTipo").value.trim();

        if (!nombre || !tipoTexto) {
            Swal.fire({ icon: "warning", title: "Datos incompletos", text: "Revisa el nombre y el tipo de área." });
            return;
        }
        if (!patronTexto.test(nombre)) {
            Swal.fire({ icon: "warning", title: "Nombre inválido", text: "El nombre del área tiene símbolos no permitidos." });
            return;
        }
        if (cache.areas.some((a) => a.id !== id && a.nombreArea.toLowerCase() === nombre.toLowerCase())) {
            Swal.fire({ icon: "warning", title: "Área existente", text: "Ya existe un área con ese nombre." });
            return;
        }

        try {
            const idTipoArea = await resolverTipoArea(tipoTexto);
            const actualizada = await actualizarArea(id, { nombreArea: nombre, tipoArea: idTipoArea });

            const indice = cache.areas.findIndex((a) => a.id === id);
            if (indice !== -1) cache.areas[indice] = actualizada;

            bootstrap.Modal.getOrCreateInstance(editModal).hide();
            Swal.fire({ icon: "success", title: "¡Cambios guardados!", confirmButtonColor: "#28a745" });
            pintarTablaAreas();
            pintarTabla();
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "No se pudo actualizar el área", text: "Ocurrió un error al conectar con el servidor.", confirmButtonColor: "#dc3545" });
        }
    });
}

function initAccionesTablaAreas() {
    const tbody = document.getElementById("areasTableBody");
    if (!tbody) return;

    tbody.addEventListener("click", async (evento) => {
        const boton = evento.target.closest("[data-eliminar-area]");
        if (!boton) return;

        const id = Number(boton.dataset.eliminarArea);

        if (cache.herramientas.some((h) => h.idArea === id)) {
            Swal.fire({ icon: "warning", title: "No se puede eliminar", text: "Hay herramientas asignadas a esta área. Reasígnalas antes de eliminarla." });
            return;
        }

        const confirmacion = await Swal.fire({
            icon: "warning",
            title: "¿Eliminar área?",
            text: "Esta acción no se puede deshacer.",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            confirmButtonColor: "#dc3545",
            cancelButtonText: "Cancelar",
        });

        if (!confirmacion.isConfirmed) return;

        try {
            await eliminarArea(id);
            cache.areas = cache.areas.filter((a) => a.id !== id);
            Swal.fire({ icon: "success", title: "Área eliminada", confirmButtonColor: "#28a745" });
            pintarTablaAreas();
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "No se pudo eliminar el área", text: "Ocurrió un error al conectar con el servidor.", confirmButtonColor: "#dc3545" });
        }
    });
}

function initBusquedaAreas() {
    const buscador = document.getElementById("areasSearch");
    if (!buscador) return;
    buscador.addEventListener("input", () => {
        terminoBusquedaAreas = buscador.value;
        pintarTablaAreas();
    });
}

function initModalCrear() {
    const itemModal = document.getElementById("itemModal");
    const form = document.getElementById("itemForm");
    if (!itemModal || !form) return;

    const selectCategoria = document.getElementById("itemCategory");
    const selectMarca = document.getElementById("itemBrand");
    const selectUbicacion = document.getElementById("itemLocation");

    conectarSelectConAgregar(selectCategoria, {
        titulo: "Nueva categoría",
        placeholder: "Nombre de la categoría",
        obtenerLista: () => cache.categorias,
        campoNombre: "nombreCategoria",
        etiquetaAgregar: "Agregar nueva categoría",
        crear: async (nombre) => {
            const creada = await agregarCategoria({ nombreCategoria: nombre });
            cache.categorias.push(creada);
            return creada;
        },
    });

    conectarSelectConAgregar(selectMarca, {
        titulo: "Nueva marca",
        placeholder: "Nombre de la marca",
        obtenerLista: () => cache.marcas,
        campoNombre: "nombreMarca",
        etiquetaAgregar: "Agregar nueva marca",
        crear: async (nombre) => {
            const creada = await agregarMarca({ nombreMarca: nombre });
            cache.marcas.push(creada);
            return creada;
        },
    });

    conectarSelectConAgregar(selectUbicacion, {
        titulo: "Nueva ubicación",
        placeholder: "Nombre de la ubicación",
        obtenerLista: () => cache.areas,
        campoNombre: "nombreArea",
        etiquetaAgregar: "Agregar nueva ubicación",
        crear: async (nombre) => {
            if (cache.tiposArea.length === 0) {
                throw new Error("No hay tipos de área configurados en el sistema.");
            }
            const creada = await agregarArea({ nombreArea: nombre, tipoArea: cache.tiposArea[0].id });
            cache.areas.push(creada);
            return creada;
        },
    });

    itemModal.addEventListener("show.bs.modal", () => {
        form.reset();
        poblarSelectConAgregar(selectCategoria, cache.categorias, "nombreCategoria", "", "Agregar nueva categoría");
        poblarSelectConAgregar(selectMarca, cache.marcas, "nombreMarca", "", "Agregar nueva marca");
        poblarSelectConAgregar(selectUbicacion, cache.areas, "nombreArea", "", "Agregar nueva ubicación");
    });

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const codigo = document.getElementById("itemCode").value.trim();
        const idCategoria = selectCategoria.value;
        const nombre = document.getElementById("itemName").value.trim();
        const idMarca = selectMarca.value;
        const stock = Number(document.getElementById("itemStock").value);
        const idArea = selectUbicacion.value;

        if (!codigo || !patronCodigo.test(codigo)) {
            Swal.fire({ icon: "warning", title: "Código inválido", text: "El código solo admite letras, números y guiones." });
            return;
        }
        if (!nombre) {
            Swal.fire({ icon: "warning", title: "Datos incompletos", text: "Escribe el nombre de la herramienta." });
            return;
        }
        if (!patronTexto.test(nombre)) {
            Swal.fire({ icon: "warning", title: "Nombre inválido", text: "El nombre de la herramienta tiene símbolos no permitidos." });
            return;
        }
        if (!idMarca || idMarca === "__nuevo__") {
            Swal.fire({ icon: "warning", title: "Datos incompletos", text: "Selecciona una marca." });
            return;
        }
        if (!stock || stock < 1) {
            Swal.fire({ icon: "warning", title: "Stock inválido", text: "El stock debe ser al menos 1." });
            return;
        }

        const estadoDisponible = cache.estados.find((e) => e.nombreEstadoHerramienta === "DISPONIBLE");
        if (!estadoDisponible) {
            Swal.fire({ icon: "error", title: "No se pudo guardar", text: "No se encontró el estado DISPONIBLE." });
            return;
        }

        try {
            const nuevaHerramienta = await agregarHerramienta({
                nombreHerramienta: nombre,
                descripcionHerramienta: "",
                stock: stock,
                idArea: idArea ? Number(idArea) : null,
            });

            await agregarDetalleHerramienta({
                idHerramienta: nuevaHerramienta.idHerramienta,
                idMarca: Number(idMarca),
                idEstadoHerramienta: estadoDisponible.id,
                codInv: codigo,
            });

            if (idCategoria && idCategoria !== "__nuevo__") {
                await agregarHerramientaCategoria({
                    idCategoria: Number(idCategoria),
                    idHerramienta: nuevaHerramienta.idHerramienta,
                });
            }

            bootstrap.Modal.getOrCreateInstance(itemModal).hide();
            Swal.fire({ icon: "success", title: "¡Herramienta guardada!", confirmButtonColor: "#28a745" });
            await recargarVista();
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "No se pudo guardar la herramienta", text: "Ocurrió un error al conectar con el servidor.", confirmButtonColor: "#dc3545" });
        }
    });
}

function initModalEditar() {
    const editModal = document.getElementById("itemEditModal");
    const form = document.getElementById("itemEditForm");
    if (!editModal || !form) return;

    const selectUbicacion = document.getElementById("editItemLocation");

    conectarSelectConAgregar(selectUbicacion, {
        titulo: "Nueva ubicación",
        placeholder: "Nombre de la ubicación",
        obtenerLista: () => cache.areas,
        campoNombre: "nombreArea",
        etiquetaAgregar: "Agregar nueva ubicación",
        crear: async (nombre) => {
            if (cache.tiposArea.length === 0) {
                throw new Error("No hay tipos de área configurados en el sistema.");
            }
            const creada = await agregarArea({ nombreArea: nombre, tipoArea: cache.tiposArea[0].id });
            cache.areas.push(creada);
            return creada;
        },
    });

    editModal.addEventListener("show.bs.modal", (evento) => {
        const boton = evento.relatedTarget;
        if (!boton) return;

        poblarSelect(document.getElementById("editItemCategory"), cache.categorias, "nombreCategoria", boton.dataset.idcategoria);
        poblarSelect(document.getElementById("editItemBrand"), cache.marcas, "nombreMarca", boton.dataset.idmarca);
        poblarSelectConAgregar(selectUbicacion, cache.areas, "nombreArea", boton.dataset.idarea, "Agregar nueva ubicación");

        document.getElementById("editItemId").value = boton.dataset.id;
        document.getElementById("editItemCode").value = boton.dataset.cod;
        document.getElementById("editItemName").value = boton.dataset.nombre;
        document.getElementById("editItemStock").value = boton.dataset.stock;

        const estado = cache.estados.find((e) => String(e.id) === boton.dataset.idestado);
        const estadoSelect = document.getElementById("editItemStatus");
        if (estado) {
            const mapa = { DISPONIBLE: "Disponible", "EN PRESTAMO": "Prestado", "DAÑADO": "Daniado" };
            estadoSelect.value = mapa[estado.nombreEstadoHerramienta] || "Disponible";
        }
    });

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const idHerramienta = Number(document.getElementById("editItemId").value);
        const detalle = cache.detalles.find((d) => d.idHerramienta === idHerramienta);
        const codigo = document.getElementById("editItemCode").value.trim();
        const nombre = document.getElementById("editItemName").value.trim();
        const marcaId = document.getElementById("editItemBrand").value;
        const categoriaId = document.getElementById("editItemCategory").value;
        const stock = Number(document.getElementById("editItemStock").value);
        const idArea = selectUbicacion.value;
        const estadoTexto = document.getElementById("editItemStatus").value;

        if (!codigo || !patronCodigo.test(codigo)) {
            Swal.fire({ icon: "warning", title: "Código inválido", text: "El código solo admite letras, números y guiones." });
            return;
        }
        if (!nombre || !stock || stock < 1) {
            Swal.fire({ icon: "warning", title: "Datos incompletos", text: "Revisa el nombre y el stock." });
            return;
        }
        if (!patronTexto.test(nombre)) {
            Swal.fire({ icon: "warning", title: "Nombre inválido", text: "El nombre de la herramienta tiene símbolos no permitidos." });
            return;
        }
        if (!idArea || idArea === "__nuevo__") {
            Swal.fire({ icon: "warning", title: "Datos incompletos", text: "Selecciona una ubicación." });
            return;
        }

        const mapaInverso = { Disponible: "DISPONIBLE", Prestado: "EN PRESTAMO", Daniado: "DAÑADO" };
        const nuevoEstado = cache.estados.find((e) => e.nombreEstadoHerramienta === mapaInverso[estadoTexto]);

        try {
            await actualizarHerramienta(idHerramienta, {
                idHerramienta: idHerramienta,
                nombreHerramienta: nombre,
                descripcionHerramienta: "",
                stock: stock,
                idArea: Number(idArea),
            });

            if (detalle) {
                await actualizarDetalleHerramienta(detalle.idDetalle, {
                    idHerramienta: idHerramienta,
                    idMarca: Number(marcaId),
                    idEstadoHerramienta: nuevoEstado ? nuevoEstado.id : detalle.idEstadoHerramienta,
                    codInv: codigo,
                });
            }

            if (categoriaId) {
                const relActual = cache.relCategorias.find((r) => r.idHerramienta === idHerramienta);
                if (!relActual || String(relActual.idCategoria) !== String(categoriaId)) {
                    if (relActual) await eliminarHerramientaCategoria(relActual.idCategoria, idHerramienta).catch(() => {});
                    await agregarHerramientaCategoria({ idCategoria: Number(categoriaId), idHerramienta: idHerramienta });
                }
            }

            bootstrap.Modal.getOrCreateInstance(editModal).hide();
            Swal.fire({ icon: "success", title: "¡Cambios guardados!", confirmButtonColor: "#28a745" });
            await recargarVista();
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "No se pudo actualizar la herramienta", text: "Ocurrió un error al conectar con el servidor.", confirmButtonColor: "#dc3545" });
        }
    });
}

function initModales() {
    if (modalesListos) return;
    modalesListos = true;
    initModalCrear();
    initModalEditar();
    initModalCrearArea();
    initModalEditarArea();
}

function initAccionesTabla() {
    const tbody = document.getElementById("inventoryTableBody");
    if (!tbody) return;

    tbody.addEventListener("click", async (evento) => {
        const botonEliminar = evento.target.closest("[data-eliminar]");
        if (!botonEliminar) return;

        const idHerramienta = Number(botonEliminar.dataset.eliminar);
        const idDetalle = botonEliminar.dataset.detalleEliminar;

        const confirmacion = await Swal.fire({
            icon: "warning",
            title: "¿Eliminar herramienta?",
            text: "Esta acción no se puede deshacer.",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            confirmButtonColor: "#dc3545",
            cancelButtonText: "Cancelar",
        });

        if (!confirmacion.isConfirmed) return;

        try {
            const relCategoria = cache.relCategorias.find((r) => r.idHerramienta === idHerramienta);
            if (relCategoria) {
                await eliminarHerramientaCategoria(relCategoria.idCategoria, idHerramienta).catch(() => {});
            }
            if (idDetalle && idDetalle !== "null") {
                await eliminarDetalleHerramienta(idDetalle).catch(() => {});
            }
            await eliminarHerramienta(idHerramienta);
            Swal.fire({ icon: "success", title: "Herramienta eliminada", confirmButtonColor: "#28a745" });
            await recargarVista();
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: "error", title: "No se pudo eliminar", text: "Ocurrió un error al conectar con el servidor.", confirmButtonColor: "#dc3545" });
        }
    });
}

function initFiltrosYBusqueda() {
    document.querySelectorAll('#viewRoot [data-filter]').forEach((boton) => {
        boton.addEventListener("click", () => {
            filtroActual = boton.dataset.filter;
            const toggle = boton.closest(".dropdown")?.querySelector(".dropdown-toggle");
            if (toggle) toggle.innerHTML = `<i class="bi bi-funnel"></i> ${boton.textContent}`;
            pintarTabla();
        });
    });

    const buscador = document.getElementById("inventorySearch");
    if (buscador) {
        buscador.addEventListener("input", () => {
            terminoBusqueda = buscador.value;
            pintarTabla();
        });
    }
}

async function recargarVista() {
    try {
        await cargarCatalogos();
        pintarTabla();
        pintarTablaAreas();
    } catch (error) {
        console.error(error);
    }
}

async function renderInventoryView() {
    const tbody = document.getElementById("inventoryTableBody");
    if (!tbody) return;

    filtroActual = "todo";
    terminoBusqueda = "";
    terminoBusquedaAreas = "";

    try {
        await cargarCatalogos();
        pintarTabla();
        pintarTablaAreas();
        initFiltrosYBusqueda();
        initAccionesTabla();
        initAccionesTablaAreas();
        initBusquedaAreas();
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">No se pudo cargar el inventario. Revisa tu conexión con el servidor.</td></tr>';
        Swal.fire({ icon: "error", title: "No se pudo cargar el inventario", text: "Revisa tu conexión con el servidor." });
    }
}

export function initInventoryController() {
    initModales();

    document.addEventListener("view:loaded", (evento) => {
        if (evento.detail.view === "inventory") {
            renderInventoryView();
        }
    });
}
