const API_URL = "http://localhost:8080/api/categoria";

export async function obtenerCategorias() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Error al obtener las categorias");
        }

        const resultado = await response.json();

        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener las categorias: " + error);
        throw error;
    }
}

export async function agregarCategoria(categoria) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(categoria)
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

export async function actualizarCategoria(id, categoria) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(categoria)
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

export async function eliminarCategoria(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
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
