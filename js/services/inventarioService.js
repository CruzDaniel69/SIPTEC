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
