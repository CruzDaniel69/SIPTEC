const API_URL = "https://siptec-1744e9407a56.herokuapp.com/api/inventario";

async function pedir(ruta, mensajeError) {
    const response = await fetch(`${API_URL}${ruta}`, { credentials: "include" });

    if (!response.ok) {
        throw new Error(mensajeError + " (" + response.status + ")");
    }

    const resultado = await response.json();
    return resultado.data;
}

export async function obtenerPiezasPagina({ page = 0, size = 10, q = "", estado = "" } = {}) {
    const parametros = new URLSearchParams({ page, size, q, estado });
    return pedir(`/piezas?${parametros}`, "Error al obtener las piezas del inventario");
}

export async function obtenerPiezaPorCodigo(codigo) {
    return pedir(`/piezas/codigo/${encodeURIComponent(codigo)}`, "Error al buscar el equipo");
}

/** Piezas libres de todas las herramientas ubicadas en un área. */
export async function obtenerPiezasDisponiblesDeArea(idArea) {
    return pedir(`/disponibles-area/${idArea}`, "Error al obtener las piezas del área");
}

export async function obtenerPiezasDisponibles(idHerramienta) {
    return pedir(`/disponibles/${idHerramienta}`, "Error al obtener las piezas disponibles");
}

export async function obtenerCodigosExistentes(codigos) {
    if (!codigos || codigos.length === 0) return [];
    const parametros = new URLSearchParams({ codigos: codigos.join(",") });
    return pedir(`/codigos-existentes?${parametros}`, "Error al verificar los códigos");
}

export async function obtenerPrefijosEnUso() {
    return pedir("/prefijos", "Error al obtener los prefijos");
}

export async function buscarHerramientas(texto, limite = 10) {
    const parametros = new URLSearchParams({ q: texto || "", limite });
    return pedir(`/herramientas?${parametros}`, "Error al buscar herramientas");
}

export async function obtenerHerramientasPorArea() {
    return pedir("/areas-conteo", "Error al obtener el conteo por área");
}

async function descargarArchivo(ruta, nombreArchivo, mensajeError) {
    const response = await fetch(`${API_URL}${ruta}`, { credentials: "include" });

    if (!response.ok) {
        throw new Error(mensajeError + " (" + response.status + ")");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
}

/** Baja el inventario completo (o el que coincide con la búsqueda y el estado) como archivo CSV. */
export async function exportarInventarioCsv({ q = "", estado = "", nombreArchivo }) {
    const parametros = new URLSearchParams({ q, estado });
    await descargarArchivo(`/exportar?${parametros}`, nombreArchivo, "Error al exportar el inventario");
}

export async function descargarPlantillaInventarioCsv() {
    await descargarArchivo("/plantilla", "Plantilla de inventario.csv", "Error al descargar la plantilla");
}

/**
 * Envía el contenido del CSV a la API. Con soloValidar = true solo revisa el archivo y devuelve
 * cuántas filas son correctas y cuáles tienen error, sin guardar nada.
 */
export async function importarInventarioCsv(contenido, soloValidar) {
    const response = await fetch(`${API_URL}/importar?soloValidar=${soloValidar}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido }),
    });

    const resultado = await response.json().catch(() => null);

    if (!response.ok) {
        // La API explica el problema del archivo (columnas que faltan, demasiadas filas…)
        throw new Error((resultado && resultado.message) || "Error al importar el inventario (" + response.status + ")");
    }

    return resultado.data;
}
