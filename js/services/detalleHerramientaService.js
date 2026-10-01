const API_URL = "https://siptec-1744e9407a56.herokuapp.com/api/detalle-herramienta";

export async function obtenerDetallesHerramienta() {
    try {
        const response = await fetch(API_URL, { credentials: "include" });

        if (!response.ok) {
            throw new Error("Error al obtener los detalles de herramienta");
        }

        const resultado = await response.json();

        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener los detalles de herramienta: " + error);
        throw error;
    }
}

export async function obtenerDetalleHerramientaPorId(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, { credentials: "include" });

        if (!response.ok) {
            throw new Error("Error al obtener el detalle de herramienta con ID: " + id);
        }

        const resultado = await response.json();

        return resultado.data;
    }
    catch (error) {
        console.error("Error al obtener el detalle de herramienta por ID: " + error);
        throw error;
    }
}

export async function obtenerDetallesHerramientaPorEstado(idEstado) {
    try {
        const response = await fetch(`${API_URL}/estado/${idEstado}`, { credentials: "include" });

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
            credentials: "include",
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(detalle)
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

export async function actualizarDetalleHerramienta(id, detalle) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            credentials: "include",
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(detalle)
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

export async function eliminarDetalleHerramienta(id) {
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
