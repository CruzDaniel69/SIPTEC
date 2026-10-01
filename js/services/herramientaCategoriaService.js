const API_URL = "https://siptec-1744e9407a56.herokuapp.com/api/herramientaCategoria";

export async function obtenerHerramientaCategorias() {
    try {
        const response = await fetch(API_URL, { credentials: "include" });

        if (!response.ok) {
            throw new Error("Error al obtener las relaciones herramienta-categoria");
        }

        const resultado = await response.json();
        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener las relaciones herramienta-categoria: " + error);
        throw error;
    }
}

export async function obtenerHerramientaCategoriaPorId(idCategoria, idHerramienta) {
    try {
        const response = await fetch(`${API_URL}/${idCategoria}/${idHerramienta}`, { credentials: "include" });

        if (!response.ok) {
            throw new Error("Error al obtener la relacion herramienta-categoria con ID: " + idCategoria + "-" + idHerramienta);
        }

        const resultado = await response.json();
        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener la relacion herramienta-categoria por ID: " + error);
        throw error;
    }
}

export async function agregarHerramientaCategoria(herramientaCategoria) {
    try {
        const response = await fetch(API_URL, {
            credentials: "include",
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(herramientaCategoria)
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

export async function eliminarHerramientaCategoria(idCategoria, idHerramienta) {
    try {
        const response = await fetch(`${API_URL}/${idCategoria}/${idHerramienta}`, {
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
