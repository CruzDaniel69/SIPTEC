const API_URL = "http://localhost:8080/api/detalle-herramienta";

export async function obtenerDetallesHerramienta() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Error al obtener los detalles de herramienta");
        }

        const detalles = await response.json();

        return detalles;
    }
    catch (error) {
        console.error("Error al obtener los detalles de herramienta: " + error);
        throw error;
    }
}

export async function obtenerDetalleHerramientaPorId(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);

        if (!response.ok) {
            throw new Error("Error al obtener el detalle de herramienta con ID: " + id);
        }

        const detalle = await response.json();

        return detalle;
    }
    catch (error) {
        console.error("Error al obtener el detalle de herramienta por ID: " + error);
        throw error;
    }
}

export async function obtenerDetallesHerramientaPorEstado(idEstado) {
    try {
        const response = await fetch(`${API_URL}/estado/${idEstado}`);

        if (!response.ok) {
            throw new Error("Error al obtener los detalles de herramienta con el estado: " + idEstado);
        }

        const resultado = await response.json();

        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener los detalles de herramienta por estado: " + error);
        throw error;
    }
}

export async function agregarDetalleHerramienta(detalle) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(detalle)
        });

        if (!response.ok) {
            throw new Error("Error al agregar el registro: " + response.status);
        }
        const nuevoDetalle = await response.json();
        return nuevoDetalle;
    }
    catch (error) {
        console.error("Error al agregar el registro: " + error);
        throw error;
    }
}

export async function actualizarDetalleHerramienta(id, detalle) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(detalle)
        });

        if (!response.ok) {
            throw new Error("Error al actualizar el registro: " + response.status);
        }
        const detalleActualizado = await response.json();
        return detalleActualizado;
    }
    catch (error) {
        console.error("Error al actualizar el registro: " + error);
        throw error;
    }
}

export async function eliminarDetalleHerramienta(id) {
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
