import { exportarInventarioCsv, descargarPlantillaInventarioCsv, importarInventarioCsv } from "../services/inventarioService.js";
import { aValorInput } from "../utils/fechas.js";

const MAX_BYTES = 1024 * 1024;
const MAX_ERRORES_VISIBLES = 50;
const ETIQUETA_POR_FILTRO = { todo: "", disponible: "disponible", prestado: "en préstamo", daniado: "dañado" };

let modalListo = false;
let alImportar = () => {};

function fechaParaArchivo() {
    return aValorInput(new Date()).slice(0, 10);
}

/** El CSV de Excel puede venir en UTF-8 o en ANSI (Windows-1252, el "CSV" de Excel antiguo): se prueban ambos. */
async function leerComoTexto(archivo) {
    const buffer = await archivo.arrayBuffer();
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch (error) {
        return new TextDecoder("windows-1252").decode(buffer);
    }
}

function mensajeError(error) {
    return error && error.message ? error.message : "No se pudo completar la operación.";
}

// ---------------------------------------------------------------- Exportar y plantilla

async function exportar(obtenerFiltro) {
    const { q, estado, filtro } = obtenerFiltro();
    const partes = ["Inventario", ETIQUETA_POR_FILTRO[filtro], q ? "búsqueda" : "", fechaParaArchivo()].filter(Boolean);

    try {
        await exportarInventarioCsv({ q, estado, nombreArchivo: partes.join(" - ") + ".csv" });
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: "error", title: "No se pudo exportar", text: "Revisa tu conexión con el servidor." });
    }
}

async function bajarPlantilla() {
    try {
        await descargarPlantillaInventarioCsv();
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: "error", title: "No se pudo descargar la plantilla", text: "Revisa tu conexión con el servidor." });
    }
}

// ---------------------------------------------------------------- Importar

