const API_URL = "https://siptec-1744e9407a56.herokuapp.com/api/herramientas";

export async function obtenerHerramientas() {
    try {
        const response = await fetch(API_URL, { credentials: "include" });

        if (!response.ok) {
            throw new Error("Error al obtener las herramientas");
        }

        const resultado = await response.json();

        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener las herramientas: " + error);
        throw error;
    }
}

export async function obtenerHerramientaPorId(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, { credentials: "include" });

        if (!response.ok) {
            throw new Error("Error al obtener la herramienta con ID: " + id);
        }

        const resultado = await response.json();

        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener la herramienta por ID: " + error);
        throw error;
    }
}

export async function agregarHerramienta(herramienta) {
    try {
        const response = await fetch(API_URL, {
            credentials: "include",
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(herramienta)
        });

        if (!response.ok) {
            throw new Error("Error al agregar el registro: " + response.status);
        }
        const resultado = await response.json();
        return resultado.data;
    }
    catch (error) {
        console.error("Error al agregar el registro: " + error);
        throw error;
    }
}

export async function actualizarHerramienta(id, herramienta) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            credentials: "include",
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(herramienta)
        });

        if (!response.ok) {
            throw new Error("Error al actualizar el registro: " + response.status);
        }
        const resultado = await response.json();
        return resultado.data;
    }
    catch (error) {
        console.error("Error al actualizar el registro: " + error);
        throw error;
    }
}

export async function eliminarHerramienta(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            credentials: "include",
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Error al eliminar el registro: " + response.status);
        }
        return true;
    }
    catch (error) {
        console.error("Error al eliminar el registro: " + error);
        throw error;
    }
}

async function leerRespuesta(response, mensajeError) {
    const resultado = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error((resultado && resultado.message) || mensajeError + " (" + response.status + ")");
    }
    return resultado.data;
}

/** Sube o reemplaza la foto de una herramienta (el archivo viaja como multipart, sin Content-Type manual). */
export async function subirImagenHerramienta(id, archivo) {
    const datos = new FormData();
    datos.append("imagen", archivo);

    const response = await fetch(`${API_URL}/${id}/imagen`, { credentials: "include", method: "POST", body: datos });
    return leerRespuesta(response, "Error al subir la foto");
}

export async function quitarImagenHerramienta(id) {
    const response = await fetch(`${API_URL}/${id}/imagen`, { credentials: "include", method: "DELETE" });
    return leerRespuesta(response, "Error al quitar la foto");
}