function crear(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function pintarAviso(contenedor, clase, texto) {
    contenedor.replaceChildren(crear("div", `alert ${clase} mb-0`, texto));
}

/** Resumen de la revisión del archivo: cuántas filas están bien y la lista de las que tienen error. */
function pintarResultado(contenedor, resultado) {
    contenedor.replaceChildren();

    const errores = resultado.errores.length;
    const resumen = crear("p", "mb-2");
    resumen.append(
        `Se leyeron ${resultado.totalFilas} filas: `,
        crear("strong", "text-success", `${resultado.filasCorrectas} correctas`),
        ", ",
        crear("strong", errores > 0 ? "text-danger" : "", `${errores} con error`),
        ".",
    );
    contenedor.appendChild(resumen);

    if (errores === 0) {
        contenedor.appendChild(crear("p", "atenuado mb-0", "Todo está en orden. Presiona Importar para guardarlas."));
        return;
    }

    const tabla = crear("table", "mb-2");
    const encabezado = crear("tr");
    encabezado.append(crear("th", "", "Fila"), crear("th", "", "Problema"));
    tabla.appendChild(crear("thead")).appendChild(encabezado);

    const cuerpo = crear("tbody");
    resultado.errores.slice(0, MAX_ERRORES_VISIBLES).forEach((error) => {
        const fila = crear("tr");
        fila.append(crear("td", "", String(error.fila)), crear("td", "", error.mensaje));
        cuerpo.appendChild(fila);
    });
    tabla.appendChild(cuerpo);

    const contenedorTabla = crear("div", "");
    contenedorTabla.style.maxHeight = "260px";
    contenedorTabla.style.overflowY = "auto";
    contenedorTabla.appendChild(tabla);
    contenedor.appendChild(contenedorTabla);

    if (errores > MAX_ERRORES_VISIBLES) {
        contenedor.appendChild(crear("p", "atenuado mb-0", `…y ${errores - MAX_ERRORES_VISIBLES} errores más.`));
    }
    if (resultado.filasCorrectas > 0) {
        contenedor.appendChild(crear("p", "atenuado mt-2 mb-0", "Solo se guardarán las filas correctas; corrige las demás y vuelve a importarlas."));
    }
}

function textoImportar(resultado) {
    const n = resultado.filasCorrectas;
    return `Importar ${n} ${n === 1 ? "pieza" : "piezas"}`;
}

function initModalImportacion() {
    if (modalListo) return;

    const modal = document.getElementById("importCsvModal");
    const entrada = document.getElementById("csvArchivo");
    const resultadoCaja = document.getElementById("csvResultado");
    const confirmar = document.getElementById("csvConfirmar");
    if (!modal || !entrada || !resultadoCaja || !confirmar) return;
    modalListo = true;

    let contenido = "";

    function reiniciar() {
        entrada.value = "";
        resultadoCaja.replaceChildren();
        confirmar.disabled = true;
        confirmar.textContent = "Importar";
        contenido = "";
    }

    modal.addEventListener("show.bs.modal", reiniciar);

    entrada.addEventListener("change", async () => {
        const archivo = entrada.files[0];
        confirmar.disabled = true;
        confirmar.textContent = "Importar";
        if (!archivo) return;

        if (!archivo.name.toLowerCase().endsWith(".csv")) {
            pintarAviso(resultadoCaja, "alert-warning", "El archivo debe ser de tipo .csv.");
            return;
        }
        if (archivo.size > MAX_BYTES) {
            pintarAviso(resultadoCaja, "alert-warning", "El archivo es demasiado grande (máximo 1 MB).");
            return;
        }

        pintarAviso(resultadoCaja, "alert-info", "Revisando el archivo…");
        try {
            contenido = await leerComoTexto(archivo);
            const resultado = await importarInventarioCsv(contenido, true);
            pintarResultado(resultadoCaja, resultado);

            if (resultado.filasCorrectas > 0) {
                confirmar.textContent = textoImportar(resultado);
                confirmar.disabled = false;
            }
        } catch (error) {
            console.error(error);
            pintarAviso(resultadoCaja, "alert-danger", mensajeError(error));
        }
    });

    confirmar.addEventListener("click", async () => {
        confirmar.disabled = true;
        confirmar.textContent = "Importando…";

        try {
            const resultado = await importarInventarioCsv(contenido, false);
            bootstrap.Modal.getOrCreateInstance(modal).hide();

            const nuevos = resultado.equiposNuevos;
            const existentes = resultado.equiposExistentes;
            const detalle = [
                nuevos > 0 ? `${nuevos} ${nuevos === 1 ? "equipo nuevo" : "equipos nuevos"}` : "",
                existentes > 0 ? `${existentes} ${existentes === 1 ? "equipo existente" : "equipos existentes"}` : "",
            ].filter(Boolean).join(" y ");

            Swal.fire({
                icon: "success",
                title: "Importación terminada",
                text: `Se guardaron ${resultado.piezasCreadas} piezas (${detalle}).` +
                    (resultado.errores.length > 0 ? ` ${resultado.errores.length} filas con error no se guardaron.` : ""),
                confirmButtonColor: "#28a745",
            });
            await alImportar();
        } catch (error) {
            console.error(error);
            pintarAviso(resultadoCaja, "alert-danger", mensajeError(error));
            confirmar.textContent = "Importar";
        }
    });
}

function abrirImportacion() {
    const modal = document.getElementById("importCsvModal");
    if (modal) bootstrap.Modal.getOrCreateInstance(modal).show();
}

/**
 * Conecta los botones CSV de la cabecera de Inventario.
 * @param {() => {q: string, estado: string, filtro: string}} obtenerFiltro Búsqueda y filtro de estado actuales (para exportar lo que se ve).
 * @param {() => Promise<void>} despuesDeImportar Se llama al terminar para recargar la tabla.
 */
export function initInventarioCsv(obtenerFiltro, despuesDeImportar) {
    alImportar = despuesDeImportar;
    initModalImportacion();

    document.querySelectorAll("#viewRoot [data-csv]").forEach((boton) => {
        boton.addEventListener("click", () => {
            if (boton.dataset.csv === "exportar") exportar(obtenerFiltro);
            else if (boton.dataset.csv === "plantilla") bajarPlantilla();
            else if (boton.dataset.csv === "importar") abrirImportacion();
        });
    });
}
